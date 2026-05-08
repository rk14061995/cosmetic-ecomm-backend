const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    creator: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    ctaLink: { type: String, default: '/mystery-boxes' },
    section: { type: String, default: 'mystery-boxes', trim: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

reelSchema.index({ section: 1, isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Reel', reelSchema);
