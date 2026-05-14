const Joi = require('joi');

exports.registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
  referralCode: Joi.string().allow('').optional(),
  attribution: Joi.object({
    source: Joi.string().max(80).required(),
    medium: Joi.string().max(120).allow('').optional(),
    campaign: Joi.string().max(160).allow('').optional(),
    landingPath: Joi.string().max(500).allow('').optional(),
    capturedAt: Joi.string().max(40).allow('').optional(),
  }).optional(),
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// ─── MSG91 / phone OTP (disabled) ───────────────────────────────────────────
// exports.sendOtpSchema = Joi.object({
//   phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
//   purpose: Joi.string().valid('login', 'register', 'checkout').optional(),
// });
//
// exports.verifyOtpSchema = Joi.object({
//   phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
//   otp: Joi.string().pattern(/^\d{4,8}$/).required(),
//   purpose: Joi.string().valid('login', 'register', 'checkout').optional(),
// });

exports.productSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  slug: Joi.string().optional(),
  description: Joi.string().min(10).required(),
  shortDescription: Joi.string().max(300).optional(),
  price: Joi.number().positive().required(),
  discountPrice: Joi.number().positive().optional(),
  category: Joi.string().min(2).max(100).required(),
  brand: Joi.string().required(),
  stock: Joi.number().min(0).required(),
  tags: Joi.array().items(Joi.string()).optional(),
  ingredients: Joi.string().optional(),
  howToUse: Joi.string().optional(),
  weight: Joi.string().optional(),
  isFeatured: Joi.boolean().optional(),
  isNewArrival: Joi.boolean().optional(),
  isBestSeller: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  eligibleForMysteryBox: Joi.boolean().optional(),
  virtualTryOn: Joi.boolean().optional(),
  tryOnTintHex: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .allow(''),
});

exports.couponSchema = Joi.object({
  code: Joi.string().alphanum().min(3).max(20).required(),
  description: Joi.string().optional(),
  discountType: Joi.string().valid('percentage', 'flat').required(),
  discountValue: Joi.number().positive().required(),
  maxDiscountAmount: Joi.number().positive().optional(),
  minOrderValue: Joi.number().min(0).optional(),
  usageLimit: Joi.number().positive().optional().allow(null),
  perUserLimit: Joi.number().positive().optional(),
  expiryDate: Joi.date().greater('now').required(),
  isActive: Joi.boolean().optional(),
  applicableCategories: Joi.array().items(Joi.string()).optional(),
});

const marketingChannel = Joi.string().valid('instagram', 'whatsapp', 'google_ads', 'web', 'other');

exports.marketingLinkSchema = Joi.object({
  channel: marketingChannel.required(),
  label: Joi.string().min(1).max(120).required(),
  url: Joi.string()
    .trim()
    .max(2048)
    .pattern(/^https?:\/\/.+/i)
    .required(),
  notes: Joi.string().max(500).allow('').optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).max(9999).optional(),
});

exports.marketingLinkUpdateSchema = Joi.object({
  channel: marketingChannel.optional(),
  label: Joi.string().min(1).max(120).optional(),
  url: Joi.string()
    .trim()
    .max(2048)
    .pattern(/^https?:\/\/.+/i)
    .optional(),
  notes: Joi.string().max(500).allow('').optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).max(9999).optional(),
}).min(1);

exports.orderSchema = Joi.object({
  orderItems: Joi.array()
    .items(
      Joi.object({
        product: Joi.string().optional(),
        mysteryBox: Joi.string().optional(),
        itemType: Joi.string().valid('product', 'mysteryBox').required(),
        quantity: Joi.number().positive().required(),
      })
    )
    .min(1)
    .required(),
  shippingAddress: Joi.object({
    fullName: Joi.string().required(),
    phone: Joi.string().required(),
    addressLine1: Joi.string().required(),
    addressLine2: Joi.string().optional(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    pincode: Joi.string().pattern(/^\d{6}$/).required(),
  }).required(),
  paymentMethod: Joi.string().valid('razorpay', 'cod').required(),
  couponCode: Joi.string().optional(),
  walletAmountUsed: Joi.number().min(0).optional(),
});

exports.createRazorpayOrderSchema = Joi.object({
  orderId: Joi.string().length(24).hex().required(),
});

exports.verifyPaymentSchema = Joi.object({
  orderId: Joi.string().length(24).hex().required(),
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required(),
});

exports.validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return res.status(400).json({ success: false, message });
  }
  next();
};
