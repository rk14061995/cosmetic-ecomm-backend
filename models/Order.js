const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  image: { type: String, default: '' },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  isMysteryBox: { type: Boolean, default: false },
  mysteryBoxTier: String,
});

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderItems: [orderItemSchema],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'cod'],
      required: true,
    },
    paymentResult: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      status: String,
    },
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true, default: 0 },
    discountAmount: { type: Number, default: 0 },
    walletAmountUsed: { type: Number, default: 0 },
    pointsRedeemed: { type: Number, default: 0 },
    pointsRedeemedValue: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    couponCode: String,
    orderStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'],
      default: 'Pending',
    },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    isDelivered: { type: Boolean, default: false },
    deliveredAt: Date,
    trackingNumber: String,
    invoiceNumber: String,
    invoiceUrl: String,
    invoicePublicId: String,
    invoiceGeneratedAt: Date,
    /** Public order reference (e.g. KX-2026-A1B2C3D4). Shown to customers; _id remains the DB primary key. */
    orderNumber: { type: String, trim: true, sparse: true, unique: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

orderSchema.pre('save', async function assignOrderNumber(next) {
  if (this.orderNumber) return next();
  try {
    const { allocateUniqueOrderNumber } = require('../utils/orderNumber');
    this.orderNumber = await allocateUniqueOrderNumber(this.constructor);
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Order', orderSchema);
