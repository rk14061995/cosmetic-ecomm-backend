const mongoose = require('mongoose');

const mysteryBoxSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    tier: {
      type: String,
      enum: ['basic', 'standard', 'premium'],
      required: true,
    },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    productPool: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        weight: { type: Number, default: 1 },
      },
    ],
    minProducts: { type: Number, default: 3 },
    maxProducts: { type: Number, default: 5 },
    minValue: { type: Number, required: true },
    possibleItems: [
      {
        name: String,
        image: String,
        description: String,
      },
    ],
    stock: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true },
    soldCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MysteryBox', mysteryBoxSchema);
