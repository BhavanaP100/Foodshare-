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

  const deadlineFactor = (deadline - now) / (1000 * 60 * 60); // hours left, can go negative

  const quantityPressure = quantity > 50 ? 0.95 : 1.0;

  let freshnessScore = Math.max(0, Math.min(100, Math.round((1 - effectiveDecay) * 100 * quantityPressure)));

  // Deadline passing is an "overdue for pickup" signal, not a food-safety
  // verdict by itself — a packaged or frozen item can still be perfectly
  // fine well after its suggested pickup window. So we only apply a mild
  // urgency cap as the deadline approaches/passes, and let the actual
  // decay curve (based on category + storage + time since cooked) keep
  // governing the real freshness score.
  if (deadlineFactor < 1 && deadlineFactor >= 0) {
    // Within the last hour before deadline — nudge toward "act now"
    freshnessScore = Math.min(freshnessScore, 30);
  } else if (deadlineFactor < 0) {
    // Past deadline — apply a modest penalty, not a hard zero, so the
    // underlying decay curve (which already reflects real spoilage) stays
    // the primary signal.
    freshnessScore = Math.max(0, freshnessScore - 15);
  }

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
 */
const getRecoveryRecommendation = (donation) => {
  const { category, quantity, freshnessScore = 0 } = donation;

  if (['cooked', 'dairy'].includes(category) && freshnessScore < 10 && quantity > 20) {
    return {
      option: 'biogas',
      reason: 'Large quantity of high-risk food far past safe freshness — not suitable for animal feed. Biogas/energy recovery is the safest option.',
    };
  }

  if (['cooked', 'dairy'].includes(category)) {
    return {
      option: 'animal_feed',
      reason: 'Cooked or dairy food past safe consumption window, but suitable for animal feed programs.',
    };
  }

  if (['raw', 'bakery', 'packaged', 'other'].includes(category)) {
    return {
      option: 'compost',
      reason: 'Organic/dry food waste is well suited for composting rather than landfill.',
    };
  }

  return {
    option: 'discard_safely',
    reason: 'No suitable recovery pathway identified for this food type — dispose of safely per local guidelines.',
  };
};

/**
 * ALGORITHM 6: Recommend Volunteers for a Donation
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
      const ratingScore = Math.min(100, (volunteer.rating || 0) * 20);
      const availabilityBonus = volunteer.isAvailable ? 15 : 0;

      const score = Math.round(0.6 * distanceScore + 0.25 * ratingScore + availabilityBonus);

      return { volunteer, distance, score: Math.min(100, score) };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored;
};

// Estimate meals from kg
const kgToMeals = (kg) => Math.round(kg * 2.5);

// Estimate CO2 saved from kg of food redistributed
const kgToCO2Saved = (kg) => Math.round(kg * 2.5 * 10) / 10;

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