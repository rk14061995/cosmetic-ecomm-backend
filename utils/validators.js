const Joi = require('joi');

exports.registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
  referralCode: Joi.string().optional(),
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

exports.productSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  slug: Joi.string().optional(),
  description: Joi.string().min(10).required(),
  shortDescription: Joi.string().max(300).optional(),
  price: Joi.number().positive().required(),
  discountPrice: Joi.number().positive().optional(),
  category: Joi.string()
    .valid('Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Body Care', 'Tools & Accessories')
    .required(),
  brand: Joi.string().required(),
  stock: Joi.number().min(0).required(),
  tags: Joi.array().items(Joi.string()).optional(),
  ingredients: Joi.string().optional(),
  howToUse: Joi.string().optional(),
  weight: Joi.string().optional(),
  isFeatured: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  eligibleForMysteryBox: Joi.boolean().optional(),
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

exports.validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return res.status(400).json({ success: false, message });
  }
  next();
};
