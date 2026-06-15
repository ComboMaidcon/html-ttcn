const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { requireAuth, requireStaff } = require('../middleware/auth');
const supabase = require('../lib/supabase');

// GET /api/discounts - Lấy danh sách mã giảm giá
router.get('/', requireStaff, async (req, res) => {
  const { data, error } = await supabase
    .from('discounts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ discounts: data });
});

// POST /api/discounts/validate - Kiểm tra mã giảm giá
router.post('/validate', requireStaff,
  body('code').trim().notEmpty().withMessage('Thiếu mã giảm giá'),
  validate,
  async (req, res) => {
    const { code } = req.body;
    const { data, error } = await supabase
      .from('discounts')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' });

    // Validate date
    const now = new Date();
    if (new Date(data.valid_from) > now) return res.status(400).json({ error: 'Mã giảm giá chưa đến thời gian áp dụng' });
    if (data.valid_until && new Date(data.valid_until) < now) return res.status(400).json({ error: 'Mã giảm giá đã hết hạn' });

    // Validate usage limit
    if (data.max_uses !== null && data.used_count >= data.max_uses) {
      return res.status(400).json({ error: 'Mã giảm giá đã hết lượt sử dụng' });
    }

    res.json({ discount: data });
  }
);

// POST /api/discounts - Tạo mã mới
router.post('/', requireStaff,
  body('code').trim().notEmpty().withMessage('Thiếu mã giảm giá'),
  body('discount_type').isIn(['percent', 'fixed']),
  body('discount_value').isInt({ min: 1 }),
  body('target_type').isIn(['all', 'room', 'customer']),
  validate,
  async (req, res) => {
    const { code, description, discount_type, discount_value, target_type, target_id, max_uses, valid_until } = req.body;
    
    // Check if code exists
    const { data: existing } = await supabase.from('discounts').select('id').eq('code', code.toUpperCase()).single();
    if (existing) return res.status(400).json({ error: 'Mã giảm giá đã tồn tại' });

    const { data, error } = await supabase
      .from('discounts')
      .insert([{
        code: code.toUpperCase(),
        description,
        discount_type,
        discount_value,
        target_type,
        target_id: target_id || null,
        max_uses: max_uses || null,
        valid_until: valid_until || null
      }])
      .select().single();
      
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ discount: data });
  }
);

// PATCH /api/discounts/:id - Sửa mã
router.patch('/:id', requireStaff,
  async (req, res) => {
    const updates = req.body;
    if (updates.code) updates.code = updates.code.toUpperCase();

    const { data, error } = await supabase
      .from('discounts')
      .update(updates)
      .eq('id', req.params.id)
      .select().single();
      
    if (error) return res.status(500).json({ error: error.message });
    res.json({ discount: data });
  }
);

// DELETE /api/discounts/:id - Xoá mã (soft delete hoặc xoá cứng)
router.delete('/:id', requireStaff, async (req, res) => {
  const { error } = await supabase.from('discounts').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
