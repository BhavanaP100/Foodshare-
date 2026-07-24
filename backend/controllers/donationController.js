const Donation = require('../models/Donation');
const User = require('../models/User');
const { calculateFreshness, smartMatchNGOs, kgToMeals, kgToCO2Saved } = require('../utils/algorithms');

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

    // Refresh freshness scores
    const updated = donations.map((d) => {
      const { freshnessScore, freshnessBadge } = calculateFreshness(d);
      return { ...d.toObject(), freshnessScore, freshnessBadge };
    });

    res.json({ success: true, donations: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/donations/available
// For NGOs - see available (pending) donations sorted by smart ranking
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

    const donations = await Donation.find(filter)
      .populate('donor', 'name phone address')
      .sort({ freshnessScore: -1, createdAt: -1 });

    // Calculate distance and freshness for each
    const [ngoLng, ngoLat] = ngo.location.coordinates;
    const { haversineDistance } = require('../utils/algorithms');

    const enriched = donations
      .map((d) => {
        const [donLng, donLat] = d.location.coordinates;
        const distance = haversineDistance(ngoLat, ngoLng, donLat, donLng);
        const { freshnessScore, freshnessBadge, urgencyLevel } = calculateFreshness(d);

        if (distance > parseFloat(maxDistance)) return null;

        return {
          ...d.toObject(),
          distance,
          freshnessScore,
          freshnessBadge,
          urgencyLevel,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.freshnessScore - a.freshnessScore || a.distance - b.distance);

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
