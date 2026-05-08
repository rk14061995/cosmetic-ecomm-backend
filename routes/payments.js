const express = require('express');
const router = express.Router();
const { createRazorpayOrder, verifyPayment, getPaymentLogs, razorpayWebhook } = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const { validate, createRazorpayOrderSchema, verifyPaymentSchema } = require('../utils/validators');

router.post('/webhook', razorpayWebhook);

router.use(protect);
router.post('/create-order', paymentLimiter, validate(createRazorpayOrderSchema), createRazorpayOrder);
router.post('/verify', validate(verifyPaymentSchema), verifyPayment);
router.get('/logs', adminOnly, getPaymentLogs);

module.exports = router;
