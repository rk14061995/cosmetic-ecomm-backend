const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    images: [{ url: String, publicId: String }],
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    shortDescription: { type: String },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    costPrice: { type: Number, min: 0, default: 0 },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    brand: { type: String, required: true },
    images: [
      {
        url: { type: String, required: true },
        publicId: String,
      },
    ],
    stock: { type: Number, required: true, default: 0, min: 0 },
    ratings: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    reviews: [reviewSchema],
    tags: [String],
    ingredients: String,
    howToUse: String,
    weight: String,
    variants: [
      {
        name: { type: String, required: true },
        value: { type: String, required: true },
        stock: { type: Number, default: 0 },
        priceModifier: { type: Number, default: 0 },
        image: String,
      },
    ],
    salePrice: { type: Number, min: 0 },
    saleEndsAt: { type: Date },
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    eligibleForMysteryBox: { type: Boolean, default: false },
    /** When true, PDP shows “Try on yourself” — client-side preview only (no server upload). */
    virtualTryOn: { type: Boolean, default: false },
    /** Hex colour used for the soft tint overlay (e.g. lipstick / blush). */
    tryOnTintHex: { type: String, default: '#db2777', trim: true },
    shades: [
      {
        name: { type: String, required: true, trim: true },
        hexColor: { type: String, required: true, trim: true },
      },
    ],
    frequentlyBoughtWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    isTestProduct: { type: Boolean, default: false },
    shippingCharge: { type: Number, default: 0, min: 0 },
    buyFrom: { type: String, trim: true },
  },
  { timestamps: true }
);

productSchema.pre('save', function (next) {
  if (this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, r) => sum + r.rating, 0);
    this.ratings = totalRating / this.reviews.length;
    this.numReviews = this.reviews.length;
  }
  next();
});

productSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1, ratings: -1 });
productSchema.index({ slug: 1 });

module.exports = mongoose.model('Product', productSchema);
