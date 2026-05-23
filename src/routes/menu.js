const router  = require('express').Router();
const { body } = require('express-validator');
const { validate }   = require('../middleware/validate');
const { requireAdmin } = require('../middleware/auth');
const supabase         = require('../lib/supabase');

// GET /api/menu — public
router.get('/', async (req, res) => {
  const { tab, category } = req.query;
  let query = supabase.from('menu_items').select('*')
    .eq('is_available', true)
    .order('category')
    .order('sort_order')
    .order('created_at');
  if (tab)      query = query.eq('tab', tab);
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ items: data });
});

// POST /api/menu — admin
router.post('/', requireAdmin,
  body('tab').isIn(['drink','food']).withMessage('tab phải là drink hoặc food'),
  body('category').trim().notEmpty().withMessage('Thiếu category'),
  body('name').trim().notEmpty().withMessage('Thiếu tên'),
  body('price').isInt({ min: 1 }).withMessage('Giá phải lớn hơn 0'),
  body('variants').optional().isString(),
  body('sortOrder').optional().isInt({ min: 0 }),
  validate,
  async (req, res) => {
    const { tab, category, name, price, variants, sortOrder } = req.body;
    const { data, error } = await supabase.from('menu_items').insert([{
      tab,
      category:   category.trim(),
      name:       name.trim(),
      price:      parseInt(price),
      variants:   variants?.trim() || null,
      sort_order: sortOrder != null ? parseInt(sortOrder) : 0,
    }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ item: data });
  }
);

// PATCH /api/menu/:id — admin
router.patch('/:id', requireAdmin,
  body('name').optional().trim().notEmpty(),
  body('price').optional().isInt({ min: 1 }),
  body('isAvailable').optional().isBoolean(),
  body('sortOrder').optional().isInt({ min: 0 }),
  validate,
  async (req, res) => {
    const updates = {};
    if (req.body.name        !== undefined) updates.name         = req.body.name.trim();
    if (req.body.price       !== undefined) updates.price        = parseInt(req.body.price);
    if (req.body.variants    !== undefined) updates.variants     = req.body.variants;
    if (req.body.isAvailable !== undefined) updates.is_available = req.body.isAvailable;
    if (req.body.sortOrder   !== undefined) updates.sort_order   = parseInt(req.body.sortOrder);
    if (req.body.category    !== undefined) updates.category     = req.body.category;
    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'Không có trường hợp lệ để cập nhật' });
    const { data, error } = await supabase
      .from('menu_items').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ item: data });
  }
);

// DELETE /api/menu/:id — chỉ superadmin (thông thường dùng PATCH is_available=false)
router.delete('/:id', requireAdmin, async (req, res) => {
  if (req.admin.role !== 'superadmin')
    return res.status(403).json({ error: 'Chỉ superadmin mới có thể xoá món khỏi hệ thống' });
  const { error } = await supabase.from('menu_items').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Đã xoá' });
});

module.exports = router;
