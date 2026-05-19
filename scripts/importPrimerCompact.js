/**
 * Import products from the Primer / Compact CSV format.
 *
 * Columns: Sr.No. | Product Name * | Brand * | Selling Price (₹) * |
 *          Discount Price (₹) | Cost Price (₹) | Stock * | Weight |
 *          Category * | Tags (comma-separated) | Short Description |
 *          Full Description * | Ingredients | How to Use
 *
 * Usage:
 *   node scripts/importPrimerCompact.js <path-to-csv> [<path-to-csv2> ...]
 *
 * Example:
 *   node scripts/importPrimerCompact.js \
 *     "../frontend/data/Primer spreadsheet - Sheet1.csv" \
 *     "../frontend/data/Compact spreadsheet - Sheet1.csv"
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { slugify } = require('../utils/helpers');

// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields with embedded commas)
// ---------------------------------------------------------------------------
function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values;
}

function loadCsvRows(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] !== undefined ? cols[i] : ''; });
    return row;
  });
}

// ---------------------------------------------------------------------------
// Column name aliases (strip *, ₹, spaces)
// ---------------------------------------------------------------------------
function col(row, ...keys) {
  for (const k of keys) {
    const found = Object.keys(row).find(
      (rk) => rk.replace(/[*₹\s]/g, '').toLowerCase() === k.replace(/[*₹\s]/g, '').toLowerCase()
    );
    if (found && row[found] !== undefined && String(row[found]).trim() !== '') {
      return String(row[found]).trim();
    }
  }
  return '';
}

function toNum(v, fallback = 0) {
  const n = Number(String(v).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ---------------------------------------------------------------------------
// Build Mongoose document from one CSV row
// ---------------------------------------------------------------------------
function buildDoc(row) {
  const name        = col(row, 'Product Name *', 'ProductName*', 'ProductName');
  const brand       = col(row, 'Brand *', 'Brand');
  const category    = col(row, 'Category *', 'Category');
  const description = col(row, 'Full Description *', 'FullDescription*', 'FullDescription', 'Description');
  const shortDesc   = col(row, 'Short Description', 'ShortDescription');
  const ingredients = col(row, 'Ingredients');
  const howToUse    = col(row, 'How to Use', 'HowtoUse');
  const weight      = col(row, 'Weight');
  const tagsRaw     = col(row, 'Tags (comma-separated)', 'Tags');

  const price         = toNum(col(row, 'Selling Price (₹) *', 'SellingPrice(₹)*', 'SellingPrice'));
  const discountPrice = toNum(col(row, 'Discount Price (₹)', 'DiscountPrice(₹)', 'DiscountPrice'));
  const costPrice     = toNum(col(row, 'Cost Price (₹)', 'CostPrice(₹)', 'CostPrice'));
  const stock         = toNum(col(row, 'Stock *', 'Stock'), 50);

  if (!name || !brand || !category || !price) return null;

  const tags = tagsRaw
    ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const slug = slugify(name);

  const doc = {
    name,
    slug,
    brand,
    category,
    description: description || `${name} by ${brand}.`,
    shortDescription: shortDesc || '',
    price,
    costPrice,
    stock,
    tags,
    ingredients,
    howToUse,
    weight,
    images: [],
    isFeatured: false,
    isNewArrival: true,
    isBestSeller: false,
    isActive: true,
    eligibleForMysteryBox: false,
  };

  if (discountPrice > 0 && discountPrice < price) {
    doc.discountPrice = discountPrice;
  }

  return doc;
}

// ---------------------------------------------------------------------------
// Ensure category exists
// ---------------------------------------------------------------------------
async function ensureCategory(name) {
  if (!name) return;
  const slug = slugify(name);
  await Category.findOneAndUpdate(
    { slug },
    { $setOnInsert: { name, slug, description: `${name} products`, isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  const csvPaths = process.argv.slice(2).map((p) => path.resolve(p));
  if (csvPaths.length === 0) {
    console.error('Usage: node importPrimerCompact.js <file1.csv> [file2.csv] ...');
    process.exit(1);
  }

  for (const p of csvPaths) {
    if (!fs.existsSync(p)) { console.error(`File not found: ${p}`); process.exit(1); }
  }

  await connectDB();

  let totalImported = 0;
  let totalSkipped  = 0;

  for (const csvPath of csvPaths) {
    console.log(`\nProcessing: ${path.basename(csvPath)}`);
    const rows = loadCsvRows(csvPath);

    const categories = [...new Set(rows.map((r) => col(r, 'Category *', 'Category')).filter(Boolean))];
    for (const cat of categories) await ensureCategory(cat);

    let imported = 0;
    let skipped  = 0;

    for (const row of rows) {
      const doc = buildDoc(row);
      if (!doc) { skipped++; continue; }

      // Avoid duplicate slugs from same-name products across CSVs
      let slug = doc.slug;
      const existing = await Product.findOne({ slug });
      if (existing && existing.name.toLowerCase() !== doc.name.toLowerCase()) {
        slug = `${doc.slug}-${doc.brand.toLowerCase().replace(/\s+/g, '-')}`;
        doc.slug = slug;
      }

      await Product.findOneAndUpdate(
        { slug },
        { $set: doc },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      );
      imported++;
    }

    console.log(`  Imported: ${imported}  |  Skipped: ${skipped}`);
    totalImported += imported;
    totalSkipped  += skipped;
  }

  console.log(`\nDone. Total imported: ${totalImported} | Skipped: ${totalSkipped}`);
}

run()
  .catch((err) => {
    console.error('Import failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
