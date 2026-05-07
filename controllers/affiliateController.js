const Affiliate = require('../models/Affiliate');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

exports.apply = async (req, res) => {
  const existing = await Affiliate.findOne({ user: req.user._id });
  if (existing) return res.status(400).json({ success: false, message: 'Already applied', affiliate: existing });

  const { bio, instagram, youtube, website, payoutMethod, payoutDetails } = req.body;
  const code = req.user.name.replace(/\s+/g, '').toUpperCase().slice(0, 6) + uuidv4().slice(0, 4).toUpperCase();

  const affiliate = await Affiliate.create({
    user: req.user._id,
    code,
    bio,
    socialLinks: { instagram, youtube, website },
    payoutMethod,
    payoutDetails,
  });

  await User.findByIdAndUpdate(req.user._id, { affiliateCode: code });
  res.status(201).json({ success: true, affiliate });
};

exports.getMyAffiliate = async (req, res) => {
  const affiliate = await Affiliate.findOne({ user: req.user._id });
  if (!affiliate) return res.status(404).json({ success: false, message: 'Not an affiliate' });
  res.json({ success: true, affiliate });
};

exports.trackClick = async (req, res) => {
  const { code } = req.params;
  await Affiliate.findOneAndUpdate({ code }, { $inc: { totalClicks: 1 } });
  res.json({ success: true });
};

exports.getAll = async (req, res) => {
  const affiliates = await Affiliate.find().populate('user', 'name email');
  res.json({ success: true, affiliates });
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const affiliate = await Affiliate.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!affiliate) return res.status(404).json({ success: false, message: 'Affiliate not found' });
  res.json({ success: true, affiliate });
};

exports.recordReferral = async (code, orderId, orderAmount) => {
  const affiliate = await Affiliate.findOne({ code, status: 'approved' });
  if (!affiliate) return;
  const commission = (orderAmount * affiliate.commissionRate) / 100;
  affiliate.totalOrders += 1;
  affiliate.totalEarnings += commission;
  affiliate.pendingPayout += commission;
  affiliate.referrals.push({ order: orderId, amount: orderAmount, commission, status: 'pending' });
  await affiliate.save();
  await User.findByIdAndUpdate(affiliate.user, { $inc: { affiliateEarnings: commission } });
};
