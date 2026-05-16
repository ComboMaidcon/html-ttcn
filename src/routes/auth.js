const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body } = require('express-validator');
const { validate }    = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const supabase        = require('../lib/supabase');

// POST /api/auth/login
router.post('/login',
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').notEmpty().withMessage('Thiếu mật khẩu'),
  validate,
  async (req, res) => {
    const { email, password } = req.body;
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !admin)
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

    // Update last_login
    await supabase.from('admin_users')
      .update({ last_login: new Date() })
      .eq('id', admin.id);

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
  }
);

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ admin: req.admin });
});

module.exports = router;
