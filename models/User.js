const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const addressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: String,
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, trim: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isBlocked: { type: Boolean, default: false },
    addresses: [addressSchema],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    wallet: { type: Number, default: 0 },
    referralCode: { type: String, unique: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    loyaltyPoints: { type: Number, default: 0 },
    loyaltyTier: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Platinum'], default: 'Bronze' },
    giftCardBalance: { type: Number, default: 0 },
    affiliateCode: { type: String, unique: true, sparse: true },
    affiliateEarnings: { type: Number, default: 0 },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    refreshToken: String,
    acquisitionSource: { type: String, default: '', trim: true, maxlength: 40 },
    acquisitionMedium: { type: String, default: '', trim: true, maxlength: 80 },
    acquisitionCampaign: { type: String, default: '', trim: true, maxlength: 120 },
    acquisitionLandingPath: { type: String, default: '', maxlength: 500 },
    acquisitionCapturedAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.pre('save', function (next) {
  if (!this.referralCode) {
    this.referralCode = uuidv4().slice(0, 8).toUpperCase();
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ email: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ acquisitionSource: 1 });

module.exports = mongoose.model('User', userSchema);
