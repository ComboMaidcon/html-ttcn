// Giữ nguyên từ files.zip của bạn — repo không có route này
const router = require('express').Router();
const { body, query: qv } = require('express-validator');
const { validate }    = require('../middleware/validate');
const { requireAuth, requireStaff } = require('../middleware/auth');
const supabase = require('../lib/supabase');

// GET /api/customers/stats — Lấy danh sách KH kèm thống kê
router.get('/stats', requireStaff, async (req, res) => {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*, bookings(status, start_time, end_time, invoices(total_amount))')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const stats = customers.map(c => {
      let total_hours = 0;
      let invoice_count = 0;
      let total_spent = 0;

      if (c.bookings) {
        c.bookings.forEach(b => {
          if (b.status === 'completed') {
            const start = new Date(`1970-01-01T${b.start_time}`);
            const end = new Date(`1970-01-01T${b.end_time}`);
            let diff = (end - start) / 3600000;
            if (diff < 0) diff += 24; // Qua đêm
            total_hours += diff;
          }
          if (b.invoices) {
            const invs = Array.isArray(b.invoices) ? b.invoices : [b.invoices];
            invs.forEach(inv => {
              invoice_count++;
              total_spent += inv.total_amount || 0;
            });
          }
        });
      }

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        source: c.source,
        note: c.note,
        created_at: c.created_at,
        total_hours,
        invoice_count,
        total_spent,
        is_vip: total_hours >= 20
      };
    });

    // Bỏ qua khách hàng có invoice_count === 0 để lọc trùng/bỏ trống
    const activeStats = stats.filter(c => c.invoice_count > 0);

    // Sắp xếp theo số lượng hoá đơn (nhiều nhất trước)
    activeStats.sort((a, b) => b.invoice_count - a.invoice_count);

    res.json({ customers: activeStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers — admin: tìm kiếm khách hàng
router.get('/', requireStaff, async (req, res) => {
  const { phone, name, page = 1, limit = 20 } = req.query;
  const from = (parseInt(page) - 1) * parseInt(limit);
  const to   = from + parseInt(limit) - 1;
  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (phone) query = query.ilike('phone', `%${phone}%`);
  if (name)  query = query.ilike('name',  `%${name}%`);
  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ customers: data, total: count, page: parseInt(page) });
});

// GET /api/customers/lookup?phone= — tìm nhanh theo SĐT
router.get('/lookup', requireStaff,
  qv('phone').matches(/^0\d{9}$/).withMessage('Số điện thoại không hợp lệ'),
  validate,
  async (req, res) => {
    const { data, error } = await supabase
      .from('customers').select('*').eq('phone', req.query.phone).single();
    if (error) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    res.json({ customer: data });
  }
);

// GET /api/customers/:id — admin: xem chi tiết kèm lịch sử booking
router.get('/:id', requireStaff, async (req, res) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*, bookings(id, booking_date, room_id, status, start_time, end_time)')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
  res.json({ customer: data });
});

// POST /api/customers — tạo thủ công (hoặc tự động từ booking)
router.post('/',
  body('name').trim().notEmpty().withMessage('Thiếu tên'),
  body('phone').matches(/^0\d{9}$/).withMessage('Số điện thoại phải 10 số, bắt đầu bằng 0'),
  body('source').optional().isIn(['call','walk-in','facebook','zalo','website']),
  validate,
  async (req, res) => {
    const { name, phone, source, note } = req.body;
    // Nếu đã tồn tại → trả về luôn
    const { data: existing } = await supabase
      .from('customers').select('*').eq('phone', phone.trim()).single();
    if (existing) return res.json({ customer: existing, existing: true });
    const { data, error } = await supabase
      .from('customers')
      .insert([{ name: name.trim(), phone: phone.trim(), source: source || 'website', note: note?.trim() || null }])
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ customer: data, existing: false });
  }
);

// PATCH /api/customers/:id — admin
router.patch('/:id', requireStaff,
  body('name').optional().trim().notEmpty(),
  body('phone').optional().matches(/^0\d{9}$/),
  body('source').optional().isIn(['call','walk-in','facebook','zalo','website']),
  validate,
  async (req, res) => {
    const allowed = ['name','phone','source','note'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'Không có trường hợp lệ để cập nhật' });
    const { data, error } = await supabase
      .from('customers').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ customer: data });
  }
);

module.exports = router;