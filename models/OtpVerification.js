/**
 * OTP persistence for phone login — DISABLED while MSG91 is off.
 * Uncomment the block below when re-enabling SMS OTP.
 */

// const mongoose = require('mongoose');
//
// const otpVerificationSchema = new mongoose.Schema(
//   {
//     phone: { type: String, required: true, index: true },
//     purpose: { type: String, enum: ['login', 'register', 'checkout'], default: 'login', index: true },
//     otpHash: { type: String, required: true },
//     expiresAt: { type: Date, required: true, index: true },
//     attempts: { type: Number, default: 0 },
//   },
//   { timestamps: true }
// );
//
// otpVerificationSchema.index({ phone: 1, purpose: 1 }, { unique: true });
//
// module.exports = mongoose.model('OtpVerification', otpVerificationSchema);

module.exports = null;
