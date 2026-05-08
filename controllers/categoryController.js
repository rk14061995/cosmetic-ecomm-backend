const Category = require('../models/Category');
const { slugify } = require('../utils/helpers');

exports.getCategories = async (req, res) => {
  const { includeInactive } = req.query;
  const query = includeInactive === 'true' ? {} : { isActive: true };
  const categories = await Category.find(query).sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, categories });
};

exports.createCategory = async (req, res) => {
  const { name, description = '', sortOrder = 0, isActive = true } = req.body;
  const normalizedName = String(name || '').trim();
  if (!normalizedName) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }

  const exists = await Category.findOne({ name: new RegExp(`^${normalizedName}$`, 'i') });
  if (exists) {
    return res.status(400).json({ success: false, message: 'Category already exists' });
  }

  const category = await Category.create({
    name: normalizedName,
    slug: slugify(normalizedName),
    description,
    sortOrder: Number(sortOrder) || 0,
    isActive: Boolean(isActive),
  });

  res.status(201).json({ success: true, category });
};

exports.updateCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

  const nextName = req.body.name ? String(req.body.name).trim() : category.name;
  if (!nextName) return res.status(400).json({ success: false, message: 'Category name is required' });

  if (nextName.toLowerCase() !== category.name.toLowerCase()) {
    const duplicate = await Category.findOne({ _id: { $ne: category._id }, name: new RegExp(`^${nextName}$`, 'i') });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }
  }

  category.name = nextName;
  category.slug = slugify(nextName);
  if (req.body.description !== undefined) category.description = req.body.description;
  if (req.body.sortOrder !== undefined) category.sortOrder = Number(req.body.sortOrder) || 0;
  if (req.body.isActive !== undefined) category.isActive = Boolean(req.body.isActive);
  await category.save();

  res.json({ success: true, category });
};

exports.deleteCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
  await category.deleteOne();
  res.json({ success: true, message: 'Category deleted' });
};
