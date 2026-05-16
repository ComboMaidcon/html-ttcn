const router   = require('express').Router();
const { body, query: qv } = require('express-validator');
const { validate }    = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const supabase        = require('../lib/supabase');

// ── GET /api/bookings?date=&roomId= — public (chỉ trả giờ, không trả tên/SĐT)
router.get('/', async (req, res) => {
  const { date, roomId, roomIds } = req.query;
  if (!date) return res.status(400).json({ error: 'Thiếu tham số date' });

  let query = supabase
    .from('bookings')
    .select('room_id, date, start_hour, end_hour, status')
    .eq('date', date)
    .not('status', 'eq', 'cancelled');

  if (roomId)  query = query.eq('room_id', roomId);
  if (roomIds) query = query.in('room_id', roomIds.split(','));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ bookings: data });
});

// ── GET /api/bookings/admin — admin: full data ──
router.get('/admin', requireAuth, async (req, res) => {
  const { date, status, page = 1, limit = 20 } = req.query;
  const from = (parseInt(page) - 1) * parseInt(limit);
  const to   = from + parseInt(limit) - 1;

  let query = supabase
    .from('bookings')
    .select('*, rooms(name, floor, type, emoji)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (date)   query = query.eq('date', date);
  if (status) query = query.eq('status', status);

  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ bookings: data, total: count, page: parseInt(page), limit: parseInt(limit) });
});

// ── POST /api/bookings — public ──
router.post('/',
  body('roomId').notEmpty().withMessage('Thiếu roomId'),
  body('date').isDate().withMessage('Ngày không hợp lệ'),
  body('startHour').isFloat({ min: 9, max: 25.5 }).withMessage('Giờ bắt đầu không hợp lệ'),
  body('endHour').isFloat({ min: 9.5, max: 26 }).withMessage('Giờ kết thúc không hợp lệ'),
  body('name').trim().notEmpty().withMessage('Thiếu tên'),
  body('phone').matches(/^\d{10}$/).withMessage('Số điện thoại phải đúng 10 chữ số'),
  body('people').isInt({ min: 1, max: 10 }).withMessage('Số người từ 1–10'),
  validate,
  async (req, res) => {
    const { roomId, date, startHour, endHour, name, phone, people, note } = req.body;

    if (endHour <= startHour)
      return res.status(400).json({ error: 'Giờ kết thúc phải sau giờ bắt đầu' });

    // Check phòng tồn tại
    const { data: room } = await supabase.from('rooms').select('id, type, name').eq('id', roomId).single();
    if (!room) return res.status(404).json({ error: 'Phòng không tồn tại' });

    // Check số người không vượt quá sức chứa phòng
    const maxPeople = {
      'small':          2,
      'medium-classic': 4,
      'medium-deluxe':  4,
      'cine':           2,
      'suite':          4,
    }[room.type] || 10;

    if (people > maxPeople) {
      return res.status(400).json({
      error: `Phòng ${room.type} chỉ chứa tối đa ${maxPeople} người`
      });
    }

    // Check trùng lịch
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .eq('date', date)
      .not('status', 'eq', 'cancelled')
      .lt('start_hour', endHour)
      .gt('end_hour', startHour);

    if (conflicts?.length > 0)
      return res.status(409).json({ error: 'Phòng đã có người đặt trong khung giờ này' });

    const { data, error } = await supabase.from('bookings').insert([{
      room_id:    roomId,
      date,
      start_hour: startHour,
      end_hour:   endHour,
      name:       name.trim(),
      phone:      phone.trim(),
      people:     parseInt(people),
      note:       note?.trim() || null,
      status:     'pending',
    }]).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ booking: data, message: 'Đặt phòng thành công! Chúng tôi sẽ xác nhận trong 15 phút.' });
  }
);

// ── PATCH /api/bookings/:id — admin: đổi status ──
router.patch('/:id', requireAuth,
  body('status').isIn(['pending','confirmed','cancelled','completed']).withMessage('Status không hợp lệ'),
  validate,
  async (req, res) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: req.body.status })
      .eq('id', req.params.id)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ booking: data });
  }
);

// ── DELETE /api/bookings/:id — admin only ──
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('bookings').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Đã xóa' });
});

module.exports = router;
