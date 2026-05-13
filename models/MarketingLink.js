const mongoose = require('mongoose');

const CHANNELS = ['instagram', 'whatsapp', 'google_ads', 'web', 'other'];

const marketingLinkSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: CHANNELS,
      required: true,
    },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0, min: 0, max: 9999 },
  },
  { timestamps: true }
);

marketingLinkSchema.index({ channel: 1, sortOrder: 1, createdAt: -1 });

module.exports = mongoose.model('MarketingLink', marketingLinkSchema);
module.exports.CHANNELS = CHANNELS;
