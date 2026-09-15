const Donation = require('../models/Donation');
const User = require('../models/User');
const DeliveryLog = require('../models/DeliveryLog');
const { analyzeHistoricalData } = require('../utils/historicalAnalysis');

// @route  GET /api/analytics/impact
exports.getImpactStats = async (req, res) => {
  try {
    const totalDonations = await Donation.countDocuments();
    const completedDonations = await Donation.countDocuments({ status: 'verified' });
    const activeDonations = await Donation.countDocuments({ status: { $in: ['pending', 'matched', 'assigned', 'picked_up', 'in_transit'] } });

    const foodSaved = await Donation.aggregate([
      { $match: { status: 'verified' } },
      { $group: { _id: null, total: { $sum: '$quantity' }, meals: { $sum: '$mealsEquivalent' }, co2: { $sum: '$co2Saved' } } },
    ]);

    const totalUsers = await User.countDocuments({ isActive: true });
    const donors = await User.countDocuments({ role: 'donor', isActive: true });
    const ngos = await User.countDocuments({ role: 'ngo', isActive: true });
    const volunteers = await User.countDocuments({ role: 'volunteer', isActive: true });

    // Last 7 days trend
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyTrend = await Donation.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          meals: { $sum: '$mealsEquivalent' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Category breakdown
    const categoryBreakdown = await Donation.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const stats = foodSaved[0] || { total: 0, meals: 0, co2: 0 };

    res.json({
      success: true,
      overview: {
        totalDonations,
        completedDonations,
        activeDonations,
        foodSavedKg: Math.round(stats.total),
        mealsRedistributed: stats.meals,
        co2ReducedKg: Math.round(stats.co2),
        livesImpacted: Math.round(stats.meals / 3),
        totalUsers,
        donors,
        ngos,
        volunteers,
      },
      charts: {
        dailyTrend,
        categoryBreakdown,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/analytics/admin
exports.getAdminStats = async (req, res) => {
  try {
    const activeDeliveries = await DeliveryLog.countDocuments({
      currentStatus: { $nin: ['verified'] },
    });

    const volunteerLeaderboard = await User.find({ role: 'volunteer' })
      .select('name completedDeliveries rating badges')
      .sort({ completedDeliveries: -1 })
      .limit(10);

    const recentDonations = await Donation.find()
      .populate('donor', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const statusBreakdown = await Donation.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      activeDeliveries,
      volunteerLeaderboard,
      recentDonations,
      statusBreakdown,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/analytics/historical
// PHASE 2 — Historical Impact Analysis + Actionable Recommendations.
// Rule-based analysis (see utils/historicalAnalysis.js for the exact
// thresholds and logic) — not an AI/ML model. Every recommendation traces
// back to a stated rule and the real numbers that triggered it.
//
// Scope: in this schema, a donor's User account IS the organization
// (Donation.donor is an indexed ref to User; there is no separate
// Organization model, and none is needed — each donor account already
// represents one organization, e.g. one hotel/restaurant). So:
//   - Logged in as 'donor': analysis is scoped to that donor's OWN
//     donations only (their organization's history), via
//     { donor: req.user._id }.
//   - Anyone else — admin, other logged-in roles, or an anonymous public
//     visitor (route uses optionalAuth, not protect) — gets the
//     platform-wide view, since none of those represent a single
//     organization. This is the same single data source and algorithm
//     for every caller; only the Mongo filter differs.
exports.getHistoricalAnalysis = async (req, res) => {
  try {
    const filter = req.user?.role === 'donor' ? { donor: req.user._id } : {};

    // Pull the fields the analysis actually needs — keep this light since
    // it may run over an organization's or the platform's full donation
    // history. mealsEquivalent/co2Saved are already computed and stored at
    // donation-creation/acceptance time (see donationController) — reused
    // here for the summary totals below, not recalculated with new logic.
    const donations = await Donation.find(filter)
      .select('category status quantity createdAt mealsEquivalent co2Saved')
      .lean();

    const analysis = analyzeHistoricalData(donations);

    // Simple aggregate totals from already-stored values, for the
    // Impact/CSR-Support Report. Computed whenever there's at least one
    // record — these are plain sums/rates, not pattern claims, so they
    // don't need the same minimum-sample-size threshold as `analysis`.
    let totals = null;
    if (donations.length > 0) {
      const successful = donations.filter((d) => d.status === 'verified').length;
      const decided = donations.filter((d) => d.status === 'verified' || d.status === 'expired').length;
      totals = {
        totalDonations: donations.length,
        successfulDonations: successful,
        redistributionRate: decided > 0 ? successful / decided : null,
        totalQuantityKg: Math.round(donations.reduce((s, d) => s + (d.quantity || 0), 0) * 10) / 10,
        totalMealsEquivalent: donations.reduce((s, d) => s + (d.mealsEquivalent || 0), 0),
        totalCO2SavedKg: Math.round(donations.reduce((s, d) => s + (d.co2Saved || 0), 0) * 10) / 10,
      };
    }

    res.json({
      success: true,
      scope: req.user?.role === 'donor' ? 'organization' : 'platform',
      totals,
      analysis,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
