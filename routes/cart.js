const express = require('express');
const router = express.Router();
const {
  getCart, addToCart, updateCartItem, removeCartItem,
  clearCart, applyCoupon, removeCoupon, getAdminUserCart,
} = require('../controllers/cartController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

router.get('/admin/:userId', adminOnly, getAdminUserCart);

router.get('/', getCart);
router.post('/add', addToCart);
router.put('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', removeCartItem);
router.delete('/clear', clearCart);
router.post('/coupon', applyCoupon);
router.delete('/coupon', removeCoupon);

module.exports = router;
