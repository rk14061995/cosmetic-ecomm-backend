const Order = require('../models/Order');
const Product = require('../models/Product');
const MysteryBox = require('../models/MysteryBox');
const Coupon = require('../models/Coupon');
const Referral = require('../models/Referral');
const logEvent = require('../utils/logEvent');
const User = require('../models/User');
const Cart = require('../models/Cart');
const { calculateShipping, getPaginationData } = require('../utils/helpers');
const { buildOrderIdFilter } = require('../utils/orderLookup');
const { sendOrderConfirmationEmail, sendOrderStatusEmail, sendAdminNewOrderEmail } = require('../services/emailService');
const { allocateProducts, deductInventory } = require('../services/mysteryBoxService');
const { buildInvoiceNumber } = require('../services/invoiceService');

const Expense = require('../models/Expense');

const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

exports.createOrder = async (req, res) => {
  const { shippingAddress, paymentMethod, couponCode, walletAmountUsed = 0, pointsToRedeem = 0 } = req.body;

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

  const hasOnlyTestProducts = cart.items.length > 0 && cart.items.every((i) => i.product?.isTestProduct);
  const shippingPrice = hasOnlyTestProducts ? 0 : calculateShipping(itemsPrice);
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

  // Points redemption: 5 points = ₹1
  const POINTS_PER_RUPEE = 5;
  const userLoyaltyPoints = req.user.loyaltyPoints || 0;
  const sanitizedPointsToRedeem = Math.max(0, Math.floor(Number(pointsToRedeem) || 0));
  const maxRedeemableByBalance = Math.floor(userLoyaltyPoints / POINTS_PER_RUPEE) * POINTS_PER_RUPEE;
  const prePointsTotal = itemsPrice + shippingPrice - discountAmount - actualWalletUsed;
  const maxRedeemableByOrder = Math.floor(prePointsTotal) * POINTS_PER_RUPEE;
  const actualPointsRedeemed = Math.min(sanitizedPointsToRedeem, maxRedeemableByBalance, maxRedeemableByOrder);
  const pointsRedeemedValue = Math.floor(actualPointsRedeemed / POINTS_PER_RUPEE);

  const totalPrice = Math.round(Math.max(0, prePointsTotal - pointsRedeemedValue));

  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    discountAmount,
    walletAmountUsed: actualWalletUsed,
    pointsRedeemed: actualPointsRedeemed,
    pointsRedeemedValue,
    totalPrice,
    coupon: appliedCoupon,
    couponCode: couponCode?.toUpperCase(),
    statusHistory: [{ status: 'Pending', note: 'Order placed' }],
  });
  if (req.user.role !== 'admin') logEvent(req.user._id, 'order_placed', { orderId: order._id, total: totalPrice, itemCount: orderItems.length, paymentMethod });

  if (actualWalletUsed > 0) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { wallet: -actualWalletUsed } });
  }
  if (actualPointsRedeemed > 0) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { loyaltyPoints: -actualPointsRedeemed } });
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

  sendAdminNewOrderEmail(order, req.user.name, req.user.email).catch(() => {});

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
  const filter = buildOrderIdFilter(req.params.id);
  if (!filter) return res.status(400).json({ success: false, message: 'Invalid order reference' });
  const order = await Order.findOne({ ...filter, user: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, order });
};

/** Paid order owned by user — for HTML/JSON invoice (no PDF). */
async function loadPaidOrderForInvoice(orderId, userId) {
  const filter = buildOrderIdFilter(orderId);
  if (!filter) {
    return { err: { status: 400, json: { success: false, message: 'Invalid order reference' } } };
  }

  const order = await Order.findOne({ ...filter, user: userId });
  if (!order) return { err: { status: 404, json: { success: false, message: 'Order not found' } } };
  if (!order.isPaid) {
    return { err: { status: 400, json: { success: false, message: 'Invoice is available only for paid orders' } } };
  }

  return { order };
}

exports.getOrderInvoice = async (req, res) => {
  const out = await loadPaidOrderForInvoice(req.params.id, req.user._id);
  if (out.err) return res.status(out.err.status).json(out.err.json);
  const { order } = out;

  const user = await User.findById(req.user._id).select('name email phone');
  const invoiceNumber = buildInvoiceNumber(order);
  if (!order.invoiceNumber) {
    order.invoiceNumber = invoiceNumber;
    await order.save();
  }

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'KosmeticX';

  return res.json({
    success: true,
    invoiceNumber: order.invoiceNumber || invoiceNumber,
    siteName,
    customer: {
      name: user?.name || order.shippingAddress?.fullName,
      email: user?.email,
      phone: user?.phone || order.shippingAddress?.phone,
    },
    order: {
      _id: order._id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      orderItems: order.orderItems,
      shippingAddress: order.shippingAddress,
      itemsPrice: order.itemsPrice,
      shippingPrice: order.shippingPrice,
      discountAmount: order.discountAmount,
      walletAmountUsed: order.walletAmountUsed,
      totalPrice: order.totalPrice,
      couponCode: order.couponCode,
    },
  });
};

exports.cancelOrder = async (req, res) => {
  const filter = buildOrderIdFilter(req.params.id);
  if (!filter) return res.status(400).json({ success: false, message: 'Invalid order reference' });
  const order = await Order.findOne({ ...filter, user: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!['Pending', 'Paid'].includes(order.orderStatus)) {
    return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
  }
  if (Date.now() - new Date(order.createdAt).getTime() > CANCEL_WINDOW_MS) {
    return res.status(400).json({ success: false, message: 'Cancellation window has expired' });
  }

  order.orderStatus = 'Cancelled';
  order.statusHistory.push({ status: 'Cancelled', note: req.body.reason || 'Cancelled by user' });
  await order.save();

  if (order.walletAmountUsed > 0) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { wallet: order.walletAmountUsed } });
  }
  if (order.pointsRedeemed > 0) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { loyaltyPoints: order.pointsRedeemed } });
  }

  res.json({ success: true, message: 'Order cancelled', order });
};

exports.getAllOrders = async (req, res) => {
  const { page = 1, limit = 20, status, search, paymentMethod, from, to, assignedTo, unassigned } = req.query;
  const query = {};
  if (status) query.orderStatus = status;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (assignedTo) query.assignedTo = assignedTo;
  if (unassigned === 'true') query.assignedTo = null;

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = toDate;
    }
  }

  if (search && String(search).trim()) {
    const term = String(search).trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const orClauses = [
      { couponCode: regex },
      { trackingNumber: regex },
      { orderNumber: regex },
      { 'shippingAddress.fullName': regex },
      { 'shippingAddress.phone': regex },
    ];

    // Allow search by order id (full id or short trailing id in UI)
    if (/^[a-fA-F0-9]{24}$/.test(term)) {
      orClauses.push({ _id: term });
    }

    // Search by customer email/name via user lookup.
    const matchingUsers = await User.find({
      $or: [{ email: regex }, { name: regex }, { phone: regex }],
    }).select('_id');
    if (matchingUsers.length > 0) {
      orClauses.push({ user: { $in: matchingUsers.map((u) => u._id) } });
    }

    query.$or = orClauses;
  }

  const total = await Order.countDocuments(query);
  const pagination = getPaginationData(page, limit, total);

  const orders = await Order.find(query)
    .populate('user', 'name email phone')
    .populate('assignedTo', 'name role')
    .sort({ createdAt: -1 })
    .skip((pagination.currentPage - 1) * pagination.pageSize)
    .limit(pagination.pageSize);

  res.json({ success: true, orders, pagination });
};

exports.exportOrdersCsv = async (req, res) => {
  const { status, paymentMethod, from, to } = req.query;
  const query = {};
  if (status) query.orderStatus = status;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = toDate;
    }
  }

  const orders = await Order.find(query).populate('user', 'name email phone').sort({ createdAt: -1 });
  const rows = [
    ['orderNumber', 'mongoId', 'date', 'customerName', 'customerEmail', 'phone', 'items', 'totalPrice', 'paymentMethod', 'status', 'trackingNumber'],
    ...orders.map((o) => [
      o.orderNumber || '',
      String(o._id),
      new Date(o.createdAt).toISOString(),
      o.user?.name || '',
      o.user?.email || '',
      o.shippingAddress?.phone || o.user?.phone || '',
      o.orderItems?.length || 0,
      o.totalPrice || 0,
      o.paymentMethod || '',
      o.orderStatus || '',
      o.trackingNumber || '',
    ]),
  ];

  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="orders-${Date.now()}.csv"`);
  res.status(200).send(csv);
};

exports.updateOrderStatus = async (req, res) => {
  const { status, trackingNumber, note } = req.body;
  const filter = buildOrderIdFilter(req.params.id);
  if (!filter) return res.status(400).json({ success: false, message: 'Invalid order reference' });
  const order = await Order.findOne(filter).populate('user', 'email name');
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
  if (status === 'Shipped' && !trackingNumber && !order.trackingNumber) {
    return res.status(400).json({
      success: false,
      message: 'Tracking number is required when marking order as Shipped',
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

// Statuses that represent confirmed/active revenue (excludes Pending, Cancelled, Refunded)
const REVENUE_STATUSES = ['Paid', 'Processing', 'Shipped', 'Delivered'];

exports.getAdminStats = async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = {};
  if (from || to) {
    dateFilter.createdAt = {};
    if (from) dateFilter.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.createdAt.$lte = toDate;
    }
  }

  const revenueMatch = { orderStatus: { $in: REVENUE_STATUSES }, ...dateFilter };

  const [totalOrders, totalRevenue, totalUsers, recentOrders, investmentData, cogsData, expensesData] = await Promise.all([
    Order.countDocuments(dateFilter),
    Order.aggregate([
      { $match: revenueMatch },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
    // New customers in the period (or total if no filter)
    require('../models/User').countDocuments({ role: 'user', ...dateFilter }),
    Order.find(dateFilter).sort({ createdAt: -1 }).limit(5).populate('user', 'name email'),
    // Stock investment = costPrice × current stock (always current snapshot, no date filter)
    Product.aggregate([
      { $match: { isActive: true, costPrice: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$costPrice', '$stock'] } } } },
    ]),
    // COGS = costPrice × qty sold in the period
    Order.aggregate([
      { $match: revenueMatch },
      { $unwind: '$orderItems' },
      { $match: { 'orderItems.isMysteryBox': { $ne: true }, 'orderItems.product': { $exists: true, $ne: null } } },
      {
        $lookup: {
          from: 'products',
          let: { pid: '$orderItems.product' },
          pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$pid'] } } }, { $project: { costPrice: 1 } }],
          as: 'productDoc',
        },
      },
      { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: { $multiply: [{ $ifNull: ['$productDoc.costPrice', 0] }, '$orderItems.quantity'] } } } },
    ]),
    // Overhead expenses in the period
    Expense.aggregate([
      ...(Object.keys(dateFilter).length ? [{ $match: dateFilter }] : []),
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const monthlyRevenue = await Order.aggregate([
    { $match: revenueMatch },
    { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, revenue: { $sum: '$totalPrice' }, orders: { $sum: 1 } } },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 },
  ]);

  const totalRevenueVal = totalRevenue[0]?.total || 0;
  const stockInvestment = investmentData[0]?.total || 0;
  const totalCogs = cogsData[0]?.total || 0;
  const totalExpenses = expensesData[0]?.total || 0;
  const totalInvestment = stockInvestment + totalExpenses;
  const totalProfit = totalRevenueVal - totalInvestment;
  const profitMargin = totalRevenueVal > 0 ? (totalProfit / totalRevenueVal) * 100 : 0;

  res.json({
    success: true,
    stats: {
      totalOrders,
      totalRevenue: totalRevenueVal,
      totalUsers,
      recentOrders,
      monthlyRevenue,
      stockInvestment,
      totalExpenses,
      totalInvestment,
      totalCogs,
      totalProfit,
      profitMargin,
    },
  });
};

exports.assignOrder = async (req, res) => {
  const { employeeId } = req.body;
  const filter = buildOrderIdFilter(req.params.id);
  if (!filter) return res.status(400).json({ success: false, message: 'Invalid order reference' });

  const order = await Order.findOne(filter);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (employeeId) {
    const Employee = require('../models/Employee');
    const emp = await Employee.findById(employeeId).select('_id name status');
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
    if (emp.status !== 'active') return res.status(400).json({ success: false, message: 'Employee is not active' });
    order.assignedTo = emp._id;
  } else {
    order.assignedTo = null;
  }

  await order.save();
  await order.populate('assignedTo', 'name role');
  res.json({ success: true, order });
};
