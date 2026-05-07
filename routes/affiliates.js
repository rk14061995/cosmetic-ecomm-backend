const router = require('express').Router();
const { apply, getMyAffiliate, trackClick, getAll, updateStatus } = require('../controllers/affiliateController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/apply', protect, apply);
router.get('/me', protect, getMyAffiliate);
router.post('/click/:code', trackClick);
router.get('/all', protect, adminOnly, getAll);
router.put('/:id/status', protect, adminOnly, updateStatus);

module.exports = router;
