// routes/tracking.js
const express = require('express');
const router = express.Router();
const {
  assignVolunteer,
  updateStatus,
  updateLocation,
  getTrackingInfo,
  getVolunteerTasks,
} = require('../controllers/trackingController');
const { protect, authorize } = require('../middleware/auth');

router.post('/assign', protect, authorize('ngo'), assignVolunteer);
router.put('/status', protect, authorize('volunteer'), updateStatus);
router.put('/location', protect, authorize('volunteer'), updateLocation);
router.get('/:donationId', protect, getTrackingInfo);

module.exports = router;
