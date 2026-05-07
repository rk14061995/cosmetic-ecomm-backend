const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tier:      { type: String, enum: ['basic', 'standard', 'premium'], required: true },
    price:     { type: Number, required: true },
    status:    { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' },
    nextBillingDate: { type: Date, required: true },
    billingHistory: [
      {
        date:    { type: Date, default: Date.now },
        amount:  Number,
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      },
    ],
    shippingAddress: {
      fullName:     String,
      phone:        String,
      addressLine1: String,
      addressLine2: String,
      city:         String,
      state:        String,
      pincode:      String,
    },
    cancelledAt: Date,
    pausedAt:    Date,
  },
  { timestamps: true }
);

const TIER_PRICES = { basic: 449, standard: 899, premium: 1799 };
subscriptionSchema.statics.TIER_PRICES = TIER_PRICES;

module.exports = mongoose.model('Subscription', subscriptionSchema);
