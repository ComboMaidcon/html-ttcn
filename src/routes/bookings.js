const router  = require('express').Router();
const { body, query: qv } = require('express-validator');
const { validate }    = require('../middleware/validate');
const { requireAuth, requireStaff } = require('../middleware/auth');
const supabase        = require('../lib/supabase');

// Helper chuyển đổi giờ
const timeToFloat = (t) => { const [h,m] = t.split(':'); return parseInt(h) + parseInt(m)/60; };
const floatToTime = (h) => {
  const hr  = Math.floor(h) % 24;
  const min = Math.round((h - Math.floor(h)) * 60);
  return `${hr.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}:00`;
};

// ── GET /api/bookings?date=&roomId= — public ──
router.get('/', async (req, res) => {
  const { date, roomId, roomIds } = req.query;
  if (!date) return res.status(400).json({ error: 'Thiếu tham số date' });
  let query = supabase
    .from('bookings')
    .select('room_id, booking_date, start_time, end_time, is_overnight, status')
    .eq('booking_date', date)
    .not('status', 'eq', 'cancelled');
  if (roomId)  query = query.eq('room_id', roomId);
  if (roomIds) query = query.in('room_id', roomIds.split(','));
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  // Map về float hours để frontend dùng được (khớp với js/api.js)
  const mapped = data.map(b => ({
    ...b,
    date:       b.booking_date,
    start_hour: timeToFloat(b.start_time),
    end_hour:   timeToFloat(b.end_time) + (b.is_overnight ? 24 : 0),
  }));
  res.json({ bookings: mapped });
});

// ── GET /api/bookings/admin — admin: full data có phân trang ──
router.get('/admin', requireStaff, async (req, res) => {
  const { date, status, customerId, page = 1, limit = 20 } = req.query;
  const from = (parseInt(page) - 1) * parseInt(limit);
  const to   = from + parseInt(limit) - 1;
  let query = supabase
    .from('bookings')
    .select('*, customers(id, name, phone, source), rooms(id, name, floor, type)', { count: 'exact' })
    .order('booking_date', { ascending: false })
    .order('start_time',   { ascending: false })
    .range(from, to);
  if (date)       query = query.eq('booking_date', date);
  if (status)     query = query.eq('status', status);
  if (customerId) query = query.eq('customer_id', customerId);
  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ bookings: data, total: count, page: parseInt(page), limit: parseInt(limit) });
});

// ── GET /api/bookings/:id — admin: chi tiết kèm orders + invoice ──
router.get('/:id', requireStaff, async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customers(id, name, phone, source, note),
      rooms(id, name, floor, type, capacity_min, capacity_max),
      orders(id, status, note, created_at,
        order_items(id, quantity, unit_price, variant, note, amount,
          menu_items(id, name, tab, category)
        )
      ),
      invoices(id, room_amount, food_amount, surcharge, discount,
               total_amount, payment_method, payment_status, deposit_amount)
    `)
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Không tìm thấy booking' });
  res.json({ booking: data });
});

// ── POST /api/bookings — public ──
router.post('/',
  body('roomId').notEmpty().withMessage('Thiếu roomId'),
  body('date').isISO8601().withMessage('Ngày không hợp lệ'),
  body('startHour').isFloat({ min: 9, max: 25.5 }).withMessage('Giờ bắt đầu không hợp lệ'),
  body('endHour').isFloat({ min: 9.5, max: 26 }).withMessage('Giờ kết thúc không hợp lệ'),
  body('name').trim().notEmpty().withMessage('Thiếu tên'),
  body('phone').matches(/^\d{10}$/).withMessage('Số điện thoại phải đúng 10 chữ số'),
  body('people').isInt({ min: 1, max: 10 }).withMessage('Số người từ 1–10'),
  body('channel').optional().isIn(['website','call','facebook','zalo','walk-in']),
  validate,
  async (req, res) => {
    const { roomId, date, startHour, endHour, name, phone, people, note, channel } = req.body;

    if (endHour <= startHour)
      return res.status(400).json({ error: 'Giờ kết thúc phải sau giờ bắt đầu' });

    // Kiểm tra phòng tồn tại + sức chứa từ DB
    const { data: room } = await supabase.from('rooms')
      .select('id, type, name, capacity_max').eq('id', roomId).single();
    if (!room) return res.status(404).json({ error: 'Phòng không tồn tại' });

    if (room.capacity_max && people > room.capacity_max)
      return res.status(400).json({ error: `Phòng chỉ chứa tối đa ${room.capacity_max} người` });

    // Kiểm tra trùng lịch (Xử lý xuyên đêm)
    const prevDate = new Date(date); prevDate.setDate(prevDate.getDate() - 1);
    const nextDate = new Date(date); nextDate.setDate(nextDate.getDate() + 1);
    const dateList = [
      prevDate.toISOString().split('T')[0],
      date,
      nextDate.toISOString().split('T')[0]
    ];

    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id, start_time, end_time, is_overnight, booking_date')
      .eq('room_id', roomId)
      .in('booking_date', dateList)
      .not('status', 'eq', 'cancelled');

    const hasConflict = conflicts?.some(b => {
      let bStart = timeToFloat(b.start_time);
      let bEnd   = timeToFloat(b.end_time) + (b.is_overnight ? 24 : 0);
      
      if (b.booking_date < date) {
        bStart -= 24; bEnd -= 24;
      } else if (b.booking_date > date) {
        bStart += 24; bEnd += 24;
      }

      return bStart < endHour && bEnd > startHour;
    });
    if (hasConflict)
      return res.status(409).json({ error: 'Phòng đã có người đặt trong khung giờ này' });

    // Tìm hoặc tạo customer
    let customerId;
    const { data: existingCustomer } = await supabase
      .from('customers').select('id').eq('phone', phone.trim()).single();
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from('customers')
        .insert([{ name: name.trim(), phone: phone.trim(), source: channel || 'website' }])
        .select().single();
      if (custErr) return res.status(500).json({ error: custErr.message });
      customerId = newCustomer.id;
    }

    const { data, error } = await supabase.from('bookings').insert([{
      room_id:      roomId,
      booking_date: date,
      start_time:   floatToTime(startHour),
      end_time:     floatToTime(endHour),
      is_overnight: endHour >= 24,
      customer_id:  customerId,
      people:       parseInt(people),
      note:         note?.trim() || null,
      status:       'pending',
      channel:      channel || 'website',
    }]).select('*, customers(name, phone), rooms(name, floor, type)').single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({
      booking: data,
      message: 'Đặt phòng thành công! Chúng tôi sẽ xác nhận trong 15 phút.',
    });
  }
);

// ── PATCH /api/bookings/:id/status — admin: đổi trạng thái ──
router.patch('/:id/status', requireStaff,
  body('status').isIn(['pending','confirmed','in_use','cancelled','completed']).withMessage('Status không hợp lệ'),
  validate,
  async (req, res) => {
    const { status } = req.body;
    const { data, error } = await supabase
      .from('bookings').update({ status })
      .eq('id', req.params.id)
      .select('*, rooms(name, type, capacity_min, capacity_max, surcharge_per_person, surcharge_from_person)')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ booking: data });
  }
);

// ── PATCH /api/bookings/:id — admin: sửa giờ / số người / ghi chú ──
router.patch('/:id', requireStaff,
  body('startHour').optional().isFloat({ min: 9, max: 25.5 }),
  body('endHour').optional().isFloat({ min: 9.5, max: 26 }),
  body('people').optional().isInt({ min: 1, max: 10 }),
  validate,
  async (req, res) => {
    const updates = {};
    if (req.body.startHour  !== undefined) updates.start_time   = floatToTime(req.body.startHour);
    if (req.body.endHour    !== undefined) updates.end_time     = floatToTime(req.body.endHour);
    if (req.body.people     !== undefined) updates.people       = parseInt(req.body.people);
    if (req.body.note       !== undefined) updates.note         = req.body.note;
    if (req.body.bookingDate !== undefined) updates.booking_date = req.body.bookingDate;

    if (updates.start_time && updates.end_time)
      updates.is_overnight = req.body.endHour >= 24;

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'Không có trường hợp lệ để cập nhật' });

    // Kiểm tra trùng lịch nếu đổi ngày hoặc giờ
    if (updates.start_time || updates.end_time || updates.booking_date) {
      const { data: current } = await supabase
        .from('bookings').select('*').eq('id', req.params.id).single();
      
      const targetDate = updates.booking_date || current.booking_date;
      const tStartHour = updates.start_time ? req.body.startHour : timeToFloat(current.start_time);
      const tEndHour = updates.end_time ? req.body.endHour : (timeToFloat(current.end_time) + (current.is_overnight ? 24 : 0));

      const prevDate = new Date(targetDate); prevDate.setDate(prevDate.getDate() - 1);
      const nextDate = new Date(targetDate); nextDate.setDate(nextDate.getDate() + 1);
      const dateList = [
        prevDate.toISOString().split('T')[0],
        targetDate,
        nextDate.toISOString().split('T')[0]
      ];

      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id, start_time, end_time, is_overnight, booking_date')
        .eq('room_id', current.room_id)
        .in('booking_date', dateList)
        .not('status', 'eq', 'cancelled')
        .neq('id', req.params.id);

      const hasConflict = conflicts?.some(b => {
        let bStart = timeToFloat(b.start_time);
        let bEnd   = timeToFloat(b.end_time) + (b.is_overnight ? 24 : 0);
        
        if (b.booking_date < targetDate) {
          bStart -= 24; bEnd -= 24;
        } else if (b.booking_date > targetDate) {
          bStart += 24; bEnd += 24;
        }
        
        return bStart < tEndHour && bEnd > tStartHour;
      });
      if (hasConflict)
        return res.status(409).json({ error: 'Khung giờ mới bị trùng với booking khác' });
    }

    const { data, error } = await supabase
      .from('bookings').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ booking: data });
  }
);

// ── DELETE /api/bookings/:id — chỉ superadmin ──
router.delete('/:id', requireStaff, async (req, res) => {
  if (req.admin.role !== 'superadmin')
    return res.status(403).json({ error: 'Chỉ superadmin mới có thể xoá booking' });
  const { error } = await supabase.from('bookings').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Đã xóa' });
});

module.exports = router;
