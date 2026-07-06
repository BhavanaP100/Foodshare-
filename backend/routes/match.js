// routes/match.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { smartMatchNGOs } = require('../utils/algorithms');

// Find best NGOs for a donation
router.get('/find/:donationId', protect, authorize('admin', 'ngo'), async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.donationId);
    if (!donation) return res.status(404).json({ success: false, message: 'Not found' });

    const ngos = await User.find({ role: 'ngo', isActive: true, 'location.coordinates': { $ne: [0, 0] } });
    const ranked = smartMatchNGOs(donation, ngos);

    res.json({ success: true, matches: ranked });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
