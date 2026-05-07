const mongoose = require('mongoose');

const affiliateSchema = new mongoose.Schema(
  {
    user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    code:        { type: String, required: true, unique: true, uppercase: true },
    commissionRate: { type: Number, default: 10 },
    status:      { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
    totalClicks: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalEarnings:{ type: Number, default: 0 },
    pendingPayout:{ type: Number, default: 0 },
    paidOut:      { type: Number, default: 0 },
    referrals: [
      {
        order:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        amount:   Number,
        commission:Number,
        date:     { type: Date, default: Date.now },
        status:   { type: String, enum: ['pending', 'confirmed', 'paid'], default: 'pending' },
      },
    ],
    payoutMethod: { type: String, enum: ['bank', 'upi', 'wallet'], default: 'wallet' },
    payoutDetails: { type: String },
    bio:          { type: String },
    socialLinks:  {
      instagram: String,
      youtube:   String,
      website:   String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Affiliate', affiliateSchema);
