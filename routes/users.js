const express = require('express');
const router = express.Router();
const {
  getAllUsers, getUserById, blockUser,
  getUserStats, getReferrals, getAllReferrals,
  getAcquisitionStats,
  getAdminUsers, setAdminRole, updateAdminPermissions,
} = require('../controllers/userController');
const { protect, adminOnly, requirePermission } = require('../middleware/auth');

router.use(protect);

router.get('/referrals/mine', getReferrals);

router.use(adminOnly);
router.get('/', requirePermission('users'), getAllUsers);
router.get('/referrals', getAllReferrals);
router.get('/acquisition-stats', getAcquisitionStats);
router.get('/:id', getUserById);
router.get('/:id/stats', getUserStats);
router.put('/:id/block', requirePermission('users'), blockUser);

// Admin role & permission management — super-admin only (adminPermissions == null)
router.get('/admin/list', (req, res, next) => {
  if (req.user.adminPermissions != null)
    return res.status(403).json({ success: false, message: 'Super-admin access required' });
  next();
}, getAdminUsers);

router.put('/:id/role', (req, res, next) => {
  if (req.user.adminPermissions != null)
    return res.status(403).json({ success: false, message: 'Super-admin access required' });
  next();
}, setAdminRole);

router.put('/:id/permissions', (req, res, next) => {
  if (req.user.adminPermissions != null)
    return res.status(403).json({ success: false, message: 'Super-admin access required' });
  next();
}, updateAdminPermissions);

module.exports = router;
