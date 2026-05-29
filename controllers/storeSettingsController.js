const StoreSettings = require('../models/StoreSettings');

exports.getPublicSettings = async (req, res) => {
  const settings = await StoreSettings.getSingleton();
  res.json({ acceptingOrders: settings.acceptingOrders, pauseMessage: settings.pauseMessage });
};

exports.getSettings = async (req, res) => {
  const settings = await StoreSettings.getSingleton();
  res.json({ settings });
};

exports.updateSettings = async (req, res) => {
  const { acceptingOrders, pauseMessage } = req.body;
  const settings = await StoreSettings.getSingleton();

  if (typeof acceptingOrders === 'boolean') settings.acceptingOrders = acceptingOrders;
  if (typeof pauseMessage === 'string') settings.pauseMessage = pauseMessage.trim().slice(0, 500);

  await settings.save();
  res.json({ success: true, settings });
};
