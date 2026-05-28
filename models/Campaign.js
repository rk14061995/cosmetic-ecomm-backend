const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true, maxlength: 120 },
    subject:     { type: String, required: true, trim: true, maxlength: 200 },
    previewText: { type: String, trim: true, maxlength: 200, default: '' },
    htmlBody:    { type: String, required: true },
    segment: {
      type: String,
      enum: ['all', 'customers', 'subscribers', 'abandoned_cart', 'specific'],
      default: 'all',
    },
    // Additional filters applied on top of the base segment (ignored when segment=specific)
    filters: {
      loyaltyTiers:       { type: [String], default: [] },   // [] = no filter
      acquisitionSources: { type: [String], default: [] },   // [] = no filter
      minOrders:          { type: Number, default: 0 },      // 0 = no minimum
      joinedAfter:        { type: Date,   default: null },
      joinedBefore:       { type: Date,   default: null },
    },
    // When segment='specific' these are the exact recipients
    specificUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['draft', 'sending', 'sent', 'failed'],
      default: 'draft',
    },
    sentAt:         { type: Date, default: null },
    recipientCount: { type: Number, default: 0 },
    failedCount:    { type: Number, default: 0 },
    errorMessage:   { type: String, default: '' },
    scheduledAt:    { type: Date, default: null },
    createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', campaignSchema);
