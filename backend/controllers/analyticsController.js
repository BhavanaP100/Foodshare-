const Donation = require('../models/Donation');
const User = require('../models/User');
const DeliveryLog = require('../models/DeliveryLog');

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
