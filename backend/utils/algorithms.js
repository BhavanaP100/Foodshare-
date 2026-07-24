/**
 * ALGORITHM 1: Freshness Evaluation
 * Weighted Scoring Model
 *
 * Factors:
 *  - Time Elapsed since cooking
 *  - Food Type Risk (cooked > raw > packaged)
 *  - Storage Condition (room temp < refrigerated < frozen)
 *  - Quantity (large quantities need faster action)
 *
 * Output: freshnessScore (0–100), freshnessBadge
 */

const FOOD_TYPE_RISK = {
  cooked: 1.5,    // highest risk - degrades fastest
  dairy: 1.3,
  bakery: 1.2,
  raw: 1.0,
  beverages: 0.8,
  packaged: 0.5,
  other: 1.0,
};

const STORAGE_MODIFIER = {
  room_temp: 1.0,   // no protection
  refrigerated: 0.5, // slows decay
  frozen: 0.2,       // greatly slows decay
};

/**
 * Calculate freshness score for a donation
 * @param {Object} donation - donation object
 * @returns {{ freshnessScore: number, freshnessBadge: string, urgencyLevel: string }}
 */
const calculateFreshness = (donation) => {
  const { cookedTime, category, storageCondition, quantity, pickupDeadline } = donation;

  const now = Date.now();
  const cooked = new Date(cookedTime).getTime();
  const deadline = new Date(pickupDeadline).getTime();

  // Hours since cooking
  const hoursElapsed = (now - cooked) / (1000 * 60 * 60);

  // Max safe hours by category (base values)
  const maxSafeHours = {
    cooked: 6,
    dairy: 8,
    bakery: 12,
    raw: 24,
    beverages: 48,
    packaged: 720, // packaged lasts months
    other: 12,
  };

  const maxHours = maxSafeHours[category] || 12;
  const riskMultiplier = FOOD_TYPE_RISK[category] || 1.0;
  const storageBoost = STORAGE_MODIFIER[storageCondition] || 1.0;

  // Effective decay rate
  const effectiveDecay = (hoursElapsed * riskMultiplier * storageBoost) / maxHours;

  // Time-to-deadline factor (urgency)
  const deadlineFactor = Math.max(0, (deadline - now) / (1000 * 60 * 60)); // hours left

  // Quantity pressure (>50 portions adds urgency)
  const quantityPressure = quantity > 50 ? 0.95 : 1.0;

  // Base freshness score (100 → 0)
  let freshnessScore = Math.max(0, Math.round((1 - effectiveDecay) * 100 * quantityPressure));

  // Deadline override - if deadline is within 1 hour, cap at 20
  if (deadlineFactor < 1) freshnessScore = Math.min(freshnessScore, 20);
  if (deadlineFactor < 0) freshnessScore = 0;

  // Badge assignment
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

  // Ensure urgency buckets align with frontend expectations.
  // Frontend LateNightRescue explicitly renders only:
  //   - critical
  //   - high ("Use Soon")
  // Other levels will effectively fall into the default "pending" pool.
  if (urgencyLevel === 'medium') urgencyLevel = 'high';
  if (urgencyLevel === 'low') urgencyLevel = 'medium';

  return { freshnessScore, freshnessBadge, urgencyLevel };
};

/**
 * ALGORITHM 2: Haversine Formula
 * Calculate distance between two geographic points in km
 *
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} distance in km
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // km, 1 decimal
};

const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * ALGORITHM 3: Smart Matching
 * Multi-Criteria Decision-Based Ranking
 *
 * Scores each NGO candidate using:
 *  - Freshness of donation (higher = more urgent = prioritize closer NGOs)
 *  - Distance to NGO (lower = better)
 *  - NGO availability/capacity
 *
 * @param {Object} donation - the donation with freshness score
 * @param {Array} ngoList - list of NGO users with location + capacity
 * @returns {Array} ranked NGO list
 */
const smartMatchNGOs = (donation, ngoList) => {
  const [donLng, donLat] = donation.location.coordinates;
  const { freshnessScore } = donation;

  const MAX_DISTANCE = 20; // km radius

  const scored = ngoList
    .map((ngo) => {
      const [ngoLng, ngoLat] = ngo.location.coordinates;
      const distance = haversineDistance(donLat, donLng, ngoLat, ngoLng);

      if (distance > MAX_DISTANCE) return null;

      // Normalize distance score (0–100, lower distance = higher score)
      const distanceScore = Math.max(0, 100 - (distance / MAX_DISTANCE) * 100);

      // Capacity score
      const capacityScore = Math.min(100, (ngo.capacity / donation.quantity) * 100);

      // Availability bonus
      const availabilityBonus = ngo.isActive ? 10 : 0;

      // Urgency weight: critical donations weight distance more heavily
      const urgencyWeight = freshnessScore < 30 ? 0.6 : 0.4;

      // Composite score
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
 * ALGORITHM 4: Volunteer Finite State Machine
 * Valid state transitions
 */
const DELIVERY_STATES = {
  requested: ['accepted'],
  accepted: ['picked_up'],
  picked_up: ['in_transit'],
  in_transit: ['delivered'],
  delivered: ['verified'],
  verified: [], // terminal state
};

const isValidTransition = (fromState, toState) => {
  return DELIVERY_STATES[fromState]?.includes(toState) ?? false;
};

// Estimate meals from kg
const kgToMeals = (kg) => Math.round(kg * 2.5);

// Estimate CO2 saved from kg of food redistributed
// ~2.5 kg CO2 saved per kg food not wasted (avg across food types)
const kgToCO2Saved = (kg) => Math.round(kg * 2.5 * 10) / 10;

module.exports = {
  calculateFreshness,
  haversineDistance,
  smartMatchNGOs,
  isValidTransition,
  DELIVERY_STATES,
  kgToMeals,
  kgToCO2Saved,
};
