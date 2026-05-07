const mongoose = require('mongoose');

const backInStockAlertSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email:   { type: String, required: true },
    notified:{ type: Boolean, default: false },
    notifiedAt: { type: Date },
  },
  { timestamps: true }
);

backInStockAlertSchema.index({ product: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('BackInStockAlert', backInStockAlertSchema);
