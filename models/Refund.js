const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: { type: String, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    method: { type: String, enum: ['wallet', 'bank', 'razorpay', 'other'], default: 'wallet' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'processed'], default: 'pending' },
    adminNote: { type: String, trim: true },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Refund', refundSchema);
