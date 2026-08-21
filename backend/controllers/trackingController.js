const DeliveryLog = require('../models/DeliveryLog');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { isValidTransition, kgToMeals, calculateFreshness, getRecoveryRecommendation, recommendVolunteersForDonation } = require('../utils/algorithms');

const NGO_AWARDABLE_BADGES = ['Speed Star', 'Careful Handler', 'Community Hero'];

// @route  GET /api/tracking/recommend/:donationId  (NGO)
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
    }).select('name phone rating completedDeliveries location isAvailable badges');

    const ranked = recommendVolunteersForDonation(donation, candidates, 20);

    const recommendations = ranked.map(({ volunteer, distance, score }) => ({
      _id: volunteer._id,
      name: volunteer.name,
      phone: volunteer.phone,
      rating: volunteer.rating,
      completedDeliveries: volunteer.completedDeliveries,
      isAvailable: volunteer.isAvailable,
      badges: volunteer.badges,
      distance,
      score,
      distanceScore: Math.round(Math.max(0, 100 - (distance / 20) * 100)),
      ratingScore: Math.round(Math.min(100, (volunteer.rating || 0) * 20)),
      availabilityScore: volunteer.isAvailable ? 100 : 0,
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
    if (donation.matchedNGO?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You did not accept this donation' });
    }
    if (donation.status !== 'matched') {
      return res.status(400).json({ success: false, message: 'This donation is not awaiting volunteer assignment' });
    }

    // Safety check: don't allow assigning someone who isn't actually an
    // eligible volunteer, even if the NGO bypasses the recommendation UI
    // and posts an arbitrary ID directly.
    const volunteer = await User.findById(volunteerId);
    if (!volunteer || volunteer.role !== 'volunteer' || !volunteer.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid volunteer' });
    }
    if (!volunteer.isAvailable) {
      return res.status(400).json({ success: false, message: 'This volunteer is not currently available' });
    }
    if (!volunteer.isVerified) {
      return res.status(400).json({ success: false, message: 'This volunteer is not yet verified for pickups' });
    }

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

// @route  POST /api/tracking/reject  (volunteer declines an assigned task)
// The existing FSM only ever moved forward (requested -> accepted -> ...);
// there was no way for a volunteer to actually decline. This reverts the
// donation to 'matched' so the NGO can pick a different volunteer, and
// marks the DeliveryLog 'rejected' rather than silently deleting history.
exports.rejectTask = async (req, res) => {
  try {
    const { donationId, reason } = req.body;

    const log = await DeliveryLog.findOne({ donation: donationId, volunteer: req.user._id });
    if (!log) return res.status(404).json({ success: false, message: 'Delivery log not found' });
    if (log.currentStatus !== 'requested') {
      return res.status(400).json({ success: false, message: 'This task can no longer be declined' });
    }

    log.currentStatus = 'rejected';
    log.statusHistory.push({ status: 'rejected', timestamp: new Date(), note: reason });
    await log.save();

    const donation = await Donation.findById(donationId);
    if (donation && donation.status === 'assigned') {
      donation.status = 'matched';
      donation.assignedVolunteer = undefined;
      await donation.save();
    }

    const io = req.app.get('io');
    io.to(`donation_${donationId}`).emit('status_update', { status: 'rejected', log });

    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  PUT /api/tracking/status  (volunteer updates FSM)
exports.updateStatus = async (req, res) => {
  try {
    const { donationId, newStatus, note, location } = req.body;

    if (newStatus === 'verified') {
      return res.status(403).json({
        success: false,
        message: 'Only the NGO can verify a delivery and rate the volunteer.',
      });
    }

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

    if (newStatus === 'accepted') {
      await Donation.findByIdAndUpdate(donationId, { status: 'assigned' });
    }

    let donationForNotify = null;

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
        donationForNotify = donation;
      }
    }

    await log.save();

    const io = req.app.get('io');
    io.to(`donation_${donationId}`).emit('status_update', { status: newStatus, log });

    // Notify the NGO directly the moment it's marked delivered — they need
    // to review and verify it, and won't necessarily have the tracking
    // page open when this happens.
    if (newStatus === 'delivered' && log.ngo) {
      io.to(`ngo_${log.ngo}`).emit('delivery_ready_for_review', {
        donationId,
        foodName: donationForNotify?.foodName,
        volunteerName: req.user.name,
      });
    }

    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  PUT /api/tracking/verify  (NGO confirms receipt, rates, optionally badges)
exports.verifyDelivery = async (req, res) => {
  try {
    const { donationId, rating, badge } = req.body;

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }
    if (badge && !NGO_AWARDABLE_BADGES.includes(badge)) {
      return res.status(400).json({ success: false, message: 'Invalid badge selection.' });
    }

    const log = await DeliveryLog.findOne({ donation: donationId, ngo: req.user._id });
    if (!log) return res.status(404).json({ success: false, message: 'Delivery log not found' });

    if (log.currentStatus !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Delivery must be marked "Delivered" by the volunteer before you can verify it.',
      });
    }

    log.currentStatus = 'verified';
    log.verifiedAt = new Date();
    if (rating) log.volunteerRating = rating;
    log.statusHistory.push({ status: 'verified', timestamp: new Date(), note: 'Verified and rated by NGO' });
    await log.save();

    await Donation.findByIdAndUpdate(donationId, { status: 'verified' });

    const volunteer = await User.findById(log.volunteer);
    if (volunteer) {
      const prevCompleted = volunteer.completedDeliveries || 0;
      const newCompleted = prevCompleted + 1;

      let newRating = volunteer.rating || 0;
      if (rating) {
        newRating = ((volunteer.rating || 0) * prevCompleted + rating) / newCompleted;
      }

      const badgeSet = new Set(volunteer.badges || []);
      if (newCompleted === 1) badgeSet.add('First Delivery');
      if (newCompleted === 10) badgeSet.add('10 Deliveries');
      if (newCompleted === 50) badgeSet.add('50 Deliveries');
      const hour = new Date().getHours();
      if (hour >= 22 || hour < 5) badgeSet.add('Night Hero');
      if (badge) badgeSet.add(badge);

      volunteer.completedDeliveries = newCompleted;
      volunteer.rating = Math.round(newRating * 10) / 10;
      volunteer.badges = Array.from(badgeSet);
      await volunteer.save();
    }

    const io = req.app.get('io');
    io.to(`donation_${donationId}`).emit('status_update', { status: 'verified', log });

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
      .populate('volunteer', 'name phone rating location badges')
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
      currentStatus: { $nin: ['verified', 'rejected'] },
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
// @route  GET /api/tracking/pending-review  (NGO)
// Deliveries this NGO has had marked "delivered" by a volunteer, but hasn't
// verified/rated yet. This is the persistent source of truth — the socket
// toast is just a live nudge, this endpoint is what actually shows the
// receipt is waiting, even after a refresh or if the NGO missed the toast.
exports.getPendingReview = async (req, res) => {
  try {
    const logs = await DeliveryLog.find({
      ngo: req.user._id,
      currentStatus: 'delivered',
    })
      .populate('donation')
      .populate('volunteer', 'name phone rating badges')
      .populate('donor', 'name phone address')
      .sort({ deliveredAt: -1 });

    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};