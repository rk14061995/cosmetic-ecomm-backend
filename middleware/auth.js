const jwt = require('jsonwebtoken');
const User = require('../models/User');

const normalizeEmail = (email) => (email || '').trim().toLowerCase();
const staticAdminEmails = (
  process.env.STATIC_ADMIN_EMAILS ||
  process.env.ADMIN_EMAILS ||
  process.env.ADMIN_EMAIL ||
  ''
)
  .split(',')
  .map((email) => normalizeEmail(email))
  .filter(Boolean);

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    if (req.user.isBlocked)
      return res.status(403).json({ success: false, message: 'Account has been blocked' });
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

exports.adminOnly = (req, res, next) => {
  const isStaticAdmin = staticAdminEmails.includes(normalizeEmail(req.user?.email));
  if (
    req.user &&
    (req.user.role === 'admin' || isStaticAdmin)
  ) return next();
  return res.status(403).json({ success: false, message: 'Admin access required' });
};
