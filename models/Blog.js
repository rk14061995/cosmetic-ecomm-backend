const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title:     { type: String, required: true, trim: true },
    slug:      { type: String, required: true, unique: true, lowercase: true },
    excerpt:   { type: String, required: true },
    content:   { type: String, required: true },
    coverImage:{ type: String },
    category:  { type: String, enum: ['Skincare', 'Makeup', 'Haircare', 'Wellness', 'Tutorials', 'News'], default: 'Skincare' },
    tags:      [String],
    author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    published: { type: Boolean, default: false },
    views:     { type: Number, default: 0 },
    relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true }
);

blogSchema.index({ slug: 1 });
blogSchema.index({ category: 1, published: 1 });
blogSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('Blog', blogSchema);
