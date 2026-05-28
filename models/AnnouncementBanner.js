const mongoose = require('mongoose');

const announcementBannerSchema = new mongoose.Schema(
  {
    message:         { type: String, required: true, trim: true, maxlength: 300 },
    bgColor:         { type: String, default: '#4f46e5', trim: true, maxlength: 30 },
    textColor:       { type: String, default: '#ffffff', trim: true, maxlength: 30 },
    linkUrl:         { type: String, trim: true, maxlength: 2048, default: '' },
    linkText:        { type: String, trim: true, maxlength: 60, default: '' },
    isActive:        { type: Boolean, default: true },
    showCloseButton: { type: Boolean, default: true },
    endsAt:          { type: Date, default: null },
    sortOrder:       { type: Number, default: 0, min: 0, max: 9999 },
  },
  { timestamps: true }
);

announcementBannerSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('AnnouncementBanner', announcementBannerSchema);
