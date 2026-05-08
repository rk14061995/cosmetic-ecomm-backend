const Category = require('../models/Category');
const { slugify } = require('../utils/helpers');
const { uploadImage, deleteImage } = require('../services/cloudinaryService');
const toBoolean = (value, fallback = true) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
};
const cloudinaryPublicIdFromUrl = (url) => {
  const value = String(url || '');
  const marker = '/upload/';
  const index = value.indexOf(marker);
  if (index === -1) return null;
  const pathPart = value.slice(index + marker.length);
  const withoutVersion = pathPart.replace(/^v\d+\//, '');
  const publicId = withoutVersion.replace(/\.[^/.]+$/, '');
  return publicId || null;
};

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
    image: '',
    sortOrder: Number(sortOrder) || 0,
    isActive: toBoolean(isActive, true),
  });

  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer, 'cosmetic_web/categories');
    category.image = uploaded.url;
    await category.save();
  }

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
  if (req.body.isActive !== undefined) category.isActive = toBoolean(req.body.isActive, category.isActive);
  if (req.file) {
    const previousPublicId = cloudinaryPublicIdFromUrl(category.image);
    const uploaded = await uploadImage(req.file.buffer, 'cosmetic_web/categories');
    if (previousPublicId) {
      try {
        await deleteImage(previousPublicId);
      } catch (_) {}
    }
    category.image = uploaded.url;
  }
  await category.save();

  res.json({ success: true, category });
};

exports.deleteCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
  const publicId = cloudinaryPublicIdFromUrl(category.image);
  if (publicId) {
    try {
      await deleteImage(publicId);
    } catch (_) {}
  }
  await category.deleteOne();
  res.json({ success: true, message: 'Category deleted' });
};
