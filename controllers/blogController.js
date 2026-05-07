const Blog = require('../models/Blog');
const { getPaginationData } = require('../utils/helpers');

const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

exports.getPosts = async (req, res) => {
  const { page = 1, limit = 9, category, search } = req.query;
  const query = { published: true };
  if (category) query.category = category;
  if (search) query.$text = { $search: search };

  const total = await Blog.countDocuments(query);
  const pagination = getPaginationData(page, limit, total);

  const posts = await Blog.find(query)
    .populate('author', 'name avatar')
    .sort({ createdAt: -1 })
    .skip((pagination.currentPage - 1) * pagination.pageSize)
    .limit(pagination.pageSize)
    .select('-content');

  res.json({ success: true, posts, pagination });
};

exports.getPost = async (req, res) => {
  const post = await Blog.findOneAndUpdate(
    { slug: req.params.slug, published: true },
    { $inc: { views: 1 } },
    { new: true }
  ).populate('author', 'name avatar').populate('relatedProducts', 'name price discountPrice images slug');

  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  res.json({ success: true, post });
};

exports.createPost = async (req, res) => {
  const { title, excerpt, content, coverImage, category, tags, published, relatedProducts } = req.body;
  const slug = slugify(title) + '-' + Date.now().toString(36);
  const post = await Blog.create({ title, slug, excerpt, content, coverImage, category, tags, published, relatedProducts, author: req.user._id });
  res.status(201).json({ success: true, post });
};

exports.updatePost = async (req, res) => {
  const post = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  res.json({ success: true, post });
};

exports.deletePost = async (req, res) => {
  const post = await Blog.findByIdAndDelete(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  res.json({ success: true, message: 'Post deleted' });
};
