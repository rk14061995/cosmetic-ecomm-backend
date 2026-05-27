const Product = require('../models/Product');
const Category = require('../models/Category');
const { slugify, getPaginationData } = require('../utils/helpers');
const { uploadMultipleImages, deleteImage } = require('../services/cloudinaryService');
const { logAudit } = require('../services/auditService');

const BOOLEAN_FORM_FIELDS = [
  'isFeatured', 'isNewArrival', 'isBestSeller', 'isActive', 'eligibleForMysteryBox', 'virtualTryOn', 'isTestProduct',
];
const NUMBER_FORM_FIELDS = ['price', 'discountPrice', 'costPrice', 'stock', 'shippingCharge'];

function coerceBooleanFormFields(obj) {
  for (const k of BOOLEAN_FORM_FIELDS) {
    if (obj[k] === 'true' || obj[k] === true) obj[k] = true;
    else if (obj[k] === 'false' || obj[k] === false) obj[k] = false;
  }
  for (const k of NUMBER_FORM_FIELDS) {
    if (obj[k] !== undefined && obj[k] !== '' && obj[k] !== null) {
      const n = Number(obj[k]);
      if (!isNaN(n)) obj[k] = n;
    }
  }
}

exports.getProducts = async (req, res) => {
  const {
    category,
    brand,
    minPrice,
    maxPrice,
    rating,
    search,
    sort,
    page = 1,
    limit = 12,
    featured,
    newArrival,
    bestSeller,
    includeInactive,
  } = req.query;
  const isAdmin = req.user?.role === 'admin';
  const query = includeInactive === 'true' && isAdmin ? {} : { isActive: true };
  if (!isAdmin) query.isTestProduct = { $ne: true };

  if (category) query.category = category;
  if (brand) query.brand = new RegExp(`^${String(brand).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }
  if (rating) query.ratings = { $gte: Number(rating) };
  if (featured) query.isFeatured = true;
  if (newArrival) query.isNewArrival = true;
  if (bestSeller) query.isBestSeller = true;
  if (search) query.$text = { $search: search };

  const sortMap = {
    newest: { createdAt: -1 },
    'price-low': { price: 1 },
    'price-high': { price: -1 },
    rating: { ratings: -1 },
    popular: { numReviews: -1 },
  };
  const sortOption = sortMap[sort] || { createdAt: -1 };

  const total = await Product.countDocuments(query);
  const pagination = getPaginationData(page, limit, total);
  const products = await Product.find(query)
    .sort(sortOption)
    .skip((pagination.currentPage - 1) * pagination.pageSize)
    .limit(pagination.pageSize)
    .select(isAdmin ? '-reviews' : '-reviews -buyFrom');

  res.json({ success: true, products, pagination });
};

exports.getProduct = async (req, res) => {
  const raw = String(req.params.id || '').trim();
  if (!raw) return res.status(400).json({ success: false, message: 'Product id required' });

  // Slug URLs must not be passed to _id — Mongoose throws CastError and the global handler returns "Resource not found".
  const isObjectId = /^[a-fA-F0-9]{24}$/.test(raw);
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  try {
    let filter = isObjectId
      ? { isActive: true, $or: [{ _id: raw }, { slug: raw }] }
      : { isActive: true, slug: raw };

    let product = await Product.findOne(filter);

    if (!product && !isObjectId) {
      product = await Product.findOne({
        isActive: true,
        slug: { $regex: new RegExp(`^${escapeRegex(raw)}$`, 'i') },
      });
    }

    // Title-style URLs or slug drift (e.g. "Glowzy Beauty Blender" vs stored slug)
    if (!product && !isObjectId) {
      let decoded = raw;
      try {
        decoded = decodeURIComponent(String(raw).replace(/\+/g, ' '));
      } catch (_) {
        /* keep raw */
      }
      decoded = decoded.trim();
      const slugCandidates = [...new Set([slugify(decoded), slugify(raw)].filter(Boolean))];
      for (const s of slugCandidates) {
        if (!s) continue;
        product = await Product.findOne({ isActive: true, slug: s });
        if (product) break;
      }
      if (!product && decoded.length >= 2) {
        product = await Product.findOne({
          isActive: true,
          name: { $regex: new RegExp(`^${escapeRegex(decoded)}$`, 'i') },
        });
      }
    }

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Test products are only accessible to admin users
    if (product.isTestProduct && req.user?.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Bad review.user refs cause CastError on populate and bubble as "Resource not found" — skip populate for those.
    try {
      await product.populate('reviews.user', 'name avatar');
    } catch (popErr) {
      if (popErr.name !== 'CastError') throw popErr;
    }

    const productData = product.toObject();
    if (!req.user) delete productData.buyFrom;

    return res.json({ success: true, product: productData });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    return res.status(500).json({ success: false, message: 'Failed to load product' });
  }
};

exports.getProductStats = async (req, res) => {
  const [countResult, ratingResult] = await Promise.all([
    Product.countDocuments({ isActive: true }),
    Product.aggregate([
      { $match: { isActive: true, numReviews: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$ratings' } } },
    ]),
  ]);
  const totalProducts = countResult;
  const averageRating = ratingResult[0]?.avg ?? 0;
  res.json({ success: true, totalProducts, averageRating });
};

exports.getFeaturedProducts = async (req, res) => {
  const products = await Product.find({ isFeatured: true, isActive: true, isTestProduct: { $ne: true } })
    .limit(8)
    .select('-reviews');
  res.json({ success: true, products });
};

function parseShadesJson(data) {
  if (!data.shadesJson) { delete data.shadesJson; return; }
  try {
    const parsed = JSON.parse(data.shadesJson);
    if (Array.isArray(parsed)) {
      data.shades = parsed
        .filter((s) => s && typeof s.name === 'string' && typeof s.hexColor === 'string')
        .map((s) => ({ name: s.name.trim(), hexColor: s.hexColor.trim() }));
    }
  } catch (_) { /* ignore malformed JSON */ }
  delete data.shadesJson;
}

exports.createProduct = async (req, res) => {
  const data = { ...req.body };
  coerceBooleanFormFields(data);
  parseShadesJson(data);
  if (!data.slug) data.slug = slugify(data.name);
  if (data.category) {
    const category = await Category.findOne({ name: data.category, isActive: true });
    if (!category) {
      return res.status(400).json({ success: false, message: 'Invalid category selected' });
    }
  }

  if (req.files && req.files.length > 0) {
    data.images = await uploadMultipleImages(req.files, 'cosmetic_web/products');
  }

  const product = await Product.create(data);
  await logAudit({
    entity: 'Product', entityId: product._id, entityName: product.name,
    action: 'create', performedBy: req.user,
  });
  res.status(201).json({ success: true, product });
};

exports.updateProduct = async (req, res) => {
  const data = { ...req.body };
  coerceBooleanFormFields(data);
  parseShadesJson(data);
  delete data.existingImagesJson;

  const shouldReplaceImages =
    String(req.body?.replaceImages || '').toLowerCase() === 'true' ||
    req.body?.replaceImages === true;
  if (data.name && !data.slug) data.slug = slugify(data.name);
  if (data.category) {
    const category = await Category.findOne({ name: data.category, isActive: true });
    if (!category) {
      return res.status(400).json({ success: false, message: 'Invalid category selected' });
    }
  }

  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  const oldSnapshot = product.toObject();

  /** Ordered existing images from admin (JSON array of { url, publicId? }) — allows reorder without re-uploading */
  let orderedExisting = null;
  if (req.body.existingImagesJson != null && req.body.existingImagesJson !== '') {
    try {
      const parsed = JSON.parse(req.body.existingImagesJson);
      if (Array.isArray(parsed) && parsed.every((x) => x && typeof x.url === 'string')) {
        orderedExisting = parsed.map((x) => {
          const o = { url: x.url };
          if (x.publicId) o.publicId = x.publicId;
          return o;
        });
      }
    } catch (_) {
      /* ignore invalid JSON */
    }
  }
  if (orderedExisting !== null) {
    data.images = orderedExisting;
  }

  if (req.files && req.files.length > 0) {
    const newImages = await uploadMultipleImages(req.files, 'cosmetic_web/products');
    if (shouldReplaceImages) {
      for (const image of product.images || []) {
        if (image.publicId) {
          try {
            await deleteImage(image.publicId);
          } catch (_) {}
        }
      }
      data.images = newImages;
    } else {
      const base = data.images !== undefined ? data.images : (product.images || []);
      data.images = [...base, ...newImages];
    }
  }

  const updated = await Product.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  await logAudit({
    entity: 'Product', entityId: updated._id, entityName: updated.name,
    action: 'update', oldDoc: oldSnapshot, newDoc: updated, performedBy: req.user,
  });
  res.json({ success: true, product: updated });
};

exports.deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  const { _id: productId, name: productName } = product;
  for (const image of product.images) {
    if (image.publicId) await deleteImage(image.publicId);
  }
  await product.deleteOne();
  await logAudit({
    entity: 'Product', entityId: productId, entityName: productName,
    action: 'delete', performedBy: req.user,
  });
  res.json({ success: true, message: 'Product deleted' });
};

exports.deleteProductImage = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  const image = product.images.find((img) => img.publicId === req.params.publicId);
  if (image) await deleteImage(image.publicId);

  product.images = product.images.filter((img) => img.publicId !== req.params.publicId);
  await product.save();
  res.json({ success: true, images: product.images });
};

exports.addReview = async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  const alreadyReviewed = product.reviews.find(
    (r) => r.user.toString() === req.user._id.toString()
  );
  if (alreadyReviewed) {
    return res.status(400).json({ success: false, message: 'Product already reviewed' });
  }

  product.reviews.push({ user: req.user._id, name: req.user.name, rating: Number(rating), comment });
  await product.save();
  res.status(201).json({ success: true, message: 'Review added' });
};

exports.toggleWishlist = async (req, res) => {
  const user = await require('../models/User').findById(req.user._id);
  const productId = req.params.id;
  const index = user.wishlist.findIndex((id) => id.toString() === productId);

  if (index > -1) {
    user.wishlist.splice(index, 1);
  } else {
    user.wishlist.push(productId);
  }
  await user.save();
  res.json({ success: true, wishlist: user.wishlist, added: index === -1 });
};
