const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    foodName: { type: String, required: true },
    category: {
      type: String,
      enum: ['cooked', 'raw', 'packaged', 'beverages', 'dairy', 'bakery', 'other'],
      required: true,
    },
    isVeg: { type: Boolean, default: true },
    quantity: { type: Number, required: true },
    quantityUnit: { type: String, enum: ['kg', 'litres', 'servings', 'packets'], default: 'kg' },
    cookedTime: { type: Date, required: true },
    storageCondition: {
      type: String,
      enum: ['room_temp', 'refrigerated', 'frozen'],
      default: 'room_temp',
    },
    pickupDeadline: { type: Date, required: true },
    images: [{ type: String }],
    description: { type: String },
    pickupAddress: { type: String, required: true },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },

    // Freshness scoring (calculated)
    freshnessScore: { type: Number, default: 100 },
    freshnessBadge: {
      type: String,
      enum: ['Fresh', 'Good', 'Use Soon', 'Critical'],
      default: 'Fresh',
    },

    status: {
      type: String,
      enum: ['pending', 'matched', 'assigned', 'picked_up', 'in_transit', 'delivered', 'verified', 'expired', 'cancelled'],
      default: 'pending',
    },

    matchedNGO: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    matchedAt: { type: Date }, // when the NGO accepted this donation
    assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mealsEquivalent: { type: Number, default: 0 },
    co2Saved: { type: Number, default: 0 }, // kg

    // Rule-based recovery recommendation -- set when a donation can no
    // longer be safely redistributed (freshness hit 0 / deadline passed
    // while still pending). This is a RECOMMENDATION only; the platform
    // does not claim to physically route food anywhere.
    recoveryRecommendation: {
      needed: { type: Boolean, default: false },
      pathway: { type: String }, // e.g. 'Composting', 'Biogas / Anaerobic Digestion'
      reason: { type: String },
      recommendedAt: { type: Date },
    },
  },
  { timestamps: true }
);

donationSchema.index({ location: '2dsphere' });
donationSchema.index({ status: 1 });
donationSchema.index({ donor: 1 });

module.exports = mongoose.model('Donation', donationSchema);
