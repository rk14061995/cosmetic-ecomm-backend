const express = require('express');
const router = express.Router();
const { getBrands, createBrand, updateBrand, deleteBrand } = require('../controllers/brandController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { withCache, invalidateCache } = require('../middleware/cache');

router.get('/', withCache(), getBrands);
router.post('/', protect, adminOnly, upload.single('image'), invalidateCache('/brands'), createBrand);
router.put('/:id', protect, adminOnly, upload.single('image'), invalidateCache('/brands'), updateBrand);
router.delete('/:id', protect, adminOnly, invalidateCache('/brands'), deleteBrand);

module.exports = router;
