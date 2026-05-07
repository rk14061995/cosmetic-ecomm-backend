const express = require('express');
const router = express.Router();
const {
  getAllUsers, getUserById, blockUser,
  getUserStats, getReferrals, getAllReferrals,
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

router.get('/referrals/mine', getReferrals);

router.use(adminOnly);
router.get('/', getAllUsers);
router.get('/referrals', getAllReferrals);
router.get('/:id', getUserById);
router.get('/:id/stats', getUserStats);
router.put('/:id/block', blockUser);

module.exports = router;
