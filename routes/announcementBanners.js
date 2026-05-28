const express = require('express');
const router = express.Router();
const {
  getPublicBanner,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} = require('../controllers/announcementBannerController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/public', getPublicBanner);

router.use(protect, adminOnly);
router.get('/', getBanners);
router.post('/', createBanner);
router.put('/:id', updateBanner);
router.delete('/:id', deleteBanner);

module.exports = router;
