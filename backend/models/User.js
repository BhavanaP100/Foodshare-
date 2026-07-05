const mongoose = require('mongoose');

const impactAnalyticsSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true },
    mealsRedistributed: { type: Number, default: 0 },
    foodSavedKg: { type: Number, default: 0 },
    co2ReducedKg: { type: Number, default: 0 },
    activeDonors: { type: Number, default: 0 },
    activeNGOs: { type: Number, default: 0 },
    activeVolunteers: { type: Number, default: 0 },
    completedDeliveries: { type: Number, default: 0 },
    lateNightRescues: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ImpactAnalytics', impactAnalyticsSchema);
