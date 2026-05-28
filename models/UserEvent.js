const mongoose = require('mongoose');

const userEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'cart_add', 'cart_remove', 'cart_update', 'cart_cleared',
        'coupon_applied', 'coupon_removed', 'order_placed',
      ],
      required: true,
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

userEventSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('UserEvent', userEventSchema);
