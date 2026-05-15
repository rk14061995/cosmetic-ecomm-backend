const express = require('express');
const router = express.Router();
const { getRefunds, createRefund, updateRefundStatus, deleteRefund } = require('../controllers/refundController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/', getRefunds);
router.post('/', createRefund);
router.put('/:id/status', updateRefundStatus);
router.delete('/:id', deleteRefund);

module.exports = router;
