require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { slugify } = require('../utils/helpers');

const revalidateProducts = () => {
  const siteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) { console.log('REVALIDATE_SECRET not set — skipping cache bust'); return Promise.resolve(); }

  const url = new URL('/api/revalidate', siteUrl);
  const body = JSON.stringify({ tags: ['products'] });
  const lib = url.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const req = lib.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret, 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (res.statusCode === 200) console.log('Cache busted — homepage will show fresh product count');
        else console.warn(`Revalidate responded ${res.statusCode}: ${data}`);
        resolve();
      });
    });
    req.on('error', (e) => { console.warn('Revalidate request failed:', e.message); resolve(); });
    req.write(body);
    req.end();
  });
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600';

const CSV_FILES = [
  '/var/www/html/learning/cosmetic-ecomm/data/Eye Shadow spreadsheet - Sheet1.csv',
  '/var/www/html/learning/cosmetic-ecomm/data/Eyeliner spreadsheet - Sheet1.csv',
  '/var/www/html/learning/cosmetic-ecomm/data/Kajal spreadsheet - Sheet1.csv',
  '/var/www/html/learning/cosmetic-ecomm/data/LIP spreadsheet - Sheet1.csv',
  '/var/www/html/learning/cosmetic-ecomm/data/Lip Liner spreadsheet - Sheet1.csv',
];

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
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
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const item = {};
    headers.forEach((h, i) => { item[h] = cols[i] !== undefined ? cols[i] : ''; });
    return item;
  });
};

const toNumber = (v, fallback = 0) => {
  const n = Number(String(v).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const buildProductDoc = (row) => {
  const name = String(row['Product Name *'] || '').trim();
  const brand = String(row['Brand *'] || '').trim();
  const category = String(row['Category *'] || '').trim();
  const description = String(row['Full Description *'] || '').trim();
  const shortDescription = String(row['Short Description'] || '').trim();
  const ingredients = String(row['Ingredients'] || '').trim();
  const howToUse = String(row['How to Use'] || '').trim();
  const weight = String(row['Weight'] || '').trim();
  const tagsRaw = String(row['Tags (comma-separated)'] || '').trim();

  const price = toNumber(row['Selling Price (₹) *'], 0);
  const discountPrice = toNumber(row['Discount Price (₹)'], 0);
  const costPrice = toNumber(row['Cost Price (₹)'], 0);
  const stock = toNumber(row['Stock *'], 0);

  const tags = tagsRaw
    ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const doc = {
    name,
    slug: slugify(`${name}-${brand}`),
    description: description || `${name} by ${brand}.`,
    shortDescription: shortDescription || name,
    price,
    stock,
    category,
    brand,
    images: [{ url: DEFAULT_IMAGE }],
    tags,
    ingredients,
    howToUse,
    weight,
    isFeatured: false,
    isNewArrival: true,
    isBestSeller: false,
    isActive: true,
    eligibleForMysteryBox: false,
  };

  if (discountPrice > 0 && discountPrice < price) doc.discountPrice = discountPrice;
  if (costPrice > 0) doc.costPrice = costPrice;

  return doc;
};

const ensureCategory = async (name) => {
  if (!name) return;
  const slug = slugify(name);
  await Category.findOneAndUpdate(
    { slug },
    { $setOnInsert: { name, slug, description: `${name} essentials`, isActive: true } },
    { upsert: true, new: true }
  );
};

const run = async () => {
  const argFiles = process.argv.slice(2);
  const filePaths = argFiles.length ? argFiles.map((f) => path.resolve(f)) : CSV_FILES;

  await connectDB();

  let totalProducts = 0;
  let totalSkipped = 0;

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping missing file: ${filePath}`);
      continue;
    }

    const rows = loadCsvRows(filePath);
    console.log(`\nProcessing: ${path.basename(filePath)} (${rows.length} rows)`);

    const categories = [...new Set(rows.map((r) => String(r['Category *'] || '').trim()).filter(Boolean))];
    for (const cat of categories) await ensureCategory(cat);

    for (const row of rows) {
      const doc = buildProductDoc(row);
      if (!doc.name || !doc.brand || !doc.category || !doc.price) {
        totalSkipped++;
        continue;
      }
      await Product.findOneAndUpdate(
        { slug: doc.slug },
        { $set: doc },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      );
      totalProducts++;
      console.log(`  + ${doc.name} (${doc.brand}) — ₹${doc.price}`);
    }
  }

  console.log(`\nDone. Imported: ${totalProducts}, Skipped: ${totalSkipped}`);
  await revalidateProducts();
};

run()
  .catch((err) => {
    console.error('Import failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
