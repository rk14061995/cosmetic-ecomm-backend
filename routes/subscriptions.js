const router = require('express').Router();
const { getMySubscription, create, pause, resume, cancel, getAllSubscriptions } = require('../controllers/subscriptionController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/my', protect, getMySubscription);
router.post('/', protect, create);
router.put('/pause', protect, pause);
router.put('/resume', protect, resume);
router.delete('/cancel', protect, cancel);
router.get('/all', protect, adminOnly, getAllSubscriptions);

module.exports = router;
