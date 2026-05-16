const router = require('express').Router();
const { body } = require('express-validator');
const { validate }    = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const supabase        = require('../lib/supabase');

// GET /api/reviews — public (chỉ approved)
router.get('/', async (req, res) => {
  const { page = 1, limit = 10, visitType, minRating } = req.query;
  const from = (parseInt(page) - 1) * parseInt(limit);
  const to   = from + parseInt(limit) - 1;

  let query = supabase.from('reviews').select('*', { count: 'exact' })
    .eq('is_approved', true).order('created_at', { ascending: false }).range(from, to);

  if (visitType)  query = query.eq('visit_type', visitType);
  if (minRating)  query = query.gte('rating', parseInt(minRating));

  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Tính stats
  const { data: all } = await supabase
    .from('reviews').select('rating').eq('is_approved', true);
  const avg  = all?.length ? (all.reduce((s,r) => s+r.rating, 0) / all.length).toFixed(1) : 0;
  const dist = [1,2,3,4,5].map(n => ({ star: n, count: all?.filter(r => r.rating===n).length || 0 }));

  res.json({ reviews: data, total: count, page: parseInt(page), stats: { avg, dist, total: all?.length || 0 } });
});

// POST /api/reviews — public
router.post('/',
  body('name').trim().notEmpty().withMessage('Thiếu tên'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Sao từ 1–5'),
  body('content').trim().isLength({ min: 20 }).withMessage('Nội dung tối thiểu 20 ký tự'),
  validate,
  async (req, res) => {
    const { name, rating, roomName, visitType, source, content } = req.body;
    const { data, error } = await supabase.from('reviews').insert([{
      name:       name.trim(),
      initial:    name.trim()[0].toUpperCase(),
      rating:     parseInt(rating),
      room_name:  roomName  || null,
      visit_type: visitType || null,
      source:     source    || null,
      content:    content.trim(),
    }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ review: data });
  }
);

// PATCH /api/reviews/:id — admin: approve/reject
router.patch('/:id', requireAuth,
  body('isApproved').isBoolean(),
  validate,
  async (req, res) => {
    const { data, error } = await supabase
      .from('reviews').update({ is_approved: req.body.isApproved })
      .eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ review: data });
  }
);

// DELETE /api/reviews/:id — admin
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('reviews').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Đã xóa' });
});

module.exports = router;
