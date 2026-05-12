const express = require('express');
const router = express.Router();
const {
  register, login, logout, refreshToken, forgotPassword,
  resetPassword, getMe, updateProfile, changePassword,
  addAddress, updateAddress, deleteAddress,
  sendOtp, verifyOtp,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, registerSchema, loginSchema, sendOtpSchema, verifyOtpSchema } = require('../utils/validators');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
// OTP endpoints are intentionally disabled for now.
// router.post('/send-otp', authLimiter, validate(sendOtpSchema), sendOtp);
// router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/logout', protect, logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', authLimiter, forgotPassword);
router.put('/reset-password/:token', resetPassword);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

router.post('/addresses', protect, addAddress);
router.put('/addresses/:addressId', protect, updateAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);

module.exports = router;
