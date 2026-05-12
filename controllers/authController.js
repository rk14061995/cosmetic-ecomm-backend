const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Referral = require('../models/Referral');
// const OtpVerification = require('../models/OtpVerification');
const { generateTokens, generateResetToken } = require('../utils/helpers');
const { sendPasswordResetEmail } = require('../services/emailService');
// const { sendOtpSms, normalizeIndianMobile, OTP_EXPIRY_MINUTES } = require('../services/smsService');

const sendTokenResponse = (user, statusCode, res) => {
  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false });

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      wallet: user.wallet,
      referralCode: user.referralCode,
    },
  });
};

exports.register = async (req, res) => {
  const { name, email, password, phone, referralCode } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });

  const user = await User.create({ name, email, password, phone });

  if (referralCode) {
    const referrer = await User.findOne({ referralCode });
    if (referrer && referrer._id.toString() !== user._id.toString()) {
      await Referral.create({
        referrer: referrer._id,
        referred: user._id,
        referralCode,
      });
      user.referredBy = referrer._id;
      user.wallet += 50;
      await user.save({ validateBeforeSave: false });
    }
  }

  sendTokenResponse(user, 201, res);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (user.isBlocked) {
    return res.status(403).json({ success: false, message: 'Your account has been blocked' });
  }

  sendTokenResponse(user, 200, res);
};

exports.sendOtp = async (req, res) => {
  // OTP flow is intentionally disabled for now.
  return res.status(503).json({
    success: false,
    message: 'OTP service is temporarily disabled',
  });
};

exports.verifyOtp = async (req, res) => {
  // OTP flow is intentionally disabled for now.
  return res.json({
    success: false,
    verified: false,
    message: 'OTP verification is temporarily disabled',
  });
};

exports.logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.json({ success: true, message: 'Logged out successfully' });
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh token' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
    sendTokenResponse(user, 200, res);
  } catch {
    return res.status(401).json({ success: false, message: 'Refresh token expired' });
  }
};

exports.forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.json({ success: true, message: 'If email exists, reset link has been sent' });

  const { resetToken, hashedToken, expiry } = generateResetToken();
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = expiry;
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
  try {
    await sendPasswordResetEmail(user.email, resetUrl);
    res.json({ success: true, message: 'Password reset email sent' });
  } catch {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).json({ success: false, message: 'Email could not be sent' });
  }
};

exports.resetPassword = async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist', 'name images price slug');
  res.json({ success: true, user });
};

exports.updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone },
    { new: true, runValidators: true }
  );
  res.json({ success: true, user });
};

exports.changePassword = async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }
  user.password = req.body.newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully' });
};

exports.addAddress = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (req.body.isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }
  user.addresses.push(req.body);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
};

exports.updateAddress = async (req, res) => {
  const user = await User.findById(req.user._id);
  const addr = user.addresses.id(req.params.addressId);
  if (!addr) return res.status(404).json({ success: false, message: 'Address not found' });
  if (req.body.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
  Object.assign(addr, req.body);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
};

exports.deleteAddress = async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses = user.addresses.filter((a) => a._id.toString() !== req.params.addressId);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
};
