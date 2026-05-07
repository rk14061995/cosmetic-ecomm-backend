const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const giftCardSchema = new mongoose.Schema(
  {
    code:        { type: String, unique: true },
    amount:      { type: Number, required: true },
    balance:     { type: Number },
    purchasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    redeemedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isRedeemed:  { type: Boolean, default: false },
    redeemedAt:  { type: Date },
    expiresAt:   { type: Date },
    recipientEmail: { type: String },
    recipientName:  { type: String },
    message:        { type: String },
  },
  { timestamps: true }
);

giftCardSchema.pre('save', function (next) {
  if (!this.code) this.code = uuidv4().slice(0, 12).toUpperCase().replace(/-/g, '');
  if (this.balance === undefined) this.balance = this.amount;
  if (!this.expiresAt) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    this.expiresAt = d;
  }
  next();
});

module.exports = mongoose.model('GiftCard', giftCardSchema);
