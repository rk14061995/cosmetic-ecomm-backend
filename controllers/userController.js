const User = require('../models/User');
const Referral = require('../models/Referral');
const Order = require('../models/Order');
const { getPaginationData } = require('../utils/helpers');

exports.getAllUsers = async (req, res) => {
  const { page = 1, limit = 20, search, blocked } = req.query;
  const query = { role: 'user' };
  if (search) query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];
  if (blocked !== undefined) query.isBlocked = blocked === 'true';

  const total = await User.countDocuments(query);
  const pagination = getPaginationData(page, limit, total);

  const users = await User.find(query)
    .select('-password -refreshToken -resetPasswordToken')
    .sort({ createdAt: -1 })
    .skip((pagination.currentPage - 1) * pagination.pageSize)
    .limit(pagination.pageSize);

  res.json({ success: true, users, pagination });
};

exports.getUserById = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -refreshToken');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
};

exports.blockUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot block admin' });

  user.isBlocked = !user.isBlocked;
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: user.isBlocked ? 'User blocked' : 'User unblocked',
    isBlocked: user.isBlocked,
  });
};

exports.getUserStats = async (req, res) => {
  const userId = req.params.id;

  const [orderCount, totalSpent, referrals] = await Promise.all([
    Order.countDocuments({ user: userId }),
    Order.aggregate([
      { $match: { user: require('mongoose').Types.ObjectId(userId), isPaid: true } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
    Referral.countDocuments({ referrer: userId, status: 'rewarded' }),
  ]);

  res.json({
    success: true,
    stats: {
      orderCount,
      totalSpent: totalSpent[0]?.total || 0,
      referrals,
    },
  });
};

exports.getReferrals = async (req, res) => {
  const referrals = await Referral.find({ referrer: req.user._id })
    .populate('referred', 'name email createdAt')
    .sort({ createdAt: -1 });

  res.json({ success: true, referrals });
};

exports.getAllReferrals = async (req, res) => {
  const referrals = await Referral.find()
    .populate('referrer', 'name email')
    .populate('referred', 'name email')
    .sort({ createdAt: -1 });

  res.json({ success: true, referrals });
};

/** List all admin users with their permission assignments (super-admin only). */
exports.getAdminUsers = async (req, res) => {
  const admins = await User.find({ role: 'admin' })
    .select('_id name email adminPermissions createdAt')
    .sort({ createdAt: 1 });
  res.json({ success: true, admins });
};

/**
 * Promote a user to admin or demote admin to user.
 * Only a super-admin (adminPermissions == null) can call this.
 * Cannot demote yourself.
 */
exports.setAdminRole = async (req, res) => {
  const { role } = req.body; // 'admin' | 'user'
  if (!['admin', 'user'].includes(role))
    return res.status(400).json({ success: false, message: 'role must be "admin" or "user"' });

  if (req.params.id === String(req.user._id))
    return res.status(400).json({ success: false, message: 'You cannot change your own role' });

  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ success: false, message: 'User not found' });

  target.role = role;
  // Demoting removes permissions; promoting starts with full access (null)
  if (role === 'user') target.adminPermissions = undefined;
  await target.save({ validateBeforeSave: false });

  res.json({ success: true, message: role === 'admin' ? 'User promoted to admin' : 'Admin demoted to user' });
};

/**
 * Set the adminPermissions array for an admin user.
 * Pass null to grant super-admin (full) access.
 * Only callable by a super-admin.
 */
exports.updateAdminPermissions = async (req, res) => {
  const { permissions } = req.body; // string[] | null

  if (req.params.id === String(req.user._id))
    return res.status(400).json({ success: false, message: 'You cannot change your own permissions' });

  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ success: false, message: 'User not found' });
  if (target.role !== 'admin') return res.status(400).json({ success: false, message: 'User is not an admin' });

  // null → super-admin; array → restricted
  target.adminPermissions = permissions == null ? undefined : permissions;
  await target.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: 'Permissions updated',
    adminPermissions: target.adminPermissions ?? null,
  });
};

/** Signups grouped by first-touch acquisition source (admin). */
exports.getAcquisitionStats = async (req, res) => {
  const rows = await User.aggregate([
    { $match: { role: 'user' } },
    {
      $group: {
        _id: {
          $cond: [
            {
              $or: [
                { $eq: ['$acquisitionSource', ''] },
                { $eq: ['$acquisitionSource', null] },
              ],
            },
            'direct',
            '$acquisitionSource',
          ],
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  res.json({
    success: true,
    stats: rows.map((r) => ({ source: r._id, count: r.count })),
  });
};

exports.getNotificationEmails = async (req, res) => {
  const NotificationSettings = require('../models/NotificationSettings');
  let settings = await NotificationSettings.findOne();
  if (!settings) {
    settings = await NotificationSettings.create({
      emails: [process.env.ADMIN_NOTIFY_EMAIL || 'kosmeticxglow@gmail.com'],
    });
  }
  res.json({ success: true, emails: settings.emails });
};

exports.updateNotificationEmails = async (req, res) => {
  const NotificationSettings = require('../models/NotificationSettings');
  const valid = (req.body.emails || [])
    .map((e) => String(e).trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  let settings = await NotificationSettings.findOne();
  if (!settings) {
    settings = await NotificationSettings.create({ emails: valid });
  } else {
    settings.emails = valid;
    await settings.save();
  }
  res.json({ success: true, emails: settings.emails });
};

exports.impersonateUser = async (req, res) => {
  if (req.user.adminPermissions != null) {
    return res.status(403).json({ success: false, message: 'Super-admin access required' });
  }
  const { generateTokens } = require('../utils/helpers');
  const target = await User.findById(req.params.id).select('-password');
  if (!target) return res.status(404).json({ success: false, message: 'User not found' });
  if (target.role === 'admin') {
    return res.status(400).json({ success: false, message: 'Cannot impersonate an admin account' });
  }
  const { accessToken, refreshToken } = generateTokens(target._id);
  res.json({
    success: true,
    accessToken,
    refreshToken,
    user: { _id: target._id, name: target.name, email: target.email },
  });
};

exports.getUserEvents = async (req, res) => {
  const UserEvent = require('../models/UserEvent');
  const { page = 1, limit = 30 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [events, total] = await Promise.all([
    UserEvent.find({ user: req.params.id }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    UserEvent.countDocuments({ user: req.params.id }),
  ]);
  res.json({
    success: true,
    events,
    pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) },
  });
};

exports.getUserOrders = async (req, res) => {
  const { limit = 10 } = req.query;
  const orders = await Order.find({ user: req.params.id })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .select('orderNumber orderStatus totalPrice orderItems paymentMethod createdAt isPaid');
  res.json({ success: true, orders });
};
