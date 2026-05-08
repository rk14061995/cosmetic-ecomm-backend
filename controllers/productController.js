const Product = require('../models/Product');
const Category = require('../models/Category');
const { slugify, getPaginationData } = require('../utils/helpers');
const { uploadMultipleImages, deleteImage } = require('../services/cloudinaryService');

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
  const product = await Product.findOne({
    $or: [{ _id: req.params.id }, { slug: req.params.id }],
    isActive: true,
  }).populate('reviews.user', 'name avatar');

  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, product });
};

exports.getFeaturedProducts = async (req, res) => {
  const products = await Product.find({ isFeatured: true, isActive: true })
    .limit(8)
    .select('-reviews');
  res.json({ success: true, products });
};

exports.createProduct = async (req, res) => {
  const data = { ...req.body };
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
  if (data.name && !data.slug) data.slug = slugify(data.name);
  if (data.category) {
    const category = await Category.findOne({ name: data.category, isActive: true });
    if (!category) {
      return res.status(400).json({ success: false, message: 'Invalid category selected' });
    }
  }

  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  if (req.files && req.files.length > 0) {
    const newImages = await uploadMultipleImages(req.files, 'cosmetic_web/products');
    data.images = [...(product.images || []), ...newImages];
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
