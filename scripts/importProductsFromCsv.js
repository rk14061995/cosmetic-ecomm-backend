require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { slugify } = require('../utils/helpers');

const DEFAULT_CSV_PATH = '/var/www/html/learning/cosmetic-ecomm/data/product - product.csv.csv';

const CATEGORY_DESCRIPTION_MAP = {
  skincare: 'Daily skin essentials',
  'face makeup': 'Base and complexion makeup',
  'lip makeup': 'Lip colors and lip care picks',
  'eye makeup': 'Eye-defining makeup essentials',
  'makeup accessories': 'Tools and accessories for makeup',
};

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

const normalizeUrl = (url) => {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const loadCsvRows = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const item = {};
    headers.forEach((header, idx) => {
      item[header] = cols[idx] !== undefined ? cols[idx] : '';
    });
    return item;
  });
  return rows;
};

const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const buildProductDoc = (row) => {
  const productId = String(row['Product ID'] || '').trim();
  const productName = String(row['Product Name'] || '').trim();
  const brand = String(row.Brand || '').trim();
  const category = String(row['Main Category'] || '').trim();
  const subCategory = String(row['Sub Category'] || '').trim();
  const description = String(row.Description || '').trim();
  const imageUrl = normalizeUrl(row['Image URL']);
  const sellingPrice = toNumber(row['Selling Price'], 0);
  const mrp = toNumber(row.MRP, 0);

  const safeDescription = description.length >= 10
    ? description
    : `${productName} by ${brand}.`;

  const slugBase = productId
    ? `${productId}-${productName}`
    : productName;

  const finalPrice = mrp > 0 ? mrp : sellingPrice;
  const finalDiscount = sellingPrice > 0 && sellingPrice < finalPrice ? sellingPrice : undefined;

  const generatedHowToUse = `Apply ${subCategory || 'product'} as directed for best results.`;
  const generatedIngredients = `${subCategory || 'Beauty complex'} blend`;
  const generatedWeight = '30ml';
  const tagSet = new Set(
    [subCategory, category, brand]
      .filter(Boolean)
      .flatMap((v) => String(v).toLowerCase().split(/[\s/&,-]+/).filter(Boolean))
  );

  return {
    name: productName,
    slug: slugify(slugBase),
    description: safeDescription,
    shortDescription: safeDescription.slice(0, 180),
    price: finalPrice,
    ...(finalDiscount !== undefined ? { discountPrice: finalDiscount } : {}),
    category,
    brand,
    images: [{ url: imageUrl || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600' }],
    stock: 100,
    tags: Array.from(tagSet),
    ingredients: generatedIngredients,
    howToUse: generatedHowToUse,
    weight: generatedWeight,
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: true,
    isActive: true,
    eligibleForMysteryBox: true,
  };
};

const ensureCategory = async (categoryName, sortOrder) => {
  const name = String(categoryName || '').trim();
  if (!name) return;

  const slug = slugify(name);
  const description =
    CATEGORY_DESCRIPTION_MAP[slug] ||
    CATEGORY_DESCRIPTION_MAP[name.toLowerCase()] ||
    `${name} essentials`;

  await Category.findOneAndUpdate(
    { slug },
    {
      $set: {
        name,
        slug,
        description,
        isActive: true,
        sortOrder,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const run = async () => {
  const csvPathArg = process.argv[2];
  const csvPath = csvPathArg ? path.resolve(csvPathArg) : DEFAULT_CSV_PATH;

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const rows = loadCsvRows(csvPath);
  if (rows.length === 0) {
    console.log('No data rows found in CSV.');
    return;
  }

  await connectDB();

  let categoryCount = 0;
  let productCount = 0;

  const uniqueCategories = [...new Set(rows.map((r) => String(r['Main Category'] || '').trim()).filter(Boolean))];
  for (let i = 0; i < uniqueCategories.length; i += 1) {
    await ensureCategory(uniqueCategories[i], i + 1);
    categoryCount += 1;
  }

  for (const row of rows) {
    const doc = buildProductDoc(row);
    if (!doc.name || !doc.brand || !doc.category || !doc.price) continue;

    await Product.findOneAndUpdate(
      { slug: doc.slug },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    productCount += 1;
  }

  console.log(`Imported categories: ${categoryCount}`);
  console.log(`Imported products: ${productCount}`);
  console.log(`Source CSV: ${csvPath}`);
};

run()
  .catch((err) => {
    console.error('CSV import failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
