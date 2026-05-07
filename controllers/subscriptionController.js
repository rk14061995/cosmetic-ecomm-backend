const Subscription = require('../models/Subscription');
const User = require('../models/User');

const TIER_PRICES = { basic: 449, standard: 899, premium: 1799 };

exports.getMySubscription = async (req, res) => {
  const sub = await Subscription.findOne({ user: req.user._id, status: { $ne: 'cancelled' } });
  res.json({ success: true, subscription: sub });
};

exports.create = async (req, res) => {
  const { tier, shippingAddress } = req.body;
  if (!TIER_PRICES[tier]) return res.status(400).json({ success: false, message: 'Invalid tier' });

  const existing = await Subscription.findOne({ user: req.user._id, status: 'active' });
  if (existing) return res.status(400).json({ success: false, message: 'You already have an active subscription' });

  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  const sub = await Subscription.create({
    user: req.user._id,
    tier,
    price: TIER_PRICES[tier],
    shippingAddress,
    nextBillingDate,
    status: 'active',
  });

  res.status(201).json({ success: true, subscription: sub });
};

exports.pause = async (req, res) => {
  const sub = await Subscription.findOne({ user: req.user._id, status: 'active' });
  if (!sub) return res.status(404).json({ success: false, message: 'No active subscription' });
  sub.status = 'paused';
  sub.pausedAt = new Date();
  await sub.save();
  res.json({ success: true, subscription: sub });
};

exports.resume = async (req, res) => {
  const sub = await Subscription.findOne({ user: req.user._id, status: 'paused' });
  if (!sub) return res.status(404).json({ success: false, message: 'No paused subscription' });
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  sub.status = 'active';
  sub.nextBillingDate = next;
  sub.pausedAt = undefined;
  await sub.save();
  res.json({ success: true, subscription: sub });
};

exports.cancel = async (req, res) => {
  const sub = await Subscription.findOne({ user: req.user._id, status: { $ne: 'cancelled' } });
  if (!sub) return res.status(404).json({ success: false, message: 'No active subscription' });
  sub.status = 'cancelled';
  sub.cancelledAt = new Date();
  await sub.save();
  res.json({ success: true, message: 'Subscription cancelled' });
};

exports.getAllSubscriptions = async (req, res) => {
  const subs = await Subscription.find().populate('user', 'name email');
  res.json({ success: true, subscriptions: subs });
};
