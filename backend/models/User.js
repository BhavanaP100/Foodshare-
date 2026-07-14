const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      required: true,
      enum: ['donor', 'ngo', 'volunteer','admin'],
    },

    phone: { type: String },
    address: { type: String },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        // [lng, lat]
        index: '2dsphere',
      },
    },

    // NGO fields
    ngoName: { type: String },
    registrationNumber: { type: String },
    capacity: { type: Number, default: 100 },

    // Donor field: saved default pickup location (e.g. restaurant, bakery,
    // wedding hall, office -- not necessarily the donor's own home/GPS
    // location). Used to auto-fill Add Food so donors don't have to
    // "detect location" (their current device location) every time.
    defaultPickupLocation: {
      name: { type: String },
      address: { type: String },
      lat: { type: Number },
      lng: { type: Number },
    },

    // Volunteer field: referenced by routes/volunteer.js and
    // authController.updateProfile but was missing from the schema, so it
    // was silently dropped on every save. Added here to fix that.
    isAvailable: { type: Boolean, default: true },

    // Common profile fields
    avatar: { type: String },

    // Status
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },

    // Profile/analytics fields referenced by authController.login response
    totalDonations: { type: Number, default: 0 },
    completedDeliveries: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    badges: [{ type: String }],
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

