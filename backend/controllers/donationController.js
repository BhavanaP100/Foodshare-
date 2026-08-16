const Donation = require('../models/Donation');
const User = require('../models/User');
const {
  calculateFreshness, smartMatchNGOs, rankDonationsForNGO,
  getRecoveryRecommendation, haversineDistance, kgToMeals, kgToCO2Saved,
} = require('../utils/algorithms');

// A 'pending' donation whose freshness has fully decayed to 0 (or whose
// pickup deadline has passed) can no longer be safely redistributed.
// Lazily flip it to 'expired' with a recovery recommendation the first
// time anyone fetches it, rather than requiring a cron job. Best-effort:
// failures here don't block the response to the caller.
const maybeExpireDonation = async (donationDoc, freshnessScore) => {
  if (donationDoc.status !== 'pending' || freshnessScore > 0) return false;
  try {
    const { pathway, reason } = getRecoveryRecommendation(donationDoc);
    donationDoc.status = 'expired';
    donationDoc.recoveryRecommendation = { needed: true, pathway, reason, recommendedAt: new Date() };
    await donationDoc.save();
    return true;
  } catch {
    return false;
  }
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

    // Resolve pickup location: use what was submitted (this covers both the
    // "use my saved default" case, where the frontend pre-fills the fields,
    // and a one-time override). Fall back to the donor's saved default
    // pickup location server-side as well, in case the client omitted it.
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

    // Calculate freshness on creation
    const { freshnessScore, freshnessBadge } = calculateFreshness(donationData);
    donationData.freshnessScore = freshnessScore;
    donationData.freshnessBadge = freshnessBadge;
    donationData.mealsEquivalent = kgToMeals(quantity);
    donationData.co2Saved = kgToCO2Saved(quantity);

    const donation = await Donation.create(donationData);

    // Increment donor stats
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

    // Refresh freshness scores live, and flag anything that's fully
    // decayed while still pending with a recovery recommendation.
    const updated = await Promise.all(donations.map(async (d) => {
      const { freshnessScore, freshnessBadge } = calculateFreshness(d);
      await maybeExpireDonation(d, freshnessScore);
      return { ...d.toObject(), freshnessScore, freshnessBadge };
    }));

    res.json({ success: true, donations: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/donations/available
// For NGOs - see available (pending) donations, ranked per-NGO by distance,
// this NGO's capacity fit, and each donation's live-recalculated freshness/urgency.
exports.getAvailableDonations = async (req, res) => {
  try {
    const { category, isVeg, maxDistance = 20 } = req.query;
    const ngo = req.user;

    // NGO must have a saved location (set at registration or in Settings)
    // for distance-based matching to work. Without this the query below
    // would throw trying to destructure undefined coordinates.
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

    const donations = await Donation.find(filter).populate('donor', 'name phone address');

    // Recompute freshness live and drop anything that's fully decayed
    // (auto-expired with a recovery recommendation) before ranking.
    const stillValid = [];
    for (const d of donations) {
      const { freshnessScore } = calculateFreshness(d);
      const expired = await maybeExpireDonation(d, freshnessScore);
      if (!expired) stillValid.push(d);
    }

    // Weighted ranking (distance + this NGO's capacity fit + freshness/urgency),
    // freshness is recalculated live for every donation as part of this call.
    const ranked = rankDonationsForNGO(ngo, stillValid, parseFloat(maxDistance));

    const enriched = ranked.map(({ donation, distance, freshnessScore, freshnessBadge, urgencyLevel, matchScore }) => ({
      ...donation.toObject(),
      distance,
      freshnessScore,
      freshnessBadge,
      urgencyLevel,
      matchScore,
    }));

    res.json({ success: true, donations: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/donations/late-night
// Late-night view should show ALL pending donations during the active window (22:00–05:00).
exports.getLateNightDonations = async (req, res) => {
  try {
    const now = new Date();
    const hour = now.getHours();
    const isLateNight = hour >= 22 || hour < 5;

    // Show all pending donations while late-night mode is active.
    // (Frontend can categorize by freshnessBadge/urgencyLevel.)
    if (!isLateNight) {
      return res.json({ success: true, donations: [], isLateNight });
    }

    const donations = await Donation.find({ status: 'pending' })
      .populate('donor', 'name phone address')
      .sort({ createdAt: -1 });


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

    // Re-evaluate freshness using CURRENT time right before acceptance --
    // the NGO must not be able to accept using a stale/outdated freshness
    // state from whenever the list was last fetched.
    const { freshnessScore, freshnessBadge } = calculateFreshness(donation);
    if (freshnessScore <= 0) {
      const { pathway, reason } = getRecoveryRecommendation(donation);
      donation.status = 'expired';
      donation.freshnessScore = 0;
      donation.freshnessBadge = 'Critical';
      donation.recoveryRecommendation = { needed: true, pathway, reason, recommendedAt: new Date() };
      await donation.save();
      return res.status(409).json({
        success: false,
        code: 'DONATION_EXPIRED',
        message: 'This donation is no longer suitable for redistribution — it expired between listing and acceptance.',
        recoveryRecommendation: donation.recoveryRecommendation,
      });
    }

    donation.status = 'matched';
    donation.matchedNGO = req.user._id;
    donation.matchedAt = new Date();
    // Persist the just-recalculated freshness too, so anyone viewing this
    // donation afterward sees the value it was actually accepted at.
    donation.freshnessScore = freshnessScore;
    donation.freshnessBadge = freshnessBadge;
    await donation.save();

    res.json({ success: true, donation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/donations/accepted
// For NGOs - every donation THEY accepted (matchedNGO === self), at any
// stage of the pipeline (matched/assigned/picked_up/in_transit/delivered/
// verified). Deliberately separate from /available, which only ever
// returns status:'pending' donations from all donors -- an accepted
// donation would otherwise have nowhere to persist on the NGO's side.
exports.getAcceptedDonations = async (req, res) => {
  try {
    const ngo = req.user;

    const donations = await Donation.find({ matchedNGO: ngo._id })
      .populate('donor', 'name phone address')
      .populate('assignedVolunteer', 'name phone rating isVerified')
      .sort({ createdAt: -1 });

    const hasNGOLocation = ngo.location?.coordinates?.length === 2;
    const [ngoLng, ngoLat] = hasNGOLocation ? ngo.location.coordinates : [];

    const enriched = donations.map((d) => {
      let distance;
      if (hasNGOLocation && d.location?.coordinates?.length === 2) {
        const [donLng, donLat] = d.location.coordinates;
        distance = haversineDistance(ngoLat, ngoLng, donLat, donLng);
      }
      return { ...d.toObject(), distance };
    });

    res.json({ success: true, donations: enriched });
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
    const donations = await Donation.find(filter)
      .populate('donor', 'name email')
      .populate('matchedNGO', 'name ngoName')
      .populate('assignedVolunteer', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

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

    const { freshnessScore, freshnessBadge, urgencyLevel } = calculateFreshness(donation);
    res.json({ success: true, donation: { ...donation.toObject(), freshnessScore, freshnessBadge, urgencyLevel } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
