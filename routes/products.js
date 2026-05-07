const express = require('express');
const router = express.Router();
const {
  getProducts, getProduct, getFeaturedProducts,
  createProduct, updateProduct, deleteProduct,
  deleteProductImage, addReview, toggleWishlist,
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/:id', getProduct);

router.post('/', protect, adminOnly, upload.array('images', 10), createProduct);
router.put('/:id', protect, adminOnly, upload.array('images', 10), updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);
router.delete('/:id/images/:publicId', protect, adminOnly, deleteProductImage);

router.post('/:id/reviews', protect, addReview);
router.put('/:id/wishlist', protect, toggleWishlist);

module.exports = router;
