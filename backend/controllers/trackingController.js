const DeliveryLog = require('../models/DeliveryLog');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { isValidTransition, kgToMeals } = require('../utils/algorithms');

// @route  POST /api/tracking/assign  (NGO assigns volunteer)
exports.assignVolunteer = async (req, res) => {
  try {
    const { donationId, volunteerId } = req.body;

    const donation = await Donation.findById(donationId);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });

    donation.assignedVolunteer = volunteerId;
    donation.status = 'assigned';
    await donation.save();

    const log = await DeliveryLog.create({
      donation: donationId,
      volunteer: volunteerId,
      donor: donation.donor,
      ngo: req.user._id,
      currentStatus: 'requested',
      statusHistory: [{ status: 'requested', timestamp: new Date() }],
    });

    // Notify via socket
    const io = req.app.get('io');
    io.to(`donation_${donationId}`).emit('status_update', { status: 'requested', log });

    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  PUT /api/tracking/status  (volunteer updates FSM)
exports.updateStatus = async (req, res) => {
  try {
    const { donationId, newStatus, note, location } = req.body;

    const log = await DeliveryLog.findOne({ donation: donationId, volunteer: req.user._id });
    if (!log) return res.status(404).json({ success: false, message: 'Delivery log not found' });

    if (!isValidTransition(log.currentStatus, newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition: ${log.currentStatus} → ${newStatus}`,
      });
    }

    log.currentStatus = newStatus;
    log.statusHistory.push({ status: newStatus, timestamp: new Date(), note, location });

    if (newStatus === 'delivered') log.deliveredAt = new Date();
    if (newStatus === 'verified') {
      log.verifiedAt = new Date();
      // Update volunteer stats
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { completedDeliveries: 1 },
      });
      // Update donation status
      await Donation.findByIdAndUpdate(donationId, { status: 'verified' });
    }

    if (newStatus === 'accepted') {
      await Donation.findByIdAndUpdate(donationId, { status: 'assigned' });
    }
    if (newStatus === 'picked_up') {
      await Donation.findByIdAndUpdate(donationId, { status: 'picked_up' });
    }
    if (newStatus === 'in_transit') {
      await Donation.findByIdAndUpdate(donationId, { status: 'in_transit' });
    }

    await log.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`donation_${donationId}`).emit('status_update', { status: newStatus, log });

    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  PUT /api/tracking/location  (volunteer updates GPS)
exports.updateLocation = async (req, res) => {
  try {
    const { donationId, lat, lng } = req.body;

    const log = await DeliveryLog.findOneAndUpdate(
      { donation: donationId, volunteer: req.user._id },
      { volunteerLocation: { lat, lng, updatedAt: new Date() } },
      { new: true }
    );

    const io = req.app.get('io');
    io.to(`donation_${donationId}`).emit('location_update', { lat, lng });

    res.json({ success: true, location: { lat, lng } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/tracking/:donationId
exports.getTrackingInfo = async (req, res) => {
  try {
    const log = await DeliveryLog.findOne({ donation: req.params.donationId })
      .populate('volunteer', 'name phone rating location')
      .populate('donor', 'name phone address location')
      .populate('ngo', 'name ngoName address location')
      .populate('donation');

    if (!log) return res.status(404).json({ success: false, message: 'No tracking data found' });

    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/volunteer/tasks
exports.getVolunteerTasks = async (req, res) => {
  try {
    const active = await DeliveryLog.find({
      volunteer: req.user._id,
      currentStatus: { $nin: ['verified'] },
    })
      .populate('donation')
      .populate('donor', 'name phone address')
      .populate('ngo', 'name ngoName address')
      .sort({ createdAt: -1 });

    const completed = await DeliveryLog.find({
      volunteer: req.user._id,
      currentStatus: 'verified',
    })
      .populate('donation')
      .sort({ verifiedAt: -1 })
      .limit(10);

    res.json({ success: true, active, completed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
