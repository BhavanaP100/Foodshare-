const Donation = require('../models/Donation');
const User = require('../models/User');
const {
  calculateFreshness,
  smartMatchNGOs,
  rankDonationsForNGO,
  getRecoveryRecommendation,
  kgToMeals,
  kgToCO2Saved,
} = require('../utils/algorithms');

// Auto-expire a donation only when BOTH its pickup deadline has passed AND
// its real freshness (decay curve) has actually dropped to critical —
// this stops well-stored/packaged food from being yanked into "expired"
// the instant a suggested pickup window closes, while still catching food
// that has genuinely gone bad. Called opportunistically on read — no cron
// job needed.
const EXPIRE_FRESHNESS_THRESHOLD = 15;

const autoExpireIfNeeded = async (donation) => {
  if (!['pending', 'matched', 'assigned'].includes(donation.status)) {
    return donation;
  }

  const deadlinePassed = new Date(donation.pickupDeadline).getTime() < Date.now();
  if (!deadlinePassed) return donation;

  const { freshnessScore, freshnessBadge } = calculateFreshness(donation);

  if (freshnessScore > EXPIRE_FRESHNESS_THRESHOLD) {
    // Deadline passed, but the food is still genuinely fresh (e.g. packaged
    // or frozen) — keep it active and just refresh its score, don't expire it.
    donation.freshnessScore = freshnessScore;
    donation.freshnessBadge = freshnessBadge;
    await donation.save();
    return donation;
  }

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
  donation.spoiledStage = 'missed_pickup';
  await donation.save();

  return donation;
};

// @route  POST /api/donations/add
exports.addDonation = async (req, res) => {
  try {
    const {
      foodName, category, isVeg, quantity, quantityUnit,
      cookedTime, storageCondition, pickupDeadline, pickupAddress,
      location, description,
    } = req.body;

    const images = req.files ? req.files.map((f) => `/uploads/${f.filename}`) : [];

    const savedDefault = req.user.defaultPickupLocation;
    const resolvedLat = location?.lat ?? savedDefault?.lat;
    const resolvedLng = location?.lng ?? savedDefault?.lng;
    const resolvedAddress = pickupAddress || savedDefault?.address;

    if (!resolvedLat || !resolvedLng) {
      return res.status(400).json({
        success: false,
        message: 'Pickup location is required. Set a default pickup location in Settings or provide one for this donation.',
      });
    }

    const donationData = {
      donor: req.user._id,
      foodName, category, isVeg, quantity, quantityUnit,
      cookedTime, storageCondition, pickupDeadline, description,
      pickupAddress: resolvedAddress,
      images,
      location: {
        type: 'Point',
        coordinates: [parseFloat(resolvedLng), parseFloat(resolvedLat)],
      },
    };

    const { freshnessScore, freshnessBadge } = calculateFreshness(donationData);
    donationData.freshnessScore = freshnessScore;
    donationData.freshnessBadge = freshnessBadge;
    donationData.mealsEquivalent = kgToMeals(quantity);
    donationData.co2Saved = kgToCO2Saved(quantity);

    const donation = await Donation.create(donationData);

    await User.findByIdAndUpdate(req.user._id, { $inc: { totalDonations: 1 } });

    res.status(201).json({ success: true, donation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/donations/my
exports.getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user._id })
      .populate('matchedNGO', 'name ngoName')
      .populate('assignedVolunteer', 'name rating')
      .sort({ createdAt: -1 });

    const updated = [];
    for (const d of donations) {
      await autoExpireIfNeeded(d);
      const { freshnessScore, freshnessBadge } = calculateFreshness(d);
      // Don't overwrite a freshly-set 'expired' state's score/badge
      if (d.status !== 'expired') {
        updated.push({ ...d.toObject(), freshnessScore, freshnessBadge });
      } else {
        updated.push(d.toObject());
      }
    }

    res.json({ success: true, donations: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/donations/available
// For NGOs - see available (pending) donations, ranked per-NGO by distance,
// this NGO's capacity fit, freshness/urgency, pickup urgency, NGO demand,
// and platform-wide volunteer availability.
exports.getAvailableDonations = async (req, res) => {
  try {
    const { category, isVeg, maxDistance = 20 } = req.query;
    const ngo = req.user;

    if (!ngo.location?.coordinates || ngo.location.coordinates.length < 2) {
      return res.status(400).json({
        success: false,
        code: 'NGO_LOCATION_MISSING',
        message: 'Please set your organization location in Settings to see nearby donations.',
      });
    }

    const filter = { status: 'pending' };
    if (category) filter.category = category;
    if (typeof isVeg !== 'undefined') filter.isVeg = isVeg === 'true';

    let donations = await Donation.find(filter).populate('donor', 'name phone address');

    // Expire any that genuinely need it before ranking; anything still
    // fresh despite a passed deadline stays pending and gets ranked normally.
    const stillPending = [];
    for (const d of donations) {
      await autoExpireIfNeeded(d);
      if (d.status === 'pending') stillPending.push(d);
    }
    donations = stillPending;

    // NGO demand — fewer active commitments relative to capacity = higher
    // demand score (more room to take on new donations).
    const activeCount = await Donation.countDocuments({
      matchedNGO: ngo._id,
      status: { $in: ['matched', 'assigned', 'picked_up', 'in_transit'] },
    });
    const ngoDemandScore = Math.max(0, Math.min(100, 100 - activeCount * 15));

    // Volunteer availability — platform-wide count of verified + available
    // volunteers (not geo-filtered; volunteers don't currently save a location).
    const availableVolunteerCount = await User.countDocuments({
      role: 'volunteer', isActive: true, isAvailable: true, isVerified: true,
    });
    const volunteerAvailabilityScore = Math.min(100, availableVolunteerCount * 20);

    const ranked = rankDonationsForNGO(ngo, donations, {
      maxDistance: parseFloat(maxDistance),
      ngoDemandScore,
      volunteerAvailabilityScore,
    });

    const enriched = ranked.map(({ donation, distance, freshnessScore, freshnessBadge, urgencyLevel, pickupUrgencyScore, matchScore }) => ({
      ...donation.toObject(),
      distance,
      freshnessScore,
      freshnessBadge,
      urgencyLevel,
      pickupUrgencyScore,
      matchScore,
    }));

    res.json({ success: true, donations: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/donations/late-night
exports.getLateNightDonations = async (req, res) => {
  try {
    const now = new Date();
    const hour = now.getHours();
    const isLateNight = hour >= 22 || hour < 5;

    if (!isLateNight) {
      return res.json({ success: true, donations: [], isLateNight });
    }

    let donations = await Donation.find({ status: 'pending' })
      .populate('donor', 'name phone address')
      .sort({ createdAt: -1 });

    const stillPending = [];
    for (const d of donations) {
      await autoExpireIfNeeded(d);
      if (d.status === 'pending') stillPending.push(d);
    }
    donations = stillPending;

    const enriched = donations.map((d) => {
      const { freshnessScore, freshnessBadge, urgencyLevel } = calculateFreshness(d);
      const minutesLeft = Math.max(0, Math.round((new Date(d.pickupDeadline) - Date.now()) / 60000));
      return { ...d.toObject(), freshnessScore, freshnessBadge, urgencyLevel, minutesLeft };
    });

    res.json({ success: true, donations: enriched, isLateNight });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  POST /api/donations/:id/accept
exports.acceptDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
    if (donation.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Donation already claimed' });
    }

    const ngo = req.user;

    // Capacity-based split: if the donation's quantity exceeds this NGO's
    // capacity, spin off the remainder as a new pending donation (same
    // donor/details) so other NGOs can claim it, and cap this donation's
    // quantity to what this NGO can actually take.
    if (ngo.role === 'ngo' && donation.quantity > ngo.capacity) {
      const originalQuantity = donation.quantity;
      const remainingQty = originalQuantity - ngo.capacity;

      const remainderData = {
        donor: donation.donor,
        foodName: donation.foodName,
        category: donation.category,
        isVeg: donation.isVeg,
        quantity: remainingQty,
        quantityUnit: donation.quantityUnit,
        cookedTime: donation.cookedTime,
        storageCondition: donation.storageCondition,
        pickupDeadline: donation.pickupDeadline,
        pickupAddress: donation.pickupAddress,
        location: donation.location,
        description: donation.description,
        images: donation.images,
        status: 'pending',
        mealsEquivalent: kgToMeals(remainingQty),
        co2Saved: kgToCO2Saved(remainingQty),
        wasSplit: true,
        originalQuantity,
      };
      const { freshnessScore: rfs, freshnessBadge: rfb } = calculateFreshness(remainderData);
      remainderData.freshnessScore = rfs;
      remainderData.freshnessBadge = rfb;
      await Donation.create(remainderData);

      donation.wasSplit = true;
      donation.originalQuantity = originalQuantity;
      donation.quantity = ngo.capacity;
      donation.mealsEquivalent = kgToMeals(ngo.capacity);
      donation.co2Saved = kgToCO2Saved(ngo.capacity);
    }

    // Re-evaluate freshness at the moment of NGO acceptance and snapshot it.
    const { freshnessScore, freshnessBadge } = calculateFreshness(donation);
    donation.freshnessScore = freshnessScore;
    donation.freshnessBadge = freshnessBadge;
    donation.freshnessAtAcceptance = {
      score: freshnessScore,
      badge: freshnessBadge,
      recordedAt: new Date(),
    };

    donation.status = 'matched';
    donation.matchedNGO = req.user._id;
    await donation.save();

    res.json({ success: true, donation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/donations/all  (admin)
exports.getAllDonations = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total = await Donation.countDocuments(filter);
    let donations = await Donation.find(filter)
      .populate('donor', 'name email')
      .populate('matchedNGO', 'name ngoName')
      .populate('assignedVolunteer', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    for (const d of donations) {
      await autoExpireIfNeeded(d);
    }

    res.json({ success: true, total, page: parseInt(page), donations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/donations/:id
exports.getDonationById = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'name phone address location')
      .populate('matchedNGO', 'name ngoName address location')
      .populate('assignedVolunteer', 'name phone rating');

    if (!donation) return res.status(404).json({ success: false, message: 'Not found' });

    await autoExpireIfNeeded(donation);

    const { freshnessScore, freshnessBadge, urgencyLevel } = calculateFreshness(donation);
    res.json({ success: true, donation: { ...donation.toObject(), freshnessScore, freshnessBadge, urgencyLevel } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  PUT /api/donations/:id/recovery-action  (donor confirms they handled recovery)
exports.markRecoveryAction = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });

    if (String(donation.donor) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only act on your own donations.' });
    }
    if (donation.status !== 'expired') {
      return res.status(400).json({ success: false, message: 'This donation is not in a recovery-needed state.' });
    }
    if (donation.recoveryActionTaken) {
      return res.status(400).json({ success: false, message: 'Recovery action already recorded for this donation.' });
    }

    donation.recoveryActionTaken = true;
    donation.recoveryActionTakenAt = new Date();
    await donation.save();

    res.json({ success: true, donation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};