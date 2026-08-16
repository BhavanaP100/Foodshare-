// routes/tracking.js
const express = require('express');
const router = express.Router();
const {
  assignVolunteer,
  updateStatus,
  updateLocation,
  getTrackingInfo,
  getVolunteerTasks,
  recommendVolunteers,
  rejectTask,
} = require('../controllers/trackingController');
const { protect, authorize } = require('../middleware/auth');

router.get('/recommend/:donationId', protect, authorize('ngo'), recommendVolunteers);
router.post('/assign', protect, authorize('ngo'), assignVolunteer);
router.post('/reject', protect, authorize('volunteer'), rejectTask);
router.put('/status', protect, authorize('volunteer'), updateStatus);
router.put('/location', protect, authorize('volunteer'), updateLocation);
router.get('/tasks', protect, authorize('volunteer'), getVolunteerTasks);
router.get('/:donationId', protect, getTrackingInfo);

module.exports = router;
