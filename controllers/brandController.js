const Brand = require('../models/Brand');
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

const DEFAULT_BRANDS = [
  { name: 'Foxtale', origin: 'indian', image: 'https://logo.clearbit.com/foxtale.in', sortOrder: 1 },
  { name: 'Plix', origin: 'indian', image: 'https://logo.clearbit.com/plixlife.com', sortOrder: 2 },
  { name: 'Nykaa Cosmetics', origin: 'indian', image: 'https://logo.clearbit.com/nykaa.com', sortOrder: 3 },
  { name: 'Mamaearth', origin: 'indian', image: 'https://logo.clearbit.com/mamaearth.in', sortOrder: 4 },
  { name: 'Minimalist', origin: 'indian', image: 'https://logo.clearbit.com/beminimalist.co', sortOrder: 5 },
  { name: 'Dot & Key', origin: 'indian', image: 'https://logo.clearbit.com/dotandkey.com', sortOrder: 6 },
  { name: 'COSRX', origin: 'international', image: 'https://logo.clearbit.com/cosrx.com', sortOrder: 7 },
  { name: 'Laneige', origin: 'international', image: 'https://logo.clearbit.com/laneige.com', sortOrder: 8 },
  { name: 'The Ordinary', origin: 'international', image: 'https://logo.clearbit.com/theordinary.com', sortOrder: 9 },
  { name: 'La Roche-Posay', origin: 'international', image: 'https://logo.clearbit.com/laroche-posay.us', sortOrder: 10 },
  { name: 'Cetaphil', origin: 'international', image: 'https://logo.clearbit.com/cetaphil.com', sortOrder: 11 },
  { name: 'Clinique', origin: 'international', image: 'https://logo.clearbit.com/clinique.com', sortOrder: 12 },
];

const seedDefaultBrandsIfNeeded = async () => {
  const count = await Brand.countDocuments();
  if (count > 0) return;

  await Brand.insertMany(
    DEFAULT_BRANDS.map((b) => ({
      ...b,
      slug: slugify(b.name),
      isActive: true,
    }))
  );
};

exports.getBrands = async (req, res) => {
  await seedDefaultBrandsIfNeeded();
  const { includeInactive, origin } = req.query;

  const query = includeInactive === 'true' ? {} : { isActive: true };
  if (origin && ['indian', 'international'].includes(String(origin).toLowerCase())) {
    query.origin = String(origin).toLowerCase();
  }

  const brands = await Brand.find(query).sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, brands });
};

exports.createBrand = async (req, res) => {
  const { name, origin = 'indian', sortOrder = 0, isActive = true } = req.body;
  const normalizedName = String(name || '').trim();
  if (!normalizedName) {
    return res.status(400).json({ success: false, message: 'Brand name is required' });
  }
  if (!['indian', 'international'].includes(String(origin).toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Origin must be indian or international' });
  }

  const exists = await Brand.findOne({ name: new RegExp(`^${normalizedName}$`, 'i') });
  if (exists) {
    return res.status(400).json({ success: false, message: 'Brand already exists' });
  }

  let image = String(req.body.image || '').trim();
  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer, 'cosmetic_web/brands');
    image = uploaded.url;
  }
  if (!image) {
    return res.status(400).json({ success: false, message: 'Brand image is required' });
  }

  const brand = await Brand.create({
    name: normalizedName,
    slug: slugify(normalizedName),
    origin: String(origin).toLowerCase(),
    image,
    sortOrder: Number(sortOrder) || 0,
    isActive: toBoolean(isActive, true),
  });

  res.status(201).json({ success: true, brand });
};

exports.updateBrand = async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });

  const nextName = req.body.name ? String(req.body.name).trim() : brand.name;
  if (!nextName) return res.status(400).json({ success: false, message: 'Brand name is required' });

  if (nextName.toLowerCase() !== brand.name.toLowerCase()) {
    const duplicate = await Brand.findOne({ _id: { $ne: brand._id }, name: new RegExp(`^${nextName}$`, 'i') });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Brand already exists' });
    }
  }

  if (req.body.origin !== undefined) {
    const nextOrigin = String(req.body.origin).toLowerCase();
    if (!['indian', 'international'].includes(nextOrigin)) {
      return res.status(400).json({ success: false, message: 'Origin must be indian or international' });
    }
    brand.origin = nextOrigin;
  }

  if (req.file) {
    const previousPublicId = cloudinaryPublicIdFromUrl(brand.image);
    const uploaded = await uploadImage(req.file.buffer, 'cosmetic_web/brands');
    if (previousPublicId) {
      try {
        await deleteImage(previousPublicId);
      } catch (_) {}
    }
    brand.image = uploaded.url;
  } else if (req.body.image) {
    brand.image = String(req.body.image).trim();
  }

  brand.name = nextName;
  brand.slug = slugify(nextName);
  if (req.body.sortOrder !== undefined) brand.sortOrder = Number(req.body.sortOrder) || 0;
  if (req.body.isActive !== undefined) brand.isActive = toBoolean(req.body.isActive, brand.isActive);
  await brand.save();

  res.json({ success: true, brand });
};

exports.deleteBrand = async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });

  const publicId = cloudinaryPublicIdFromUrl(brand.image);
  if (publicId) {
    try {
      await deleteImage(publicId);
    } catch (_) {}
  }
  await brand.deleteOne();
  res.json({ success: true, message: 'Brand deleted' });
};
