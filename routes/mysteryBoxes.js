const express = require('express');
const router = express.Router();
const {
  getMysteryBoxes, getMysteryBox, createMysteryBox,
  updateMysteryBox, deleteMysteryBox, getAllMysteryBoxesAdmin,
} = require('../controllers/mysteryBoxController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', getMysteryBoxes);
router.get('/:id', getMysteryBox);

router.get('/admin/all', protect, adminOnly, getAllMysteryBoxesAdmin);
router.post('/', protect, adminOnly, upload.single('image'), createMysteryBox);
router.put('/:id', protect, adminOnly, upload.single('image'), updateMysteryBox);
router.delete('/:id', protect, adminOnly, deleteMysteryBox);

module.exports = router;
