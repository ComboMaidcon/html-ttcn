const router = require('express').Router();
const { body } = require('express-validator');
const { validate }    = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const supabase        = require('../lib/supabase');

// GET /api/menu — public
router.get('/', async (req, res) => {
  const { tab, category } = req.query;
  let query = supabase.from('menu_items').select('*')
    .eq('is_available', true).order('sort_order').order('created_at');
  if (tab)      query = query.eq('tab', tab);
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ items: data });
});

// POST /api/menu — admin
router.post('/', requireAuth,
  body('tab').isIn(['drink','food']),
  body('category').notEmpty(),
  body('name').trim().notEmpty(),
  body('price').isInt({ min: 1 }),
  validate,
  async (req, res) => {
    const { tab, category, name, price, variants } = req.body;
    const { data, error } = await supabase.from('menu_items').insert([{
      tab, category, name: name.trim(), price: parseInt(price),
      variants:    variants?.trim()    || null,
    }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ item: data });
  }
);

// PATCH /api/menu/:id — admin
router.patch('/:id', requireAuth, async (req, res) => {
  const allowed = ['name','price','variants','is_available','sort_order','category'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );
  const { data, error } = await supabase
    .from('menu_items').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ item: data });
});

// DELETE /api/menu/:id — admin
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('menu_items').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Đã xóa' });
});

module.exports = router;
