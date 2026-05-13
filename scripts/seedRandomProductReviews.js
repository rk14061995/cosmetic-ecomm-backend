/**
 * Replace reviews on products with random demo reviews (rating 4.0–5.0).
 * Uses a pool of synthetic users (valid ObjectIds) so the Product schema stays valid.
 *
 * Usage:
 *   node scripts/seedRandomProductReviews.js
 * Env:
 *   MONGODB_URI (required)
 *   REVIEWS_ONLY_ACTIVE=1   (default) only isActive products; set REVIEWS_ALL_PRODUCTS=1 for every product
 *   REVIEWS_PER_PRODUCT=6   fixed count per product (default 6); or set REVIEWS_MIN / REVIEWS_MAX for a range
 *
 * When required from keepRecentProductsAndKoreanBrand.js, mongoose is already connected.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');

const DUMMY_PASSWORD = 'ReviewSeed!0NeverLogin';

const REVIEW_COMMENTS = [
  'Love this — absorbs quickly and no breakouts.',
  'Holy grail for my combination skin. Repurchasing.',
  'Subtle glow after two weeks. Worth the price.',
  'Packaging is gorgeous and the product works as advertised.',
  'My skin feels softer; partner noticed too.',
  'Great under makeup, no pilling.',
  'Authentic feel; smells fresh and mild.',
  'Visible difference in texture within a week.',
  'Gentle enough for sensitive skin.',
  'Hydrating without feeling greasy.',
  'Perfect for my AM routine.',
  'Nice finish — not too matte, not shiny.',
  'Works well in humid weather.',
  'Gifted one to my sister; she loves it too.',
  'Five stars for value and results.',
  'Texture is lovely; a little goes a long way.',
  'No irritation; will buy again.',
  'Exactly what I hoped for from this brand.',
  'Brightens dull areas nicely.',
  'Feels premium; delivery was quick.',
];

const DISPLAY_NAMES = [
  'Priya S.',
  'Ananya R.',
  'Meera K.',
  'Sneha D.',
  'Riya P.',
  'Kavya M.',
  'Isha T.',
  'Neha V.',
  'Aditi L.',
  'Tanvi G.',
  'Shreya N.',
  'Divya J.',
  'Pooja H.',
  'Aishwarya B.',
  'Sonal C.',
];

function randomRatingFourToFive() {
  const r = 4 + Math.random();
  return Math.min(5, Math.round(r * 10) / 10);
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickComment() {
  return REVIEW_COMMENTS[randomInt(0, REVIEW_COMMENTS.length - 1)];
}

function pickDisplayName() {
  return DISPLAY_NAMES[randomInt(0, DISPLAY_NAMES.length - 1)];
}

async function ensureSeedUsers(poolSize) {
  const users = [];
  for (let i = 0; i < poolSize; i++) {
    const email = `review_seed_${i}@internal.kosmeticx`;
    let u = await User.findOne({ email }).select('_id name email');
    if (!u) {
      u = await User.create({
        name: `Seed Reviewer ${i + 1}`,
        email,
        password: DUMMY_PASSWORD,
        role: 'user',
      });
    }
    users.push(u);
  }
  return users;
}

/**
 * @param {object} opts
 * @param {boolean} [opts.onlyActive=true]
 * @param {number} [opts.reviewsPerProduct] fixed count; overrides min/max
 * @param {number} [opts.reviewsMin=4]
 * @param {number} [opts.reviewsMax=8]
 */
async function seedRandomProductReviews(opts = {}) {
  const onlyActive = opts.onlyActive !== false && process.env.REVIEWS_ALL_PRODUCTS !== '1';

  const reviewsMin = Math.max(1, parseInt(process.env.REVIEWS_MIN, 10) || 4);
  const reviewsMax = Math.max(reviewsMin, parseInt(process.env.REVIEWS_MAX, 10) || 8);

  let fixedPerProduct = opts.reviewsPerProduct;
  if (fixedPerProduct == null && process.env.REVIEWS_PER_PRODUCT) {
    fixedPerProduct = Math.max(1, parseInt(process.env.REVIEWS_PER_PRODUCT, 10) || 6);
  }

  const query = onlyActive ? { isActive: true } : {};
  const products = await Product.find(query).select('_id name reviews');

  if (products.length === 0) {
    console.log('seedRandomProductReviews: no products matched query', query);
    return { products: 0, reviewsWritten: 0 };
  }

  const poolSize = Math.max(35, reviewsMax + 10);
  const userPool = await ensureSeedUsers(poolSize);

  let reviewsWritten = 0;

  for (const product of products) {
    const n =
      fixedPerProduct != null && !Number.isNaN(fixedPerProduct)
        ? fixedPerProduct
        : randomInt(reviewsMin, reviewsMax);

    const reviewers = shuffle(userPool).slice(0, Math.min(n, userPool.length));
    if (reviewers.length < n) {
      console.warn(
        `Product ${product._id}: wanted ${n} reviews but only ${reviewers.length} unique seed users; using ${reviewers.length}.`
      );
    }

    product.reviews = [];
    for (const u of reviewers) {
      product.reviews.push({
        user: u._id,
        name: pickDisplayName(),
        rating: randomRatingFourToFive(),
        comment: pickComment(),
        verified: Math.random() < 0.35,
      });
    }

    await product.save();
    reviewsWritten += product.reviews.length;
  }

  console.log(
    `seedRandomProductReviews: updated ${products.length} product(s), ${reviewsWritten} review(s) (ratings 4.0–5.0).`
  );
  return { products: products.length, reviewsWritten };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  const already = mongoose.connection.readyState === 1;
  if (!already) await mongoose.connect(process.env.MONGODB_URI);

  try {
    await seedRandomProductReviews({ onlyActive: process.env.REVIEWS_ALL_PRODUCTS !== '1' });
  } finally {
    if (!already) await mongoose.disconnect();
  }
}

module.exports = { seedRandomProductReviews };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
