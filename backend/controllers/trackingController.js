const DeliveryLog = require('../models/DeliveryLog');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { isValidTransition, kgToMeals, calculateFreshness, getRecoveryRecommendation, recommendVolunteersForDonation } = require('../utils/algorithms');

// @route  GET /api/tracking/recommend/:donationId  (NGO)
// Suggests nearby verified + available volunteers for a donation the NGO
// has already accepted, ranked by distance, rating, and availability.
exports.getRecommendedVolunteers = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.donationId);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });

    if (String(donation.matchedNGO) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You have not accepted this donation.' });
    }

    const candidates = await User.find({
      role: 'volunteer',
      isActive: true,
      isVerified: true,
    }).select('name phone rating completedDeliveries location isAvailable');

    const ranked = recommendVolunteersForDonation(donation, candidates, 20);

    const recommendations = ranked.map(({ volunteer, distance, score }) => ({
      _id: volunteer._id,
      name: volunteer.name,
      phone: volunteer.phone,
      rating: volunteer.rating,
      completedDeliveries: volunteer.completedDeliveries,
      isAvailable: volunteer.isAvailable,
      distance,
      score,
    }));

    res.json({ success: true, recommendations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  POST /api/tracking/assign  (NGO assigns volunteer)
exports.assignVolunteer = async (req, res) => {
  try {
    const { donationId, volunteerId } = req.body;

    const donation = await Donation.findById(donationId);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });

    const volunteer = await User.findById(volunteerId);
    if (!volunteer || volunteer.role !== 'volunteer') {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }
    if (!volunteer.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'This volunteer is not yet verified and cannot be assigned deliveries.',
      });
    }

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

    const io = req.app.get('io');
    io.to(`donation_${donationId}`).emit('status_update', { status: 'requested', log });

    // Notify the assigned volunteer directly, in case they're on their
    // dashboard right now (not the tracking page, so the donation_ room
    // wouldn't reach them).
    io.to(`volunteer_${volunteerId}`).emit('new_assignment', {
      donationId,
      foodName: donation.foodName,
      ngoName: req.user.ngoName || req.user.name,
    });

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
      await User.findByIdAndUpdate(req.user._id, { $inc: { completedDeliveries: 1 } });
      await Donation.findByIdAndUpdate(donationId, { status: 'verified' });
    }

    if (newStatus === 'accepted') {
      await Donation.findByIdAndUpdate(donationId, { status: 'assigned' });
    }

    if (newStatus === 'picked_up') {
      const donation = await Donation.findById(donationId);
      if (donation) {
        const { freshnessScore, freshnessBadge } = calculateFreshness(donation);
        donation.freshnessScore = freshnessScore;
        donation.freshnessBadge = freshnessBadge;
        donation.freshnessAtPickup = { score: freshnessScore, badge: freshnessBadge, recordedAt: new Date() };
        donation.status = 'picked_up';
        await donation.save();
      }
    }

    if (newStatus === 'in_transit') {
      await Donation.findByIdAndUpdate(donationId, { status: 'in_transit' });
    }

    if (newStatus === 'delivered') {
      const donation = await Donation.findById(donationId);
      if (donation) {
        const { freshnessScore, freshnessBadge } = calculateFreshness(donation);
        donation.freshnessScore = freshnessScore;
        donation.freshnessBadge = freshnessBadge;
        donation.freshnessAtDelivery = { score: freshnessScore, badge: freshnessBadge, recordedAt: new Date() };
        donation.status = 'delivered';
        await donation.save();
      }
    }

    await log.save();

    const io = req.app.get('io');
    io.to(`donation_${donationId}`).emit('status_update', { status: newStatus, log });

    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  PUT /api/tracking/spoiled  (volunteer reports food spoiled mid-delivery)
exports.reportSpoiled = async (req, res) => {
  try {
    const { donationId, note } = req.body;

    const log = await DeliveryLog.findOne({ donation: donationId, volunteer: req.user._id });
    if (!log) return res.status(404).json({ success: false, message: 'Delivery log not found' });

    if (!['picked_up', 'in_transit'].includes(log.currentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Can only report spoilage while actively holding the food (picked up or in transit).',
      });
    }

    const donation = await Donation.findById(donationId);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });

    const { freshnessScore, freshnessBadge } = calculateFreshness(donation);
    const { option, reason } = getRecoveryRecommendation({
      category: donation.category,
      quantity: donation.quantity,
      freshnessScore,
    });

    donation.status = 'expired';
    donation.freshnessScore = freshnessScore;
    donation.freshnessBadge = freshnessBadge;
    donation.recoveryOption = option;
    donation.recoveryReason = reason;
    donation.spoiledAt = new Date();
    donation.spoiledStage = 'in_delivery';
    await donation.save();

    log.statusHistory.push({ status: log.currentStatus, timestamp: new Date(), note: note || 'Reported spoiled during delivery' });
    log.currentStatus = 'delivered';
    log.deliveredAt = new Date();
    await log.save();

    const io = req.app.get('io');
    io.to(`donation_${donationId}`).emit('status_update', { status: 'expired', log, spoiled: true });

    res.json({ success: true, donation, log });
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