const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema(
  {
    acceptingOrders: { type: Boolean, default: true },
    pauseMessage: {
      type: String,
      default: 'We are currently not accepting new orders. We appreciate your patience and will be back shortly. Thank you for your understanding.',
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Always a single document — enforce singleton via static method
storeSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
