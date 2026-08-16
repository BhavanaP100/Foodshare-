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

  let freshnessScore = Math.max(0, Math.min(100, Math.round((1 - effectiveDecay) * 100 * quantityPressure)));

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
 * ALGORITHM 3b: Rank donations for a specific NGO
 * Same weighted model as smartMatchNGOs, but inverted — scores every
 * available donation from one NGO's point of view (distance to that NGO,
 * that NGO's capacity, and the donation's own freshness/urgency).
 *
 * Used by GET /api/donations/available so each NGO sees donations
 * prioritized specifically for them (their location, their capacity),
 * rather than a single global ordering.
 *
 * @param {Object} ngo - the NGO user (must have location + capacity)
 * @param {Array} donations - list of pending donation documents
 * @param {number} maxDistance - km radius cutoff
 * @returns {Array} { donation, distance, freshnessScore, freshnessBadge, urgencyLevel, matchScore }, sorted best-first
 */
const rankDonationsForNGO = (ngo, donations, maxDistance = 20) => {
  const [ngoLng, ngoLat] = ngo.location.coordinates;

  return donations
    .map((donation) => {
      const [donLng, donLat] = donation.location.coordinates;
      const distance = haversineDistance(ngoLat, ngoLng, donLat, donLng);

      if (distance > maxDistance) return null;

      const { freshnessScore, freshnessBadge, urgencyLevel } = calculateFreshness(donation);

      // Normalize distance (closer = higher score)
      const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);

      // How well this NGO's capacity fits the donation's quantity
      const capacityScore = Math.min(100, (ngo.capacity / donation.quantity) * 100);

      const availabilityBonus = ngo.isActive ? 10 : 0;

      // Urgent (low-freshness) donations weight distance more heavily —
      // get it to the nearest NGO fast before it's gone.
      const urgencyWeight = freshnessScore < 30 ? 0.6 : 0.4;

      const rawScore =
        urgencyWeight * distanceScore +
        (1 - urgencyWeight) * 0.7 * capacityScore +
        availabilityBonus;

      return {
        donation,
        distance,
        freshnessScore,
        freshnessBadge,
        urgencyLevel,
        matchScore: Math.min(100, Math.round(rawScore)),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.matchScore - a.matchScore);
};

/**
 * ALGORITHM 5: Volunteer Recommendation
 * Multi-Criteria Decision-Based Ranking (rule-based, NOT ML)
 *
 * When an NGO accepts a donation, it needs to pick a volunteer to pick it
 * up. Rather than "give it to the highest-rated volunteer," this ranks
 * every eligible candidate using the same kind of weighted, explainable
 * scoring as smartMatchNGOs/rankDonationsForNGO above.
 *
 * Eligibility (hard filters, not scored):
 *  - role === 'volunteer'
 *  - isActive
 *  - isAvailable
 *  - isVerified  (admin-verified for food handling/trust)
 *
 * Scoring (for those who pass the filters):
 *  - Distance to the donation's pickup location (closer = better)
 *  - Rating (higher = better, small weight — this is a tie-breaker,
 *    NOT the primary factor, per the "not just highest-rated" requirement)
 *
 * A volunteer with no saved location is still included (can't be excluded
 * just because they haven't set a location yet) but ranked behind anyone
 * with a known, closer distance, and flagged accordingly.
 *
 * Returns each candidate with a plain-language `reasons` array so the
 * recommendation is explainable to the NGO, e.g.:
 *   ["2.4 km away", "Available", "Verified"]
 *
 * @param {Object} donation - the accepted donation (needs .location)
 * @param {Array} volunteers - candidate User documents (role: 'volunteer')
 * @param {number} maxDistance - km radius cutoff for "nearby" (soft, for display only)
 * @returns {Array} ranked list: { volunteer, distance, score, reasons }
 */
const rankVolunteersForDonation = (donation, volunteers, maxDistance = 20) => {
  const [donLng, donLat] = donation.location.coordinates;

  const eligible = volunteers.filter(
    (v) => v.role === 'volunteer' && v.isActive && v.isAvailable && v.isVerified
  );

  const scored = eligible.map((v) => {
    const hasLocation = v.location?.coordinates?.length === 2 &&
      (v.location.coordinates[0] !== 0 || v.location.coordinates[1] !== 0);

    let distance = null;
    let distanceScore = 40; // neutral-ish default when distance is unknown
    if (hasLocation) {
      const [vLng, vLat] = v.location.coordinates;
      distance = haversineDistance(donLat, donLng, vLat, vLng);
      distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);
    }

    const ratingScore = Math.min(100, ((v.rating || 0) / 5) * 100);

    // Distance dominates (this is a pickup logistics problem first);
    // rating is a secondary tie-breaker, not the primary driver.
    const score = Math.round(0.75 * distanceScore + 0.25 * ratingScore);

    const reasons = [];
    reasons.push(hasLocation ? `${distance} km away` : 'Distance unknown (no saved location)');
    reasons.push('Available');
    reasons.push('Verified');
    if (v.rating) reasons.push(`⭐ ${v.rating.toFixed(1)} rating`);

    return { volunteer: v, distance, score, reasons, hasLocation };
  });

  // Known-distance candidates first (best logistics info), ranked by score;
  // unknown-distance candidates after, also ranked by score among themselves.
  scored.sort((a, b) => {
    if (a.hasLocation !== b.hasLocation) return a.hasLocation ? -1 : 1;
    return b.score - a.score;
  });

  return scored;
};

/**
 * ALGORITHM 6: Recovery Recommendation
 * Rule-Based Pathway Suggestion (NOT waste collection -- a recommendation only)
 *
 * When a donation can no longer be safely redistributed to people (freshness
 * hit 0, or its pickup deadline passed while still unclaimed), recommend an
 * appropriate organic-waste recovery pathway based on its category. This is
 * a simple lookup table, not a scientific or food-safety claim.
 *
 * @param {Object} donation - donation with category/freshnessScore/pickupDeadline
 * @returns {{ pathway: string, reason: string }}
 */
const RECOVERY_PATHWAY_BY_CATEGORY = {
  cooked: 'Composting',
  raw: 'Composting',
  bakery: 'Composting',
  dairy: 'Biogas / Anaerobic Digestion',
  beverages: 'Biogas / Anaerobic Digestion',
  packaged: 'Composting',
  other: 'Composting',
};

const getRecoveryRecommendation = (donation) => {
  const pathway = RECOVERY_PATHWAY_BY_CATEGORY[donation.category] || 'Composting';
  const deadlinePassed = new Date(donation.pickupDeadline).getTime() < Date.now();

  const reason = deadlinePassed
    ? 'Pickup deadline passed before the donation could be redistributed.'
    : 'Donation could not be redistributed within the safe time window.';

  return { pathway, reason: `${reason} Recommended recovery pathway: ${pathway}.` };
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
  rankDonationsForNGO,
  rankVolunteersForDonation,
  getRecoveryRecommendation,
  isValidTransition,
  DELIVERY_STATES,
  kgToMeals,
  kgToCO2Saved,
};
