const mongoose = require('mongoose');

const notificationSettingsSchema = new mongoose.Schema(
  { emails: [{ type: String, trim: true }] },
  { timestamps: true }
);

module.exports = mongoose.model('NotificationSettings', notificationSettingsSchema);
