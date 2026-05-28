const Coupon = require('../models/Coupon');

exports.getPublicCoupons = async (req, res) => {
  const { context } = req.query;
  const query = { isActive: true, expiryDate: { $gt: new Date() } };
  if (context) query.displayContext = context;
  const coupons = await Coupon.find(query, 'code description discountType discountValue maxDiscountAmount minOrderValue expiryDate displayContext').sort({ createdAt: -1 });
  res.json({ success: true, coupons });
};

exports.createCoupon = async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, coupon });
};

exports.getCoupons = async (req, res) => {
  const { active } = req.query;
  const query = {};
  if (active !== undefined) query.isActive = active === 'true';

  const coupons = await Coupon.find(query).sort({ createdAt: -1 });
  res.json({ success: true, coupons });
};

exports.getCoupon = async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
  res.json({ success: true, coupon });
};

exports.updateCoupon = async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
  res.json({ success: true, coupon });
};

exports.deleteCoupon = async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
  res.json({ success: true, message: 'Coupon deleted' });
};

exports.validateCoupon = async (req, res) => {
  const { code, orderAmount } = req.body;
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (!coupon) return res.status(404).json({ success: false, message: 'Invalid coupon code' });

  const validity = coupon.isValid();
  if (!validity.valid) return res.status(400).json({ success: false, message: validity.message });

  const alreadyUsed = coupon.usedBy.some((id) => id.toString() === req.user._id.toString());
  if (alreadyUsed) return res.status(400).json({ success: false, message: 'You have already used this coupon' });

  if (orderAmount < coupon.minOrderValue) {
    return res.status(400).json({
      success: false,
      message: `Minimum order value ₹${coupon.minOrderValue} required`,
    });
  }

  const discount = coupon.calculateDiscount(orderAmount);
  res.json({
    success: true,
    discount,
    coupon: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue },
  });
};
