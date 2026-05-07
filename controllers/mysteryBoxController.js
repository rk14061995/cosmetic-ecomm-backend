const MysteryBox = require('../models/MysteryBox');
const { uploadImage } = require('../services/cloudinaryService');

exports.getMysteryBoxes = async (req, res) => {
  const boxes = await MysteryBox.find({ isActive: true }).populate('productPool.product', 'name images price');
  res.json({ success: true, mysteryBoxes: boxes });
};

exports.getMysteryBox = async (req, res) => {
  const box = await MysteryBox.findById(req.params.id).populate('productPool.product', 'name images price');
  if (!box) return res.status(404).json({ success: false, message: 'Mystery box not found' });
  res.json({ success: true, mysteryBox: box });
};

exports.createMysteryBox = async (req, res) => {
  const data = { ...req.body };

  if (typeof data.productPool === 'string') data.productPool = JSON.parse(data.productPool);
  if (typeof data.possibleItems === 'string') data.possibleItems = JSON.parse(data.possibleItems);

  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer, 'cosmetic_web/mystery-boxes');
    data.image = uploaded.url;
  }

  const box = await MysteryBox.create(data);
  res.status(201).json({ success: true, mysteryBox: box });
};

exports.updateMysteryBox = async (req, res) => {
  const data = { ...req.body };
  if (typeof data.productPool === 'string') data.productPool = JSON.parse(data.productPool);
  if (typeof data.possibleItems === 'string') data.possibleItems = JSON.parse(data.possibleItems);

  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer, 'cosmetic_web/mystery-boxes');
    data.image = uploaded.url;
  }

  const box = await MysteryBox.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!box) return res.status(404).json({ success: false, message: 'Mystery box not found' });
  res.json({ success: true, mysteryBox: box });
};

exports.deleteMysteryBox = async (req, res) => {
  const box = await MysteryBox.findByIdAndDelete(req.params.id);
  if (!box) return res.status(404).json({ success: false, message: 'Mystery box not found' });
  res.json({ success: true, message: 'Mystery box deleted' });
};

exports.getAllMysteryBoxesAdmin = async (req, res) => {
  const boxes = await MysteryBox.find().populate('productPool.product', 'name images price stock');
  res.json({ success: true, mysteryBoxes: boxes });
};
