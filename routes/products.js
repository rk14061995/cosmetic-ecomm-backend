const express = require('express');
const router = express.Router();
const {
  getProducts, getProduct, getFeaturedProducts, getProductStats,
  createProduct, updateProduct, deleteProduct,
  deleteProductImage, addReview, toggleWishlist,
} = require('../controllers/productController');
const { protect, adminOnly, optionalProtect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { withCache, invalidateCache } = require('../middleware/cache');

// Public reads — optionalProtect runs first so withCache can skip admin sessions
router.get('/', optionalProtect, withCache(), getProducts);
router.get('/stats', withCache(), getProductStats);
router.get('/featured', withCache(), getFeaturedProducts);
router.get('/:id', optionalProtect, withCache(), getProduct);

// Writes — invalidate all product cache entries on success
router.post('/', protect, adminOnly, upload.array('images', 10), invalidateCache('/products'), createProduct);
router.put('/:id', protect, adminOnly, upload.array('images', 10), invalidateCache('/products'), updateProduct);
router.delete('/:id', protect, adminOnly, invalidateCache('/products'), deleteProduct);
router.delete('/:id/images/:publicId', protect, adminOnly, invalidateCache('/products'), deleteProductImage);

router.post('/:id/reviews', protect, addReview);
router.put('/:id/wishlist', protect, toggleWishlist);

module.exports = router;
