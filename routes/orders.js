const express = require('express');
const router = express.Router();
const {
  createOrder, getMyOrders, getOrder, cancelOrder,
  getAllOrders, updateOrderStatus, getAdminStats,
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');
const { validate, orderSchema } = require('../utils/validators');

router.use(protect);

router.post('/', validate(orderSchema), createOrder);
router.get('/my-orders', getMyOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);

router.get('/', adminOnly, getAllOrders);
router.put('/:id/status', adminOnly, updateOrderStatus);
router.get('/admin/stats', adminOnly, getAdminStats);

module.exports = router;
