const express = require('express');
const router = express.Router();
const {
  createCoupon, getCoupons, getCoupon,
  updateCoupon, deleteCoupon, validateCoupon, getPublicCoupons,
} = require('../controllers/couponController');
const { protect, adminOnly } = require('../middleware/auth');
const { validate, couponSchema } = require('../utils/validators');

router.get('/public', getPublicCoupons);
router.post('/validate', protect, validateCoupon);

router.use(protect, adminOnly);
router.get('/', getCoupons);
router.post('/', validate(couponSchema), createCoupon);
router.get('/:id', getCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);

module.exports = router;
