const express = require('express');
const router = express.Router();
const {
  getPublicLinks,
  getLinks,
  getLink,
  createLink,
  updateLink,
  deleteLink,
} = require('../controllers/marketingLinkController');
const { protect, adminOnly } = require('../middleware/auth');
const { validate, marketingLinkSchema, marketingLinkUpdateSchema } = require('../utils/validators');

router.get('/public', getPublicLinks);

router.use(protect, adminOnly);
router.get('/', getLinks);
router.post('/', validate(marketingLinkSchema), createLink);
router.get('/:id', getLink);
router.put('/:id', validate(marketingLinkUpdateSchema), updateLink);
router.delete('/:id', deleteLink);

module.exports = router;
