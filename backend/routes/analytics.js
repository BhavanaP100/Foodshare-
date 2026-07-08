// routes/analytics.js
const express = require('express');
const router = express.Router();
const { getImpactStats, getAdminStats } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/impact', getImpactStats); // public
router.get('/admin', protect, authorize('admin'), getAdminStats);

module.exports = router;
