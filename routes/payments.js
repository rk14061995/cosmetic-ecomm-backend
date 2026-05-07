const express = require('express');
const router = express.Router();
const { createRazorpayOrder, verifyPayment, getPaymentLogs, razorpayWebhook } = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');

router.post('/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

router.use(protect);
router.post('/create-order', paymentLimiter, createRazorpayOrder);
router.post('/verify', verifyPayment);
router.get('/logs', adminOnly, getPaymentLogs);

module.exports = router;
