const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { protect, adminOnly } = require('../middleware/auth');

router.get('/signature', protect, adminOnly, (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = (typeof req.query.folder === 'string' ? req.query.folder : 'cosmetic_web')
    .replace(/[^a-zA-Z0-9/_-]/g, '');
  const paramsToSign = { folder, timestamp };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);
  res.json({
    success: true,
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder,
  });
});

module.exports = router;
