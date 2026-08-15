/**
 * ALGORITHM 1: Freshness Evaluation
 * Weighted Scoring Model
 */

const FOOD_TYPE_RISK = {
  cooked: 1.5,
  dairy: 1.3,
  bakery: 1.2,
  raw: 1.0,
  beverages: 0.8,
  packaged: 0.5,
  other: 1.0,
};

const STORAGE_MODIFIER = {
  room_temp: 1.0,
  refrigerated: 0.5,
  frozen: 0.2,
};

const calculateFreshness = (donation) => {
  const { cookedTime, category, storageCondition, quantity, pickupDeadline } = donation;

  const now = Date.now();
  const cooked = new Date(cookedTime).getTime();
  const deadline = new Date(pickupDeadline).getTime();

  const hoursElapsed = (now - cooked) / (1000 * 60 * 60);

  const maxSafeHours = {
    cooked: 6,
    dairy: 8,
    bakery: 12,
    raw: 24,
    beverages: 48,
    packaged: 720,
    other: 12,
  };

  const maxHours = maxSafeHours[category] || 12;
  const riskMultiplier = FOOD_TYPE_RISK[category] || 1.0;
  const storageBoost = STORAGE_MODIFIER[storageCondition] || 1.0;

  const effectiveDecay = (hoursElapsed * riskMultiplier * storageBoost) / maxHours;

  const deadlineFactor = Math.max(0, (deadline - now) / (1000 * 60 * 60));

  const quantityPressure = quantity > 50 ? 0.95 : 1.0;

  // Clamped 0–100 — previously had no upper bound, which let scores blow
  // past 100 when cookedTime was in the future (bad input / tz mismatch).
  let freshnessScore = Math.max(0, Math.min(100, Math.round((1 - effectiveDecay) * 100 * quantityPressure)));

  if (deadlineFactor < 1) freshnessScore = Math.min(freshnessScore, 20);
  if (deadlineFactor < 0) freshnessScore = 0;

  let freshnessBadge;
  let urgencyLevel;

  if (freshnessScore >= 75) {
    freshnessBadge = 'Fresh';
    urgencyLevel = 'low';
  } else if (freshnessScore >= 50) {
    freshnessBadge = 'Good';
    urgencyLevel = 'medium';
  } else if (freshnessScore >= 25) {
    freshnessBadge = 'Use Soon';
    urgencyLevel = 'high';
  } else {
    freshnessBadge = 'Critical';
    urgencyLevel = 'critical';
  }

  if (urgencyLevel === 'medium') urgencyLevel = 'high';
  if (urgencyLevel === 'low') urgencyLevel = 'medium';

  return { freshnessScore, freshnessBadge, urgencyLevel };
};

/**
 * ALGORITHM 2: Haversine Formula
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * ALGORITHM 3: Smart Matching (donation → NGO list direction)
 */
const smartMatchNGOs = (donation, ngoList) => {
  const [donLng, donLat] = donation.location.coordinates;
  const { freshnessScore } = donation;

  const MAX_DISTANCE = 20;

  const scored = ngoList
    .map((ngo) => {
      const [ngoLng, ngoLat] = ngo.location.coordinates;
      const distance = haversineDistance(donLat, donLng, ngoLat, ngoLng);

      if (distance > MAX_DISTANCE) return null;

      const distanceScore = Math.max(0, 100 - (distance / MAX_DISTANCE) * 100);
      const capacityScore = Math.min(100, (ngo.capacity / donation.quantity) * 100);
      const availabilityBonus = ngo.isActive ? 10 : 0;
      const urgencyWeight = freshnessScore < 30 ? 0.6 : 0.4;

      const totalScore =
        urgencyWeight * distanceScore +
        (1 - urgencyWeight) * 0.7 * capacityScore +
        availabilityBonus;

      return {
        ngo,
        distance,
        distanceScore,
        capacityScore,
        totalScore: Math.round(totalScore),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.totalScore - a.totalScore);

  return scored;
};

/**
 * ALGORITHM 3b: Rank donations for a specific NGO
 *
 * Composite weighting:
 *  - 60% core score (distance to NGO + this NGO's capacity fit + freshness urgency weighting — same model as before)
 *  - 15% pickup urgency (time left until pickupDeadline, independent of decay)
 *  - 15% NGO demand (how much spare capacity this NGO currently has vs its active commitments)
 *  - 10% volunteer availability (platform-wide count of verified+available volunteers —
 *        see note: not geographically filtered since volunteers don't currently save a location)
 *
 * @param {Object} ngo
 * @param {Array} donations
 * @param {Object} options - { maxDistance, ngoDemandScore, volunteerAvailabilityScore }
 */
const rankDonationsForNGO = (ngo, donations, options = {}) => {
  const {
    maxDistance = 20,
    ngoDemandScore = 50,
    volunteerAvailabilityScore = 50,
  } = options;

  const [ngoLng, ngoLat] = ngo.location.coordinates;

  return donations
    .map((donation) => {
      const [donLng, donLat] = donation.location.coordinates;
      const distance = haversineDistance(ngoLat, ngoLng, donLat, donLng);

      if (distance > maxDistance) return null;

      const { freshnessScore, freshnessBadge, urgencyLevel } = calculateFreshness(donation);

      const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);
      const capacityScore = Math.min(100, (ngo.capacity / donation.quantity) * 100);
      const availabilityBonus = ngo.isActive ? 10 : 0;
      const urgencyWeight = freshnessScore < 30 ? 0.6 : 0.4;

      const coreScore = Math.min(
        100,
        urgencyWeight * distanceScore + (1 - urgencyWeight) * 0.7 * capacityScore + availabilityBonus
      );

      // Pickup urgency — purely time-to-deadline, independent of decay curve.
      // A donation could be nutritionally "Fresh" but have a very tight deadline.
      const hoursLeft = Math.max(0, (new Date(donation.pickupDeadline).getTime() - Date.now()) / (1000 * 60 * 60));
      const pickupUrgencyScore = hoursLeft <= 0 ? 100 : Math.max(0, 100 - (hoursLeft / 24) * 100);

      const matchScore = Math.round(
        0.6 * coreScore +
        0.15 * pickupUrgencyScore +
        0.15 * ngoDemandScore +
        0.10 * volunteerAvailabilityScore
      );

      return {
        donation,
        distance,
        freshnessScore,
        freshnessBadge,
        urgencyLevel,
        pickupUrgencyScore: Math.round(pickupUrgencyScore),
        matchScore: Math.min(100, matchScore),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.matchScore - a.matchScore);
};

/**
 * ALGORITHM 4: Volunteer Finite State Machine
 */
const DELIVERY_STATES = {
  requested: ['accepted'],
  accepted: ['picked_up'],
  picked_up: ['in_transit'],
  in_transit: ['delivered'],
  delivered: ['verified'],
  verified: [],
};

const isValidTransition = (fromState, toState) => {
  return DELIVERY_STATES[fromState]?.includes(toState) ?? false;
};

/**
 * ALGORITHM 5: Recovery Recommendation
 * For donations that expired or spoiled before reaching a recipient.
 * Rule-based, using category, storage, quantity, and how far freshness had
 * decayed at the point of failure.
 *
 * @param {Object} donation - must include category, quantity, and freshnessScore
 * @returns {{ option: 'compost'|'animal_feed'|'biogas'|'discard_safely', reason: string }}
 */
const getRecoveryRecommendation = (donation) => {
  const { category, quantity, freshnessScore = 0 } = donation;

  // Very large volume of high-risk food, badly decayed — unsafe even for
  // animal feed, best routed to biogas/energy recovery.
  if (['cooked', 'dairy'].includes(category) && freshnessScore < 10 && quantity > 20) {
    return {
      option: 'biogas',
      reason: 'Large quantity of high-risk food far past safe freshness — not suitable for animal feed. Biogas/energy recovery is the safest option.',
    };
  }

  // Cooked/dairy food that spoiled but isn't heavily contaminated —
  // can still go to animal feed programs.
  if (['cooked', 'dairy'].includes(category)) {
    return {
      option: 'animal_feed',
      reason: 'Cooked or dairy food past safe consumption window, but suitable for animal feed programs.',
    };
  }

  // Raw produce, bakery, and packaged dry goods compost well.
  if (['raw', 'bakery', 'packaged', 'other'].includes(category)) {
    return {
      option: 'compost',
      reason: 'Organic/dry food waste is well suited for composting rather than landfill.',
    };
  }

  // Beverages and anything else — default to safe disposal.
  return {
    option: 'discard_safely',
    reason: 'No suitable recovery pathway identified for this food type — dispose of safely per local guidelines.',
  };
};

// Estimate meals from kg
const kgToMeals = (kg) => Math.round(kg * 2.5);

// Estimate CO2 saved from kg of food redistributed
const kgToCO2Saved = (kg) => Math.round(kg * 2.5 * 10) / 10;


/**
 * ALGORITHM 6: Recommend Volunteers for a Donation
 * Once an NGO accepts a donation, find nearby verified + available
 * volunteers ranked by distance, rating, and availability.
 *
 * @param {Object} donation - accepted donation (needs location.coordinates)
 * @param {Array} volunteerList - candidate volunteers (must have location.coordinates)
 * @param {number} maxDistance - km radius cutoff
 * @returns {Array} { volunteer, distance, score }, sorted best-first
 */
const recommendVolunteersForDonation = (donation, volunteerList, maxDistance = 20) => {
  const [donLng, donLat] = donation.location.coordinates;

  const scored = volunteerList
    .map((volunteer) => {
      if (!volunteer.location?.coordinates || volunteer.location.coordinates.length < 2) return null;
      const [volLng, volLat] = volunteer.location.coordinates;
      const distance = haversineDistance(donLat, donLng, volLat, volLng);

      if (distance > maxDistance) return null;

      const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);
      const ratingScore = Math.min(100, (volunteer.rating || 0) * 20); // rating is 0-5
      const availabilityBonus = volunteer.isAvailable ? 15 : 0;

      const score = Math.round(0.6 * distanceScore + 0.25 * ratingScore + availabilityBonus);

      return { volunteer, distance, score: Math.min(100, score) };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored;
};
module.exports = {
  calculateFreshness,
  haversineDistance,
  smartMatchNGOs,
  rankDonationsForNGO,
  recommendVolunteersForDonation,
  getRecoveryRecommendation,
  isValidTransition,
  DELIVERY_STATES,
  kgToMeals,
  kgToCO2Saved,
};