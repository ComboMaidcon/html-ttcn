const router      = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const supabase    = require('../lib/supabase');

// GET /api/rooms — public
router.get('/', async (req, res) => {
  const { floor, type } = req.query;
  let query = supabase.from('rooms').select('*').eq('is_active', true).order('floor', { ascending: false });
  if (floor) query = query.eq('floor', parseInt(floor));
  if (type)  query = query.eq('type', type);

  const { data, error } = await query;
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

// PATCH /api/rooms/:id — admin only
router.patch('/:id', requireAuth, async (req, res) => {
  const allowed = ['name','is_active'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );
  const { data, error } = await supabase
    .from('rooms').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ room: data });
});

module.exports = router;
