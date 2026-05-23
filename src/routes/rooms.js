const router   = require('express').Router();
const { body, param } = require('express-validator');
const { validate }            = require('../middleware/validate');
const { requireAuth, requireAdmin, requireRole } = require('../middleware/auth');
const supabase = require('../lib/supabase');

// GET /api/rooms — public
router.get('/', async (req, res) => {
  const { floor, type } = req.query;
  let query = supabase.from('rooms').select('*')
    .eq('is_active', true)
    .order('floor', { ascending: false })
    .order('name');
  if (floor) query = query.eq('floor', parseInt(floor));
  if (type)  query = query.eq('type', type);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ rooms: data });
});

// GET /api/rooms/admin — admin (bao gồm phòng inactive)
router.get('/admin', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('rooms').select('*').order('floor', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ rooms: data });
});

// GET /api/rooms/:id — public
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('rooms').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Không tìm thấy phòng' });
  res.json({ room: data });
});

// GET /api/rooms/:id/availability?date= — public: kiểm tra slot còn trống
router.get('/:id/availability', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Thiếu tham số date' });
  const { data, error } = await supabase
    .from('bookings')
    .select('start_time, end_time, is_overnight, status')
    .eq('room_id', req.params.id)
    .eq('booking_date', date)
    .neq('status', 'cancelled');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ booked_slots: data });
});

// PATCH /api/rooms/:id — admin: cập nhật phòng
router.patch('/:id', requireAdmin,
  param('id').notEmpty(),
  validate,
  async (req, res) => {
    // Cho phép sửa đủ các trường — bao gồm surcharge từ files.zip
    const allowed = ['name','is_active','capacity_min','capacity_max',
                     'surcharge_per_person','surcharge_from_person'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'Không có trường hợp lệ để cập nhật' });
    const { data, error } = await supabase
      .from('rooms').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ room: data });
  }
);

module.exports = router;
