const AnnouncementBanner = require('../models/AnnouncementBanner');

// Public: returns the first active, non-expired banner
exports.getPublicBanner = async (req, res) => {
  const now = new Date();
  const banner = await AnnouncementBanner.findOne({
    isActive: true,
    $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
  }).sort({ sortOrder: 1, createdAt: -1 });
  res.json({ banner: banner || null });
};

// Admin: list all banners
exports.getBanners = async (req, res) => {
  const banners = await AnnouncementBanner.find().sort({ sortOrder: 1, createdAt: -1 });
  res.json({ banners });
};

// Admin: create
exports.createBanner = async (req, res) => {
  const banner = await AnnouncementBanner.create(req.body);
  res.status(201).json({ banner });
};

// Admin: update
exports.updateBanner = async (req, res) => {
  const banner = await AnnouncementBanner.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!banner) return res.status(404).json({ message: 'Banner not found' });
  res.json({ banner });
};

// Admin: delete
exports.deleteBanner = async (req, res) => {
  const banner = await AnnouncementBanner.findByIdAndDelete(req.params.id);
  if (!banner) return res.status(404).json({ message: 'Banner not found' });
  res.json({ message: 'Deleted' });
};
