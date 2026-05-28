const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: String,
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscountAmount: { type: Number },
    minOrderValue: { type: Number, default: 0 },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    applicableCategories: [String],
    displayContext: {
      type: [String],
      enum: ['product_page', 'mystery_box', 'sale', 'cart', 'hidden'],
      default: ['product_page'],
    },
  },
  { timestamps: true }
);

couponSchema.methods.isValid = function () {
  const now = new Date();
  if (!this.isActive) return { valid: false, message: 'Coupon is inactive' };
  if (this.expiryDate < now) return { valid: false, message: 'Coupon has expired' };
  if (this.usageLimit && this.usedCount >= this.usageLimit)
    return { valid: false, message: 'Coupon usage limit reached' };
  return { valid: true };
};

couponSchema.methods.calculateDiscount = function (orderAmount) {
  if (orderAmount < this.minOrderValue) return 0;
  if (this.discountType === 'flat') return Math.min(this.discountValue, orderAmount);
  const discount = (orderAmount * this.discountValue) / 100;
  if (this.maxDiscountAmount) return Math.min(discount, this.maxDiscountAmount);
  return discount;
};

couponSchema.index({ code: 1 });
couponSchema.index({ expiryDate: 1, isActive: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
