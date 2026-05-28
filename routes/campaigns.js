const express = require('express');
const router = express.Router();
const {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  previewCampaign,
  renderPreview,
  testSend,
  getStats,
  sendCampaign,
} = require('../controllers/campaignController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// Static named routes — must come before /:id
router.get('/stats',          getStats);
router.get('/preview',        previewCampaign);
router.post('/render-preview', renderPreview);
router.post('/test-send',     testSend);

router.get('/',       getCampaigns);
router.post('/',      createCampaign);
router.get('/:id',    getCampaign);
router.put('/:id',    updateCampaign);
router.delete('/:id', deleteCampaign);
router.post('/:id/send', sendCampaign);

module.exports = router;
