const Refund = require('../models/Refund');
const Order = require('../models/Order');
const User = require('../models/User');

exports.getRefunds = async (req, res) => {
  const { status } = req.query;
  const query = status ? { status } : {};
  const refunds = await Refund.find(query)
    .populate('order', 'orderNumber totalPrice orderStatus')
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
  res.json({ success: true, refunds });
};

exports.createRefund = async (req, res) => {
  const { orderId, amount, reason, method, adminNote } = req.body;
  if (!orderId || !amount || !reason) {
    return res.status(400).json({ success: false, message: 'Order, amount, and reason are required' });
  }

  const order = await Order.findById(orderId).populate('user', 'name email');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const refund = await Refund.create({
    order: order._id,
    orderNumber: order.orderNumber,
    user: order.user?._id,
    amount: Number(amount),
    reason,
    method: method || 'wallet',
    adminNote,
  });

  await refund.populate('order', 'orderNumber totalPrice orderStatus');
  await refund.populate('user', 'name email');
  res.status(201).json({ success: true, refund });
};

exports.updateRefundStatus = async (req, res) => {
  const { status, adminNote } = req.body;
  const allowed = ['pending', 'approved', 'rejected', 'processed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const refund = await Refund.findById(req.params.id).populate('user', 'name email wallet');
  if (!refund) return res.status(404).json({ success: false, message: 'Refund not found' });

  refund.status = status;
  if (adminNote !== undefined) refund.adminNote = adminNote;

  // Auto-credit wallet when processed via wallet method
  if (status === 'processed') {
    refund.processedAt = new Date();
    if (refund.method === 'wallet' && refund.user) {
      await User.findByIdAndUpdate(refund.user._id, { $inc: { wallet: refund.amount } });
    }
    // Mark order as Refunded
    await Order.findByIdAndUpdate(refund.order, { orderStatus: 'Refunded' });
  }

  await refund.save();
  await refund.populate('order', 'orderNumber totalPrice orderStatus');
  await refund.populate('user', 'name email');
  res.json({ success: true, refund });
};

exports.deleteRefund = async (req, res) => {
  const refund = await Refund.findById(req.params.id);
  if (!refund) return res.status(404).json({ success: false, message: 'Refund not found' });
  if (refund.status === 'processed') {
    return res.status(400).json({ success: false, message: 'Cannot delete a processed refund' });
  }
  await refund.deleteOne();
  res.json({ success: true, message: 'Refund deleted' });
};
