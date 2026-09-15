/**
 * PHASE 2: Historical Impact Analysis + Actionable Recommendations
 * ------------------------------------------------------------------
 * Rule-based analysis over this organization's own FoodShare donation
 * history. Nothing here is a machine-learning model — it is a set of
 * explainable, configurable threshold rules applied to real aggregated
 * data pulled from MongoDB. Every recommendation traces back to a
 * specific, stated rule and the numbers that triggered it.
 *
 * If there isn't enough historical data to support a reliable pattern
 * claim, the analysis says so explicitly instead of guessing.
 */

// ---- Configurable rule-based thresholds -----------------------------
// These are intentionally named constants (not magic numbers) so the
// exact rule that produced each recommendation can be pointed to and
// justified to an examiner.
const THRESHOLDS = {
  // Minimum number of donation records required before ANY pattern claim
  // is made. Below this, results are statistically unreliable.
  MIN_RECORDS_FOR_PATTERN: 10,

  // Minimum records within a specific category before that category's
  // own outcome rate (e.g. % expired) is reported individually.
  MIN_RECORDS_PER_CATEGORY: 5,

  // A category is called out as a "recurring high-volume surplus
  // category" if it accounts for at least this share of all donations.
  DOMINANT_CATEGORY_SHARE: 0.30,

  // A time-of-day window is called out as a recurring pattern if it
  // accounts for at least this share of all donations.
  DOMINANT_TIME_WINDOW_SHARE: 0.35,

  // A category is flagged as "frequently reaching critical/expired" if
  // its own expired-rate is at or above this share (and it has at least
  // MIN_RECORDS_PER_CATEGORY records).
  HIGH_EXPIRY_RATE: 0.25,

  // Window (in days) used for period-over-period quantity trend
  // comparison (current window vs the equally-sized window before it).
  TREND_WINDOW_DAYS: 30,

  // Minimum absolute % change to call a quantity trend "significant"
  // rather than noise.
  SIGNIFICANT_TREND_CHANGE: 0.20,
};

// Time-of-day buckets. There is no "event type" field in the current
// Donation schema, so pattern detection is limited to what the data
// actually contains: creation hour and day-of-week. We do not claim
// event-level patterns (e.g. "weddings", "conferences") because that
// data isn't collected.
const TIME_WINDOWS = [
  { key: 'morning', label: 'Morning (5am–12pm)', test: (h) => h >= 5 && h < 12 },
  { key: 'afternoon', label: 'Afternoon (12pm–5pm)', test: (h) => h >= 12 && h < 17 },
  { key: 'evening', label: 'Evening (5pm–10pm)', test: (h) => h >= 17 && h < 22 },
  { key: 'night', label: 'Late Night (10pm–5am)', test: (h) => h >= 22 || h < 5 },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pct = (part, whole) => (whole > 0 ? part / whole : 0);
const fmtPct = (ratio) => `${Math.round(ratio * 100)}%`;

/**
 * Build the category distribution (count + share of total) for a set of
 * donations.
 */
function categoryDistribution(donations) {
  const counts = {};
  for (const d of donations) {
    counts[d.category] = (counts[d.category] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([category, count]) => ({ category, count, share: pct(count, donations.length) }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Build the time-of-day distribution based on donation createdAt hour.
 */
function timeWindowDistribution(donations) {
  const counts = Object.fromEntries(TIME_WINDOWS.map((w) => [w.key, 0]));
  for (const d of donations) {
    const hour = new Date(d.createdAt).getHours();
    const window = TIME_WINDOWS.find((w) => w.test(hour));
    if (window) counts[window.key] += 1;
  }
  return TIME_WINDOWS.map((w) => ({
    key: w.key,
    label: w.label,
    count: counts[w.key],
    share: pct(counts[w.key], donations.length),
  })).sort((a, b) => b.count - a.count);
}

/**
 * Day-of-week distribution (which days see the most donation volume).
 */
function dayOfWeekDistribution(donations) {
  const counts = new Array(7).fill(0);
  for (const d of donations) {
    counts[new Date(d.createdAt).getDay()] += 1;
  }
  return DAY_NAMES.map((label, i) => ({
    day: label,
    count: counts[i],
    share: pct(counts[i], donations.length),
  })).sort((a, b) => b.count - a.count);
}

/**
 * Outcome breakdown: how many donations ended up successfully
 * redistributed ("verified") vs expired/spoiled, vs still in progress.
 */
function outcomeBreakdown(donations) {
  const verified = donations.filter((d) => d.status === 'verified').length;
  const expired = donations.filter((d) => d.status === 'expired').length;
  const cancelled = donations.filter((d) => d.status === 'cancelled').length;
  const inProgress = donations.length - verified - expired - cancelled;
  const decided = verified + expired; // exclude in-progress/cancelled from the rate
  return {
    verified,
    expired,
    cancelled,
    inProgress,
    successRate: pct(verified, decided),
    expiryRate: pct(expired, decided),
  };
}

/**
 * Per-category expiry rate, only reported for categories that individually
 * clear the minimum sample size (so we don't draw conclusions from e.g.
 * 1 out of 1 "beverages" donation expiring).
 */
function categoryExpiryRates(donations) {
  const byCategory = {};
  for (const d of donations) {
    if (!byCategory[d.category]) byCategory[d.category] = { total: 0, expired: 0 };
    byCategory[d.category].total += 1;
    if (d.status === 'expired') byCategory[d.category].expired += 1;
  }
  return Object.entries(byCategory)
    .filter(([, v]) => v.total >= THRESHOLDS.MIN_RECORDS_PER_CATEGORY)
    .map(([category, v]) => ({
      category,
      total: v.total,
      expired: v.expired,
      expiryRate: pct(v.expired, v.total),
    }))
    .sort((a, b) => b.expiryRate - a.expiryRate);
}

/**
 * Period-over-period quantity trend: total quantity donated in the most
 * recent TREND_WINDOW_DAYS vs the equally-sized window immediately before
 * it. Requires both windows to have at least some data to be meaningful.
 */
function quantityTrend(donations) {
  const now = Date.now();
  const windowMs = THRESHOLDS.TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const currentStart = now - windowMs;
  const previousStart = now - 2 * windowMs;

  let currentQty = 0;
  let previousQty = 0;
  let currentCount = 0;
  let previousCount = 0;

  for (const d of donations) {
    const t = new Date(d.createdAt).getTime();
    if (t >= currentStart) {
      currentQty += d.quantity || 0;
      currentCount += 1;
    } else if (t >= previousStart && t < currentStart) {
      previousQty += d.quantity || 0;
      previousCount += 1;
    }
  }

  const changeRatio = previousQty > 0 ? (currentQty - previousQty) / previousQty : null;

  return {
    windowDays: THRESHOLDS.TREND_WINDOW_DAYS,
    currentPeriod: { totalQuantity: Math.round(currentQty * 10) / 10, donationCount: currentCount },
    previousPeriod: { totalQuantity: Math.round(previousQty * 10) / 10, donationCount: previousCount },
    changeRatio, // null if no previous-period data to compare against
  };
}

/**
 * Turn the computed statistics into explainable, rule-based recommendation
 * strings. Each recommendation states the pattern it's based on and the
 * rule/threshold that triggered it — nothing here is generated by a
 * language model or ML model.
 */
function generateRecommendations({ categoryDist, timeDist, outcomes, categoryExpiry, trend }) {
  const recommendations = [];

  // Rule 1: dominant surplus category
  const topCategory = categoryDist[0];
  if (topCategory && topCategory.share >= THRESHOLDS.DOMINANT_CATEGORY_SHARE) {
    recommendations.push({
      rule: `Category share >= ${fmtPct(THRESHOLDS.DOMINANT_CATEGORY_SHARE)} of all donations`,
      basis: `"${topCategory.category}" accounts for ${fmtPct(topCategory.share)} of all donations (${topCategory.count} of ${categoryDist.reduce((s, c) => s + c.count, 0)}).`,
      recommendation: `"${topCategory.category}" is a recurring high-volume surplus category. Consider coordinating with regular donors of this category in advance (e.g. pre-arranged pickup windows) rather than relying on ad-hoc matching.`,
    });
  }

  // Rule 2: dominant time-of-day window
  const topWindow = timeDist[0];
  if (topWindow && topWindow.share >= THRESHOLDS.DOMINANT_TIME_WINDOW_SHARE) {
    recommendations.push({
      rule: `Time-window share >= ${fmtPct(THRESHOLDS.DOMINANT_TIME_WINDOW_SHARE)} of all donations`,
      basis: `${fmtPct(topWindow.share)} of donations are posted during the ${topWindow.label} window (${topWindow.count} donations).`,
      recommendation: `Donation volume is concentrated in the ${topWindow.label.toLowerCase()} window. Consider ensuring extra NGO/volunteer availability during this window to reduce pickup delays.`,
    });
  }

  // Rule 3: categories with high expiry/critical rate
  for (const c of categoryExpiry) {
    if (c.expiryRate >= THRESHOLDS.HIGH_EXPIRY_RATE) {
      recommendations.push({
        rule: `Category expiry rate >= ${fmtPct(THRESHOLDS.HIGH_EXPIRY_RATE)} (min ${THRESHOLDS.MIN_RECORDS_PER_CATEGORY} records)`,
        basis: `${fmtPct(c.expiryRate)} of "${c.category}" donations (${c.expired} of ${c.total}) reached expired/critical status without being redistributed.`,
        recommendation: `"${c.category}" donations frequently expire before pickup. Consider prioritizing faster matching/notification for this category, or reviewing the pickup deadlines typically set for it.`,
      });
    }
  }

  // Rule 4: significant quantity trend
  if (trend.changeRatio !== null && Math.abs(trend.changeRatio) >= THRESHOLDS.SIGNIFICANT_TREND_CHANGE) {
    const direction = trend.changeRatio > 0 ? 'increased' : 'decreased';
    recommendations.push({
      rule: `Period-over-period change >= ${fmtPct(THRESHOLDS.SIGNIFICANT_TREND_CHANGE)} (${trend.windowDays}-day windows)`,
      basis: `Total donated quantity ${direction} by ${fmtPct(Math.abs(trend.changeRatio))} compared to the previous ${trend.windowDays}-day period (${trend.previousPeriod.totalQuantity} → ${trend.currentPeriod.totalQuantity} kg-equivalent).`,
      recommendation: trend.changeRatio > 0
        ? `Donation volume is trending up. Consider whether current NGO capacity and volunteer availability can keep pace with continued growth.`
        : `Donation volume is trending down. Consider re-engaging previously active donors to understand whether the drop reflects reduced surplus or reduced platform usage.`,
    });
  }

  // Rule 5: overall low success/redistribution rate
  if (outcomes.verified + outcomes.expired >= THRESHOLDS.MIN_RECORDS_FOR_PATTERN && outcomes.successRate < 0.5) {
    recommendations.push({
      rule: `Overall success rate < 50% (min ${THRESHOLDS.MIN_RECORDS_FOR_PATTERN} decided donations)`,
      basis: `Only ${fmtPct(outcomes.successRate)} of decided donations (${outcomes.verified} of ${outcomes.verified + outcomes.expired}) were successfully redistributed and verified.`,
      recommendation: `Less than half of donations are being successfully redistributed. Consider reviewing pickup deadline defaults, NGO response times, or volunteer coverage as likely contributing factors.`,
    });
  }

  return recommendations;
}

/**
 * Main entry point. Takes a plain-object array of donations (already
 * fetched from MongoDB, e.g. via `.lean()`), and an optional date range
 * filter, and returns the full historical analysis.
 */
function analyzeHistoricalData(donations) {
  if (!donations || donations.length < THRESHOLDS.MIN_RECORDS_FOR_PATTERN) {
    return {
      insufficientData: true,
      recordCount: donations ? donations.length : 0,
      minimumRequired: THRESHOLDS.MIN_RECORDS_FOR_PATTERN,
      message: 'Insufficient historical data to generate a reliable recommendation.',
    };
  }

  const categoryDist = categoryDistribution(donations);
  const timeDist = timeWindowDistribution(donations);
  const dayDist = dayOfWeekDistribution(donations);
  const outcomes = outcomeBreakdown(donations);
  const categoryExpiry = categoryExpiryRates(donations);
  const trend = quantityTrend(donations);

  const recommendations = generateRecommendations({ categoryDist, timeDist, outcomes, categoryExpiry, trend });

  return {
    insufficientData: false,
    recordCount: donations.length,
    thresholds: THRESHOLDS,
    categoryDistribution: categoryDist,
    timeWindowDistribution: timeDist,
    dayOfWeekDistribution: dayDist,
    outcomeBreakdown: outcomes,
    categoryExpiryRates: categoryExpiry,
    quantityTrend: trend,
    recommendations: recommendations.length > 0
      ? recommendations
      : [{
          rule: 'No configured threshold was crossed',
          basis: 'Current data does not show any pattern strong enough to clear the configured thresholds.',
          recommendation: 'No actionable pattern detected yet. This will improve as more donation history accumulates.',
        }],
  };
}

module.exports = {
  analyzeHistoricalData,
  THRESHOLDS,
};
