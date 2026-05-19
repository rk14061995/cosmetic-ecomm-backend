const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { withCache, invalidateCache } = require('../middleware/cache');

router.get('/', withCache(), getCategories);

// Category changes also bust the product cache (products are filtered by category)
router.post('/', protect, adminOnly, upload.single('image'), invalidateCache('/categories', '/products'), createCategory);
router.put('/:id', protect, adminOnly, upload.single('image'), invalidateCache('/categories', '/products'), updateCategory);
router.delete('/:id', protect, adminOnly, invalidateCache('/categories', '/products'), deleteCategory);

module.exports = router;
