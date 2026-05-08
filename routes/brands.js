const express = require('express');
const router = express.Router();
const { getBrands, createBrand, updateBrand, deleteBrand } = require('../controllers/brandController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', getBrands);
router.post('/', protect, adminOnly, upload.single('image'), createBrand);
router.put('/:id', protect, adminOnly, upload.single('image'), updateBrand);
router.delete('/:id', protect, adminOnly, deleteBrand);

module.exports = router;
