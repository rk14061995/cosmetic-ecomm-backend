const Brand = require('../models/Brand');
const { slugify } = require('../utils/helpers');

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
