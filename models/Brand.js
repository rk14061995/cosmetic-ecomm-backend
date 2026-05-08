const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true },
    origin: { type: String, enum: ['indian', 'international'], required: true },
    image: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

brandSchema.index({ name: 1 }, { unique: true });
brandSchema.index({ origin: 1, sortOrder: 1, name: 1 });

module.exports = mongoose.model('Brand', brandSchema);
