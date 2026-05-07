const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const MysteryBox = require('../models/MysteryBox');
const Coupon = require('../models/Coupon');
const Referral = require('../models/Referral');
const User = require('../models/User');
const { calculateShipping, getPaginationData } = require('../utils/helpers');
const { sendOrderConfirmationEmail, sendOrderStatusEmail } = require('../services/emailService');
const { allocateProducts, deductInventory } = require('../services/mysteryBoxService');

exports.createOrder = async (req, res) => {
  const { shippingAddress, paymentMethod, couponCode, walletAmountUsed = 0 } = req.body;

  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product').populate('items.mysteryBox');
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  const orderItems = [];
  let itemsPrice = 0;

  for (const item of cart.items) {
    if (item.itemType === 'product') {
      if (!item.product || !item.product.isActive)
        return res.status(400).json({ success: false, message: `Product unavailable` });
      if (item.product.stock < item.quantity)
        return res.status(400).json({ success: false, message: `Insufficient stock for ${item.product.name}` });

      const price = item.product.discountPrice || item.product.price;
      orderItems.push({
        product: item.product._id,
        name: item.product.name,
        image: item.product.images[0]?.url || '',
        price,
        quantity: item.quantity,
        itemType: 'product',
      });
      itemsPrice += price * item.quantity;
    } else if (item.itemType === 'mysteryBox') {
      if (!item.mysteryBox || !item.mysteryBox.isActive)
        return res.status(400).json({ success: false, message: 'Mystery box unavailable' });
      if (item.mysteryBox.stock < item.quantity)
        return res.status(400).json({ success: false, message: 'Insufficient mystery box stock' });

      orderItems.push({
        product: null,
        name: item.mysteryBox.name,
        image: item.mysteryBox.image,
        price: item.mysteryBox.price,
        quantity: item.quantity,
        isMysteryBox: true,
        mysteryBoxTier: item.mysteryBox.tier,
      });
      itemsPrice += item.mysteryBox.price * item.quantity;
    }
  }

  const shippingPrice = calculateShipping(itemsPrice);
  let discountAmount = 0;
  let appliedCoupon = null;

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (coupon) {
      const validity = coupon.isValid();
      if (validity.valid) {
        discountAmount = coupon.calculateDiscount(itemsPrice);
        appliedCoupon = coupon._id;
      }
    }
  }

  const userWalletBalance = req.user.wallet;
  const actualWalletUsed = Math.min(walletAmountUsed, userWalletBalance, itemsPrice + shippingPrice - discountAmount);
  const totalPrice = Math.max(0, itemsPrice + shippingPrice - discountAmount - actualWalletUsed);

  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    discountAmount,
    walletAmountUsed: actualWalletUsed,
    totalPrice,
    coupon: appliedCoupon,
    couponCode: couponCode?.toUpperCase(),
    statusHistory: [{ status: 'Pending', note: 'Order placed' }],
  });

  if (actualWalletUsed > 0) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { wallet: -actualWalletUsed } });
  }

  // Award loyalty points: 1 point per ₹10 spent
  const pointsEarned = Math.floor(totalPrice / 10);
  if (pointsEarned > 0) {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { loyaltyPoints: pointsEarned } },
      { new: true }
    );
    // Update tier based on total points
    const pts = updatedUser.loyaltyPoints;
    const tier = pts >= 5000 ? 'Platinum' : pts >= 2000 ? 'Gold' : pts >= 500 ? 'Silver' : 'Bronze';
    if (updatedUser.loyaltyTier !== tier) {
      await User.findByIdAndUpdate(req.user._id, { loyaltyTier: tier });
    }
  }

  // Track affiliate referral if applicable
  const affiliateCode = req.body.affiliateCode;
  if (affiliateCode) {
    try {
      const { recordReferral } = require('./affiliateController');
      await recordReferral(affiliateCode, order._id, totalPrice);
    } catch (_) {}
  }

  if (paymentMethod === 'cod') {
    await fulfillOrder(order, cart);
  }

  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [], coupon: null, couponCode: null });

  try {
    await sendOrderConfirmationEmail(req.user.email, order);
  } catch {}

  res.status(201).json({ success: true, order });
};

const fulfillOrder = async (order, cart) => {
  for (const item of cart.items) {
    if (item.itemType === 'product') {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    } else if (item.itemType === 'mysteryBox') {
      const box = await MysteryBox.findById(item.mysteryBox);
      if (box) {
        const allocated = await allocateProducts(box);
        await deductInventory(allocated);
        await MysteryBox.findByIdAndUpdate(item.mysteryBox, {
          $inc: { stock: -item.quantity, soldCount: item.quantity },
        });
      }
    }
  }
};

exports.getMyOrders = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const total = await Order.countDocuments({ user: req.user._id });
  const pagination = getPaginationData(page, limit, total);

  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .skip((pagination.currentPage - 1) * pagination.pageSize)
    .limit(pagination.pageSize);

  res.json({ success: true, orders, pagination });
};

exports.getOrder = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, order });
};

exports.cancelOrder = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!['Pending', 'Paid'].includes(order.orderStatus)) {
    return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
  }

  order.orderStatus = 'Cancelled';
  order.statusHistory.push({ status: 'Cancelled', note: req.body.reason || 'Cancelled by user' });
  await order.save();

  if (order.walletAmountUsed > 0) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { wallet: order.walletAmountUsed } });
  }

  res.json({ success: true, message: 'Order cancelled', order });
};

exports.getAllOrders = async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const query = {};
  if (status) query.orderStatus = status;

  const total = await Order.countDocuments(query);
  const pagination = getPaginationData(page, limit, total);

  const orders = await Order.find(query)
    .populate('user', 'name email phone')
    .sort({ createdAt: -1 })
    .skip((pagination.currentPage - 1) * pagination.pageSize)
    .limit(pagination.pageSize);

  res.json({ success: true, orders, pagination });
};

exports.updateOrderStatus = async (req, res) => {
  const { status, trackingNumber, note } = req.body;
  const order = await Order.findById(req.params.id).populate('user', 'email name');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const allowedTransitions = {
    Pending: ['Paid', 'Processing', 'Cancelled'],
    Paid: ['Processing', 'Cancelled'],
    Processing: ['Shipped', 'Cancelled'],
    Shipped: ['Delivered'],
    Delivered: [],
    Cancelled: [],
  };

  if (!allowedTransitions[order.orderStatus]?.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot transition from ${order.orderStatus} to ${status}`,
    });
  }

  order.orderStatus = status;
  order.statusHistory.push({ status, note });
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (status === 'Delivered') {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    await handleReferralReward(order);
  }
  if (status === 'Paid') {
    order.isPaid = true;
    order.paidAt = Date.now();
  }

  await order.save();

  try {
    await sendOrderStatusEmail(order.user.email, order, status);
  } catch {}

  res.json({ success: true, order });
};

const handleReferralReward = async (order) => {
  const referral = await Referral.findOne({
    referred: order.user,
    status: 'pending',
  });

  if (referral) {
    referral.status = 'rewarded';
    referral.rewardedAt = new Date();
    referral.firstPurchaseOrderId = order._id;
    await referral.save();
    await User.findByIdAndUpdate(referral.referrer, { $inc: { wallet: referral.referrerReward } });
  }
};

exports.getAdminStats = async (req, res) => {
  const [totalOrders, totalRevenue, totalUsers, recentOrders] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([
      { $match: { orderStatus: { $in: ['Paid', 'Delivered', 'Shipped'] } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
    require('../models/User').countDocuments({ role: 'user' }),
    Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email'),
  ]);

  const monthlyRevenue = await Order.aggregate([
    { $match: { orderStatus: { $in: ['Paid', 'Delivered', 'Shipped'] } } },
    {
      $group: {
        _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
        revenue: { $sum: '$totalPrice' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 },
  ]);

  res.json({
    success: true,
    stats: {
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalUsers,
      recentOrders,
      monthlyRevenue,
    },
  });
};
