const Product = require('../models/Product');
const Category = require('../models/Category');
const { slugify, getPaginationData } = require('../utils/helpers');
const { uploadMultipleImages, deleteImage } = require('../services/cloudinaryService');

const BOOLEAN_FORM_FIELDS = [
  'isFeatured',
  'isNewArrival',
  'isBestSeller',
  'isActive',
  'eligibleForMysteryBox',
  'virtualTryOn',
];

function coerceBooleanFormFields(obj) {
  for (const k of BOOLEAN_FORM_FIELDS) {
    if (obj[k] === 'true' || obj[k] === true) obj[k] = true;
    else if (obj[k] === 'false' || obj[k] === false) obj[k] = false;
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
  const query = includeInactive === 'true' ? {} : { isActive: true };

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
    .select('-reviews');

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

    // Bad review.user refs cause CastError on populate and bubble as "Resource not found" — skip populate for those.
    try {
      await product.populate('reviews.user', 'name avatar');
    } catch (popErr) {
      if (popErr.name !== 'CastError') throw popErr;
    }

    return res.json({ success: true, product });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    return res.status(500).json({ success: false, message: 'Failed to load product' });
  }
};

exports.getFeaturedProducts = async (req, res) => {
  const products = await Product.find({ isFeatured: true, isActive: true })
    .limit(8)
    .select('-reviews');
  res.json({ success: true, products });
};

exports.createProduct = async (req, res) => {
  const data = { ...req.body };
  coerceBooleanFormFields(data);
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
  res.status(201).json({ success: true, product });
};

exports.updateProduct = async (req, res) => {
  const data = { ...req.body };
  coerceBooleanFormFields(data);
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
  res.json({ success: true, product: updated });
};

exports.deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  for (const image of product.images) {
    if (image.publicId) await deleteImage(image.publicId);
  }
  await product.deleteOne();
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
