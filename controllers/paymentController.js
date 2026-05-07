const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

exports.createRazorpayOrder = async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.isPaid) return res.status(400).json({ success: false, message: 'Order already paid' });

  const options = {
    amount: Math.round(order.totalPrice * 100),
    currency: 'INR',
    receipt: `order_${orderId}`,
    notes: { orderId: orderId.toString(), userId: req.user._id.toString() },
  };

  const razorpayOrder = await razorpay.orders.create(options);

  await Payment.create({
    order: orderId,
    user: req.user._id,
    razorpayOrderId: razorpayOrder.id,
    amount: order.totalPrice,
    status: 'created',
  });

  await Order.findByIdAndUpdate(orderId, {
    'paymentResult.razorpayOrderId': razorpayOrder.id,
  });

  res.json({
    success: true,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
};

exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: 'failed', errorDescription: 'Signature verification failed' }
    );
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);

  await Payment.findOneAndUpdate(
    { razorpayOrderId: razorpay_order_id },
    {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: 'paid',
      method: razorpayPayment.method,
    }
  );

  const order = await Order.findOneAndUpdate(
    { _id: orderId, user: req.user._id },
    {
      isPaid: true,
      paidAt: Date.now(),
      orderStatus: 'Paid',
      'paymentResult.razorpayPaymentId': razorpay_payment_id,
      'paymentResult.razorpaySignature': razorpay_signature,
      'paymentResult.status': 'paid',
      $push: { statusHistory: { status: 'Paid', note: 'Payment verified via Razorpay' } },
    },
    { new: true }
  );

  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  for (const item of order.orderItems) {
    if (item.product && !item.isMysteryBox) {
      await require('../models/Product').findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }
  }

  res.json({ success: true, message: 'Payment verified successfully', order });
};

exports.getPaymentLogs = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;
  const total = await Payment.countDocuments();
  const payments = await Payment.find()
    .populate('user', 'name email')
    .populate('order', 'totalPrice orderStatus')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.json({ success: true, payments, total, page: Number(page) });
};

exports.razorpayWebhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const body = JSON.stringify(req.body);

  const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');

  if (expectedSignature !== signature) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  const { event, payload } = req.body;

  if (event === 'payment.failed') {
    const paymentId = payload.payment.entity.order_id;
    await Payment.findOneAndUpdate({ razorpayOrderId: paymentId }, { status: 'failed' });
  }

  res.json({ success: true });
};
