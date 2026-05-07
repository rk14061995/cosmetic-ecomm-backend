const Bundle = require('../models/Bundle');
const Cart = require('../models/Cart');

const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

exports.getBundles = async (req, res) => {
  const bundles = await Bundle.find({ isActive: true })
    .populate('products.product', 'name price discountPrice images brand');
  res.json({ success: true, bundles });
};

exports.getBundle = async (req, res) => {
  const bundle = await Bundle.findOne({ slug: req.params.slug, isActive: true })
    .populate('products.product', 'name price discountPrice images brand description');
  if (!bundle) return res.status(404).json({ success: false, message: 'Bundle not found' });
  res.json({ success: true, bundle });
};

exports.createBundle = async (req, res) => {
  const { name, description, products, originalPrice, bundlePrice, image, tag } = req.body;
  const slug = slugify(name) + '-' + Date.now().toString(36);
  const bundle = await Bundle.create({ name, slug, description, products, originalPrice, bundlePrice, image, tag });
  res.status(201).json({ success: true, bundle });
};

exports.updateBundle = async (req, res) => {
  const bundle = await Bundle.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!bundle) return res.status(404).json({ success: false, message: 'Bundle not found' });
  res.json({ success: true, bundle });
};

exports.deleteBundle = async (req, res) => {
  await Bundle.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Bundle deleted' });
};
