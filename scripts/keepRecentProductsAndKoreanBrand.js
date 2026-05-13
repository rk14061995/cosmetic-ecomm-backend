/**
 * One-off: set isActive=true only for the 6 most recently created products;
 * set isActive=false for all other products.
 * Brands: isActive=true only for name "Korean Brand" (case-insensitive); others false.
 *
 * Usage: node scripts/keepRecentProductsAndKoreanBrand.js
 * Optional: SEED_REVIEWS=true — after catalog changes, run seedRandomProductReviews on active products
 * Requires: MONGODB_URI in .env (or environment)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const { slugify } = require('../utils/helpers');

const RECENT_COUNT = 6;
const BRAND_KEEP_REGEX = /^korean brand$/i;
const KOREAN_BRAND_NAME = 'Korean Brand';
/** Placeholder logo when the document is created by this script */
const KOREAN_BRAND_IMAGE =
  process.env.KOREAN_BRAND_IMAGE_URL ||
  'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80';

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const recent = await Product.find()
    .sort({ createdAt: -1 })
    .limit(RECENT_COUNT)
    .select('_id name createdAt')
    .lean();

  const keepIds = recent.map((p) => p._id);

  const activeRes = await Product.updateMany({ _id: { $in: keepIds } }, { $set: { isActive: true } });
  const inactiveRes = await Product.updateMany({ _id: { $nin: keepIds } }, { $set: { isActive: false } });

  let korean = await Brand.findOne({ name: BRAND_KEEP_REGEX }).select('name isActive slug').lean();
  if (!korean) {
    await Brand.create({
      name: KOREAN_BRAND_NAME,
      slug: slugify(KOREAN_BRAND_NAME),
      origin: 'international',
      image: KOREAN_BRAND_IMAGE,
      isActive: true,
      sortOrder: 0,
    });
    korean = await Brand.findOne({ name: BRAND_KEEP_REGEX }).select('name isActive slug').lean();
    console.log('Created brand document:', KOREAN_BRAND_NAME);
  }

  const brandOnRes = await Brand.updateMany({ name: BRAND_KEEP_REGEX }, { $set: { isActive: true } });
  const brandOffRes = await Brand.updateMany({ name: { $not: BRAND_KEEP_REGEX } }, { $set: { isActive: false } });

  console.log('Products kept active (last ' + RECENT_COUNT + ' by createdAt):', recent.length);
  recent.forEach((p, i) => console.log(`  ${i + 1}. ${p.name} (${p._id})`));
  console.log('Product updateMany → active:', activeRes.modifiedCount, 'matched:', activeRes.matchedCount);
  console.log('Product updateMany → inactive:', inactiveRes.modifiedCount, 'matched:', inactiveRes.matchedCount);
  console.log('Korean Brand row:', korean);
  console.log('Brand updateMany → active:', brandOnRes.modifiedCount);
  console.log('Brand updateMany → inactive:', brandOffRes.modifiedCount);

  if (process.env.SEED_REVIEWS === 'true') {
    const { seedRandomProductReviews } = require('./seedRandomProductReviews');
    await seedRandomProductReviews({ onlyActive: true });
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
