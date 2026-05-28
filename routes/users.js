const express = require('express');
const router = express.Router();
const {
  getAllUsers, getUserById, blockUser,
  getUserStats, getReferrals, getAllReferrals,
  getAcquisitionStats,
  getAdminUsers, setAdminRole, updateAdminPermissions,
  getUserEvents, getUserOrders,
  getNotificationEmails, updateNotificationEmails,
  impersonateUser,
} = require('../controllers/userController');
const { protect, adminOnly, requirePermission } = require('../middleware/auth');

const superAdminOnly = (req, res, next) => {
  if (req.user.adminPermissions != null)
    return res.status(403).json({ success: false, message: 'Super-admin access required' });
  next();
};

router.use(protect);
router.get('/referrals/mine', getReferrals);

router.use(adminOnly);

// ── Static named routes (MUST come before /:id) ────────────────────────────
router.get('/',                    requirePermission('users'), getAllUsers);
router.get('/referrals',           getAllReferrals);
router.get('/acquisition-stats',   getAcquisitionStats);
router.get('/admin/list',          superAdminOnly, getAdminUsers);
router.get('/notification-settings',  getNotificationEmails);
router.put('/notification-settings',  updateNotificationEmails);

// ── Dynamic :id routes ─────────────────────────────────────────────────────
router.get('/:id',                 getUserById);
router.get('/:id/stats',           getUserStats);
router.get('/:id/events',          getUserEvents);
router.get('/:id/orders',          getUserOrders);
router.put('/:id/block',           requirePermission('users'), blockUser);
router.post('/:id/impersonate',    superAdminOnly, impersonateUser);
router.put('/:id/role',            superAdminOnly, setAdminRole);
router.put('/:id/permissions',     superAdminOnly, updateAdminPermissions);

module.exports = router;
