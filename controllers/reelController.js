const Reel = require('../models/Reel');

const DEFAULT_MYSTERY_REELS = [
  {
    title: 'K-Glow Reveal',
    creator: '@riya.beauty',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&auto=format&fit=crop',
    ctaLink: '/mystery-boxes',
    section: 'mystery-boxes',
    sortOrder: 1,
  },
  {
    title: 'Premium Box Night',
    creator: '@makeupwithaisha',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&auto=format&fit=crop',
    ctaLink: '/mystery-boxes',
    section: 'mystery-boxes',
    sortOrder: 2,
  },
  {
    title: 'Best of Seoul Haul',
    creator: '@kbeauty.diaries',
    image: 'https://images.unsplash.com/photo-1526045478516-99145907023c?w=1200&auto=format&fit=crop',
    ctaLink: '/mystery-boxes',
    section: 'mystery-boxes',
    sortOrder: 3,
  },
  {
    title: 'Skincare Surprise',
    creator: '@glowbymegha',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1200&auto=format&fit=crop',
    ctaLink: '/mystery-boxes',
    section: 'mystery-boxes',
    sortOrder: 4,
  },
];

const seedDefaultReelsIfNeeded = async () => {
  const count = await Reel.countDocuments({ section: 'mystery-boxes' });
  if (count > 0) return;
  await Reel.insertMany(DEFAULT_MYSTERY_REELS.map((r) => ({ ...r, isActive: true })));
};

exports.getReels = async (req, res) => {
  await seedDefaultReelsIfNeeded();
  const { includeInactive, section = 'mystery-boxes' } = req.query;
  const query = { section };
  if (includeInactive !== 'true') query.isActive = true;

  const reels = await Reel.find(query).sort({ sortOrder: 1, createdAt: -1 });
  res.json({ success: true, reels });
};

exports.createReel = async (req, res) => {
  const reel = await Reel.create(req.body);
  res.status(201).json({ success: true, reel });
};

exports.updateReel = async (req, res) => {
  const reel = await Reel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
  res.json({ success: true, reel });
};

exports.deleteReel = async (req, res) => {
  const reel = await Reel.findById(req.params.id);
  if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
  await reel.deleteOne();
  res.json({ success: true, message: 'Reel deleted' });
};
