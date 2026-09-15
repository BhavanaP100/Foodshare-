// routes/analytics.js
const express = require('express');
const router = express.Router();
const { getImpactStats, getAdminStats, getHistoricalAnalysis } = require('../controllers/analyticsController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

router.get('/impact', getImpactStats); // public — platform-wide aggregate stats
// Public/optional auth: a logged-in donor gets their own organization's
// history; anyone else (admin, other roles, or an anonymous visitor) gets
// the platform-wide view. Single endpoint, single algorithm — see
// getHistoricalAnalysis for the exact scoping rule.
router.get('/historical', optionalAuth, getHistoricalAnalysis);
router.get('/admin', protect, authorize('admin'), getAdminStats);

module.exports = router;
