const router = require('express').Router();
const { getDenominations, purchase, validate, redeem, getMyCards } = require('../controllers/giftCardController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/denominations', getDenominations);
router.post('/validate', validate);
router.post('/purchase', protect, purchase);
router.post('/redeem', protect, redeem);
router.get('/my-cards', protect, getMyCards);

module.exports = router;
