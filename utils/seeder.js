require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const MysteryBox = require('../models/MysteryBox');
const Coupon = require('../models/Coupon');
const Category = require('../models/Category');
const Bundle = require('../models/Bundle');

const products = [
  {
    name: 'Vitamin C Brightening Serum',
    slug: 'vitamin-c-brightening-serum',
    description: 'A potent 20% Vitamin C serum that brightens, evens skin tone, and reduces dark spots. Formulated with Vitamin E and Ferulic Acid for maximum stability and efficacy. Daily use reveals radiant, glowing skin.',
    shortDescription: 'Potent 20% Vitamin C serum for bright, glowing skin.',
    price: 1299,
    discountPrice: 999,
    category: 'Skincare',
    brand: 'GlowLab',
    images: [{ url: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600' }],
    stock: 100,
    tags: ['vitamin c', 'serum', 'brightening', 'anti-aging'],
    ingredients: 'Ascorbic Acid (20%), Vitamin E, Ferulic Acid, Hyaluronic Acid, Niacinamide',
    howToUse: 'Apply 3-4 drops to cleansed face every morning. Follow with moisturizer and SPF.',
    weight: '30ml',
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: true,
    isActive: true,
    eligibleForMysteryBox: true,
  },
  {
    name: 'Hydra-Glow Moisturizer SPF 50',
    slug: 'hydra-glow-moisturizer-spf-50',
    description: 'Lightweight daily moisturizer with broad-spectrum SPF 50 protection. Enriched with Hyaluronic Acid, Niacinamide, and Ceramides for all-day hydration without a greasy feel.',
    shortDescription: 'Lightweight SPF 50 moisturizer with hyaluronic acid.',
    price: 899,
    discountPrice: 749,
    category: 'Skincare',
    brand: 'SunShield',
    images: [{ url: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600' }],
    stock: 150,
    tags: ['moisturizer', 'spf', 'hydrating', 'daily'],
    weight: '50g',
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: true,
    isActive: true,
    eligibleForMysteryBox: true,
  },
  {
    name: 'Rose Petal Lip Balm Collection',
    slug: 'rose-petal-lip-balm-collection',
    description: 'Luxurious set of 3 tinted lip balms infused with rose hip oil and shea butter. Long-lasting moisture with a sheer color payoff. Available in Nude, Rose, and Berry.',
    shortDescription: 'Set of 3 tinted lip balms with rose hip oil.',
    price: 499,
    discountPrice: 399,
    category: 'Makeup',
    brand: 'PetalSoft',
    images: [{ url: 'https://images.unsplash.com/photo-1586495777744-4e6232bf2ea2?w=600' }],
    stock: 200,
    tags: ['lip balm', 'tinted', 'moisture', 'lips'],
    weight: '3x4g',
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    isActive: true,
    eligibleForMysteryBox: true,
  },
  {
    name: 'Retinol Night Cream',
    slug: 'retinol-night-cream',
    description: 'Advanced retinol formula (0.3%) to visibly reduce fine lines, wrinkles, and improve skin texture overnight. Combined with peptides and niacinamide to minimize irritation.',
    shortDescription: '0.3% retinol night cream for anti-aging results.',
    price: 1599,
    discountPrice: 1299,
    category: 'Skincare',
    brand: 'GlowLab',
    images: [{ url: 'https://images.unsplash.com/photo-1601049541271-1c7b7a8f7e7c?w=600' }],
    stock: 75,
    tags: ['retinol', 'anti-aging', 'night cream', 'wrinkles'],
    weight: '50g',
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: false,
    isActive: true,
    eligibleForMysteryBox: false,
  },
  {
    name: 'Argan Oil Hair Mask',
    slug: 'argan-oil-hair-mask',
    description: 'Intensive repair mask with Moroccan argan oil, keratin, and coconut oil. Restores shine, reduces frizz, and strengthens damaged hair with weekly use.',
    shortDescription: 'Deep repair mask with argan oil and keratin.',
    price: 699,
    discountPrice: 599,
    category: 'Haircare',
    brand: 'HairElixir',
    images: [{ url: 'https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=600' }],
    stock: 120,
    tags: ['hair mask', 'argan oil', 'repair', 'frizz'],
    weight: '200g',
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: true,
    isActive: true,
    eligibleForMysteryBox: true,
  },
  {
    name: 'Rose & Oud Eau de Parfum',
    slug: 'rose-oud-eau-de-parfum',
    description: 'An opulent fragrance blending the softness of Bulgarian roses with the depth of aged oud wood. Warm, floral and long-lasting — perfect for evenings.',
    shortDescription: 'Luxurious rose and oud perfume, long-lasting.',
    price: 2499,
    discountPrice: 1999,
    category: 'Fragrance',
    brand: 'AromaLux',
    images: [{ url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600' }],
    stock: 50,
    tags: ['perfume', 'rose', 'oud', 'fragrance'],
    weight: '50ml',
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: false,
    isActive: true,
    eligibleForMysteryBox: false,
  },
  {
    name: 'Coffee Body Scrub',
    slug: 'coffee-body-scrub',
    description: 'Energizing body scrub with finely ground coffee, coconut oil, and brown sugar. Exfoliates dead skin, improves circulation, and leaves skin incredibly smooth and glowing.',
    shortDescription: 'Energizing coffee & coconut body scrub.',
    price: 599,
    discountPrice: 449,
    category: 'Body Care',
    brand: 'BodyBliss',
    images: [{ url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600' }],
    stock: 180,
    tags: ['scrub', 'coffee', 'exfoliant', 'body care'],
    weight: '200g',
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: true,
    isActive: true,
    eligibleForMysteryBox: true,
  },
  {
    name: 'Pro Makeup Brush Set (12pc)',
    slug: 'pro-makeup-brush-set-12pc',
    description: 'Professional 12-piece brush set with ultra-soft synthetic bristles. Includes foundation, contour, blush, eyeshadow, liner, and blending brushes. Comes in a luxe travel pouch.',
    shortDescription: '12-piece professional makeup brush set.',
    price: 1199,
    discountPrice: 899,
    category: 'Tools & Accessories',
    brand: 'BrushCraft',
    images: [{ url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600' }],
    stock: 80,
    tags: ['brushes', 'makeup tools', 'set', 'professional'],
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: true,
    isActive: true,
    eligibleForMysteryBox: false,
  },
];

const categories = [
  { name: 'Skincare', slug: 'skincare', description: 'Daily skin essentials', sortOrder: 1, isActive: true },
  { name: 'Makeup', slug: 'makeup', description: 'Face, lips and eyes', sortOrder: 2, isActive: true },
  { name: 'Haircare', slug: 'haircare', description: 'Repair and styling products', sortOrder: 3, isActive: true },
  { name: 'Fragrance', slug: 'fragrance', description: 'Perfumes and mists', sortOrder: 4, isActive: true },
  { name: 'Body Care', slug: 'body-care', description: 'Body scrubs and lotions', sortOrder: 5, isActive: true },
  { name: 'Tools & Accessories', slug: 'tools-and-accessories', description: 'Brushes and tools', sortOrder: 6, isActive: true },
];

const coupons = [
  {
    code: 'WELCOME10',
    description: '10% off for new customers',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscountAmount: 200,
    minOrderValue: 299,
    usageLimit: 1000,
    perUserLimit: 1,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    code: 'FLAT100',
    description: '₹100 flat off on orders above ₹699',
    discountType: 'flat',
    discountValue: 100,
    minOrderValue: 699,
    usageLimit: 500,
    perUserLimit: 2,
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    code: 'GLOW20',
    description: '20% off on Skincare category',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscountAmount: 500,
    minOrderValue: 999,
    usageLimit: 200,
    perUserLimit: 1,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
];

const seedDB = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    await Promise.all([
      User.deleteMany({ role: 'user' }),
      Product.deleteMany({}),
      MysteryBox.deleteMany({}),
      Coupon.deleteMany({}),
      Category.deleteMany({}),
      Bundle.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    const createdCategories = await Category.insertMany(categories);
    console.log(`Created ${createdCategories.length} categories`);

    const createdProducts = await Product.insertMany(products);
    console.log(`Created ${createdProducts.length} products`);

    const productBySlug = new Map(createdProducts.map((p) => [p.slug, p]));

    await Coupon.insertMany(coupons);
    console.log(`Created ${coupons.length} coupons`);

    const eligibleProducts = createdProducts.filter((p) => p.eligibleForMysteryBox);
    const productPool = eligibleProducts.map((p) => ({ product: p._id, weight: 1 }));

    await MysteryBox.create([
      {
        name: 'Basic Glow Box',
        tier: 'basic',
        price: 499,
        description: 'Your perfect intro to premium beauty. Packed with 3-4 curated beauty essentials worth ₹800+.',
        image: 'https://images.unsplash.com/photo-1549068106-b024baf5062d?w=600',
        productPool: productPool.slice(0, 4),
        minProducts: 3,
        maxProducts: 4,
        minValue: 800,
        stock: 100,
        isActive: true,
        possibleItems: [
          { name: 'Vitamin C Serum', description: 'Brightening face serum' },
          { name: 'Lip Balm', description: 'Tinted moisture lip balm' },
          { name: 'Body Scrub', description: 'Exfoliating coffee scrub' },
          { name: 'Hair Mask', description: 'Argan oil repair mask' },
        ],
      },
      {
        name: 'Standard Glow Box',
        tier: 'standard',
        price: 999,
        description: 'The fan favourite! 4-5 premium beauty products worth ₹1500+, hand-picked by our experts.',
        image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600',
        productPool: productPool,
        minProducts: 4,
        maxProducts: 5,
        minValue: 1500,
        stock: 80,
        isActive: true,
        possibleItems: [
          { name: 'Vitamin C Serum', description: 'Brightening face serum' },
          { name: 'Moisturizer SPF 50', description: 'Lightweight sun protection' },
          { name: 'Lip Balm Collection', description: 'Set of 3 tinted balms' },
          { name: 'Body Scrub', description: 'Exfoliating coffee scrub' },
          { name: 'Hair Mask', description: 'Deep repair treatment' },
        ],
      },
      {
        name: 'Premium Glow Box',
        tier: 'premium',
        price: 1999,
        description: 'The ultimate luxury beauty experience. 5-7 full-size premium products worth ₹3000+.',
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600',
        productPool: productPool,
        minProducts: 5,
        maxProducts: 7,
        minValue: 3000,
        stock: 50,
        isActive: true,
        possibleItems: [
          { name: 'Vitamin C Serum', description: 'Full-size brightening serum' },
          { name: 'Retinol Night Cream', description: 'Anti-aging treatment' },
          { name: 'Moisturizer SPF 50', description: 'Premium daily protection' },
          { name: 'Argan Oil Hair Mask', description: 'Salon-grade repair' },
          { name: 'Coffee Body Scrub', description: 'Luxury exfoliation' },
          { name: 'Rose Petal Lip Balm', description: 'Tinted moisture collection' },
        ],
      },
    ]);
    console.log('Created 3 mystery boxes');

    await Bundle.insertMany([
      {
        name: 'Radiance Starter Bundle',
        slug: 'radiance-starter-bundle',
        description: 'Brightening and hydration essentials for daily use.',
        products: [
          { product: productBySlug.get('vitamin-c-brightening-serum')._id, quantity: 1 },
          { product: productBySlug.get('hydra-glow-moisturizer-spf-50')._id, quantity: 1 },
          { product: productBySlug.get('coffee-body-scrub')._id, quantity: 1 },
        ],
        originalPrice: 2797,
        bundlePrice: 2199,
        image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600',
        stock: 120,
        isActive: true,
        tag: 'Bestseller',
      },
      {
        name: 'Glow Makeup Bundle',
        slug: 'glow-makeup-bundle',
        description: 'Complete lip and brush combo for everyday glam.',
        products: [
          { product: productBySlug.get('rose-petal-lip-balm-collection')._id, quantity: 1 },
          { product: productBySlug.get('pro-makeup-brush-set-12pc')._id, quantity: 1 },
        ],
        originalPrice: 1698,
        bundlePrice: 1299,
        image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600',
        stock: 90,
        isActive: true,
        tag: 'Limited',
      },
    ]);
    console.log('Created 2 bundles');

    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    const existingAdmin = await User.findOne({ email: 'admin@cosmeticweb.com' });
    if (!existingAdmin) {
      await User.create({
        name: 'Admin User',
        email: 'admin@cosmeticweb.com',
        password: hashedPassword,
        role: 'admin',
        referralCode: 'ADMIN001',
      });
      console.log('Admin user created: admin@cosmeticweb.com / Admin@123');
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('Admin: admin@cosmeticweb.com | Admin@123');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedDB();
