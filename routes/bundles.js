const router = require('express').Router();
const { getBundles, getBundle, createBundle, updateBundle, deleteBundle } = require('../controllers/bundleController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', getBundles);
router.get('/:slug', getBundle);
router.post('/', protect, adminOnly, createBundle);
router.put('/:id', protect, adminOnly, updateBundle);
router.delete('/:id', protect, adminOnly, deleteBundle);

module.exports = router;
