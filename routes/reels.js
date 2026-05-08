const express = require('express');
const router = express.Router();
const { getReels, createReel, updateReel, deleteReel } = require('../controllers/reelController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', getReels);
router.post('/', protect, adminOnly, createReel);
router.put('/:id', protect, adminOnly, updateReel);
router.delete('/:id', protect, adminOnly, deleteReel);

module.exports = router;
