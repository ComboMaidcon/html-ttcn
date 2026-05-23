const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    req.admin = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.admin.role !== 'admin' && req.admin.role !== 'superadmin')
      return res.status(403).json({ error: 'Không có quyền truy cập chức năng này' });
    next();
  });
}

// Giữ từ files.zip — linh hoạt hơn khi cần phân quyền cụ thể
function requireRole(...roles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!roles.includes(req.admin?.role))
        return res.status(403).json({ error: 'Không có quyền thực hiện thao tác này' });
      next();
    });
  };
}

module.exports = { requireAuth, requireAdmin, requireRole };
