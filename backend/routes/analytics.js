// routes/admin.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Donation = require('../models/Donation');

// Get all users
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit));
    const total = await User.countDocuments(filter);
    res.json({ success: true, total, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Toggle user active status
router.put('/users/:id/toggle', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
