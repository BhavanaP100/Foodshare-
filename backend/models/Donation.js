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
      coordinates: { type: [Number], required: true },
    },

    freshnessScore: { type: Number, default: 100 },
    freshnessBadge: {
      type: String,
      enum: ['Fresh', 'Good', 'Use Soon', 'Critical'],
      default: 'Fresh',
    },

    freshnessAtAcceptance: {
      score: { type: Number },
      badge: { type: String },
      recordedAt: { type: Date },
    },
    freshnessAtPickup: {
      score: { type: Number },
      badge: { type: String },
      recordedAt: { type: Date },
    },
    freshnessAtDelivery: {
      score: { type: Number },
      badge: { type: String },
      recordedAt: { type: Date },
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
    co2Saved: { type: Number, default: 0 },

    // Recovery — populated when a donation expires (missed pickup deadline)
    // or is reported spoiled mid-delivery by a volunteer.
    recoveryOption: {
      type: String,
      enum: ['compost', 'animal_feed', 'biogas', 'discard_safely'],
    },
    recoveryReason: { type: String },
    spoiledAt: { type: Date },
    spoiledStage: {
      type: String,
      enum: ['missed_pickup', 'in_delivery'],
    },
    recoveryActionTaken: { type: Boolean, default: false },
recoveryActionTakenAt: { type: Date },

    // Capacity-based split — set when a donation's quantity exceeded the
    // accepting NGO's capacity and had to be divided; the remainder becomes
    // a new separate Donation document (see acceptDonation).
    wasSplit: { type: Boolean, default: false },
    originalQuantity: { type: Number },
  },
  { timestamps: true }
);


donationSchema.index({ location: '2dsphere' });
donationSchema.index({ status: 1 });
donationSchema.index({ donor: 1 });

module.exports = mongoose.model('Donation', donationSchema);
