const mongoose = require('mongoose');

const deliveryLogSchema = new mongoose.Schema(
  {
    donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true },
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // FSM States
    statusHistory: [
      {
        status: {
          type: String,
          enum: ['requested', 'accepted', 'picked_up', 'in_transit', 'delivered', 'verified'],
        },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
        location: {
          lat: Number,
          lng: Number,
        },
      },
    ],

    currentStatus: {
      type: String,
      enum: ['requested', 'accepted', 'picked_up', 'in_transit', 'delivered', 'verified'],
      default: 'requested',
    },

    volunteerLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },

    deliveredAt: { type: Date },
    verifiedAt: { type: Date },
    verificationNote: { type: String },
    volunteerRating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryLog', deliveryLogSchema);
