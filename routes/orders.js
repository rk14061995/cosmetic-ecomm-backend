const express = require('express');
const router = express.Router();
const {
  createOrder, getMyOrders, getOrder, cancelOrder,
  getAllOrders, updateOrderStatus, getAdminStats, exportOrdersCsv, getOrderInvoice,
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');
const { validate, orderSchema } = require('../utils/validators');

router.use(protect);

router.post('/', validate(orderSchema), createOrder);
router.get('/admin/stats', adminOnly, getAdminStats);
router.get('/export/csv', adminOnly, exportOrdersCsv);
router.get('/', adminOnly, getAllOrders);
router.get('/my-orders', getMyOrders);
router.get('/:id/invoice', getOrderInvoice);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);
router.put('/:id/status', adminOnly, updateOrderStatus);

module.exports = router;
