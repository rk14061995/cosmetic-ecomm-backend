/**
 * Import script for "Foundation List - Sheet1.csv"
 *
 * CSV columns expected (header row):
 *   Sr.No., Product Name *, Brand *, Selling Price (₹) *, Discount Price (₹),
 *   Cost Price (₹), Stock *, Weight, Category *, Tags (comma-separated),
 *   Short Description, Full Description *, Ingredients, How to Use
 *
 * Usage:
 *   node scripts/importFoundationList.js
 *   node scripts/importFoundationList.js /path/to/other.csv
 *
 * Behaviour:
 *   - Upserts by slug (name + brand), so re-running is safe.
 *   - Ensures the Category document exists (upsert).
 *   - Skips rows missing name, brand, category, or selling price.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { slugify } = require('../utils/helpers');

const DEFAULT_CSV_PATH = path.resolve(
  __dirname,
  '../../cosmetic-ecomm/data/Foundation List - Sheet1.csv',
);

// ---------------------------------------------------------------------------
// CSV parser — handles quoted fields and embedded commas
// ---------------------------------------------------------------------------
const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values;
};

const loadCsvRows = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^﻿/, ''); // strip BOM
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] !== undefined ? cols[i] : ''; });
    return row;
  });
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const toNumber = (v, fallback = 0) => {
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : fallback;
};

const col = (row, ...keys) => {
  for (const k of keys) {
    const v = String(row[k] || '').trim();
    if (v) return v;
  }
  return '';
};

// ---------------------------------------------------------------------------
// Map a CSV row to a Product document
// ---------------------------------------------------------------------------
const buildProductDoc = (row) => {
  const name       = col(row, 'Product Name *', 'Product Name');
  const brand      = col(row, 'Brand *', 'Brand');
  const category   = col(row, 'Category *', 'Category');
  const fullDesc   = col(row, 'Full Description *', 'Full Description');
  const shortDesc  = col(row, 'Short Description');
  const tags       = col(row, 'Tags (comma-separated)', 'Tags')
    .split(',').map((t) => t.trim()).filter(Boolean);
  const ingredients = col(row, 'Ingredients');
  const howToUse   = col(row, 'How to Use');
  const weight     = col(row, 'Weight');

  const sellingPrice  = toNumber(col(row, 'Selling Price (₹) *', 'Selling Price'));
  const discountPrice = toNumber(col(row, 'Discount Price (₹)', 'Discount Price'), NaN);
  const costPrice     = toNumber(col(row, 'Cost Price (₹)', 'Cost Price'), NaN);
  const stock         = toNumber(col(row, 'Stock *', 'Stock'), 0);

  const slug = slugify(`${name}-${brand}`);

  const doc = {
    name,
    brand,
    category,
    slug,
    description: fullDesc || shortDesc || `${name} by ${brand}`,
    shortDescription: shortDesc || fullDesc.slice(0, 180) || '',
    price: sellingPrice,
    stock,
    tags,
    ingredients,
    howToUse,
    weight,
    images: [{ url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600' }],
    isActive: true,
    isFeatured: false,
    isNewArrival: true,
    isBestSeller: false,
    eligibleForMysteryBox: false,
  };

  if (Number.isFinite(discountPrice) && discountPrice > 0 && discountPrice < sellingPrice) {
    doc.discountPrice = discountPrice;
  }
  if (Number.isFinite(costPrice) && costPrice > 0) {
    doc.costPrice = costPrice;
  }

  return doc;
};

// ---------------------------------------------------------------------------
// Ensure category row exists
// ---------------------------------------------------------------------------
const ensureCategory = async (categoryName) => {
  const name = String(categoryName || '').trim();
  if (!name) return;
  const slug = slugify(name);
  await Category.findOneAndUpdate(
    { slug },
    { $setOnInsert: { name, slug, isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const run = async () => {
  const csvPathArg = process.argv[2];
  const csvPath = csvPathArg ? path.resolve(csvPathArg) : DEFAULT_CSV_PATH;

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exitCode = 1;
    return;
  }

  const rows = loadCsvRows(csvPath);
  if (rows.length === 0) {
    console.log('No data rows found — check the CSV header.');
    return;
  }

  console.log(`Loaded ${rows.length} row(s) from: ${csvPath}`);
  await connectDB();

  // Ensure categories first
  const uniqueCategories = [...new Set(
    rows.map((r) => col(r, 'Category *', 'Category')).filter(Boolean),
  )];
  for (const cat of uniqueCategories) {
    await ensureCategory(cat);
    console.log(`  [category] ensured: ${cat}`);
  }

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const doc = buildProductDoc(row);

    if (!doc.name || !doc.brand || !doc.category || !doc.price) {
      const srNo = col(row, 'Sr.No.') || '?';
      console.warn(`  [skip] row ${srNo} — missing required field (name/brand/category/price)`);
      skipped += 1;
      continue;
    }

    await Product.findOneAndUpdate(
      { slug: doc.slug },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    );

    console.log(`  [ok] ${doc.name} (${doc.brand}) — ₹${doc.price}`);
    imported += 1;
  }

  console.log(`\nDone. Imported/updated: ${imported}  |  Skipped: ${skipped}`);
};

run()
  .catch((err) => {
    console.error('Import failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
