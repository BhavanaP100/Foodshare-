// routes/volunteer.js
const express = require('express');
const router = express.Router();
const { getVolunteerTasks } = require('../controllers/trackingController');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

router.get('/tasks', protect, authorize('volunteer'), getVolunteerTasks);

router.get('/leaderboard', protect, async (req, res) => {
  try {
    const volunteers = await User.find({ role: 'volunteer', isActive: true })
      .select('name completedDeliveries rating badges avatar')
      .sort({ completedDeliveries: -1 })
      .limit(20);
    res.json({ success: true, volunteers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/available', protect, authorize('ngo', 'admin'), async (req, res) => {
  try {
    const volunteers = await User.find({ role: 'volunteer', isActive: true, isAvailable: true })
      .select('name phone rating completedDeliveries location')
      .sort({ rating: -1 });
    res.json({ success: true, volunteers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
