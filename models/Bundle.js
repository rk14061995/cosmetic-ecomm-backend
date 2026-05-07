const mongoose = require('mongoose');

const bundleSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    products: [
      {
        product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, default: 1 },
      },
    ],
    originalPrice: { type: Number, required: true },
    bundlePrice:   { type: Number, required: true },
    image:         { type: String },
    isActive:      { type: Boolean, default: true },
    stock:         { type: Number, default: 999 },
    tag:           { type: String },
  },
  { timestamps: true }
);

bundleSchema.virtual('discountPercent').get(function () {
  return Math.round(((this.originalPrice - this.bundlePrice) / this.originalPrice) * 100);
});

module.exports = mongoose.model('Bundle', bundleSchema);
