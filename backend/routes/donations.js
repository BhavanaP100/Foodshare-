const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  addDonation,
  getMyDonations,
  getAvailableDonations,
  getLateNightDonations,
  acceptDonation,
  getAllDonations,
  getDonationById,
} = require('../controllers/donationController');
const { protect, authorize } = require('../middleware/auth');

// Multer config for food images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, `food_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/add', protect, authorize('donor'), upload.array('images', 5), addDonation);
router.get('/my', protect, authorize('donor'), getMyDonations);
router.get('/available', protect, authorize('ngo', 'volunteer'), getAvailableDonations);
router.get('/late-night', protect, getLateNightDonations);

router.post('/:id/accept', protect, authorize('ngo', 'customer'), acceptDonation);
router.get('/all', protect, authorize('admin'), getAllDonations);
router.get('/:id', protect, getDonationById);

module.exports = router;
