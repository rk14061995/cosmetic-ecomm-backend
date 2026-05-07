const router = require('express').Router();
const { subscribe, getAlerts } = require('../controllers/backInStockController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/:productId/subscribe', protect, subscribe);
router.get('/alerts', protect, adminOnly, getAlerts);

module.exports = router;
