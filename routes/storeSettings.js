const express = require('express');
const router = express.Router();
const { getPublicSettings, getSettings, updateSettings } = require('../controllers/storeSettingsController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/public', getPublicSettings);

router.use(protect, adminOnly);
router.get('/', getSettings);
router.put('/', updateSettings);

module.exports = router;
