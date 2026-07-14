const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @route  POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, address, location, ngoName, registrationNumber, capacity, defaultPickupLocation } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const userData = { name, email, password, role, phone, address };

    // NGOs (and volunteers, if ever provided) store their own base location
    // here -- this is what donation distance-matching queries against.
    if (location?.lat && location?.lng) {
      userData.location = {
        type: 'Point',
        coordinates: [parseFloat(location.lng), parseFloat(location.lat)],
      };
    }

    if (role === 'ngo') {
      userData.ngoName = ngoName;
      userData.registrationNumber = registrationNumber;
      userData.capacity = capacity || 100;
    }

    // Donors set a default pickup location (restaurant/org name + address +
    // coordinates) at signup, so future donations can auto-fill it instead
    // of relying on device GPS ("detect my location").
    if (role === 'donor' && defaultPickupLocation?.lat && defaultPickupLocation?.lng) {
      userData.defaultPickupLocation = {
        name: defaultPickupLocation.name || '',
        address: defaultPickupLocation.address || address || '',
        lat: parseFloat(defaultPickupLocation.lat),
        lng: parseFloat(defaultPickupLocation.lng),
      };
    }

    const user = await User.create(userData);
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        address: user.address,
        location: user.location,
        ngoName: user.ngoName,
        registrationNumber: user.registrationNumber,
        capacity: user.capacity,
        defaultPickupLocation: user.defaultPickupLocation,
        isAvailable: user.isAvailable,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account suspended' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        address: user.address,
        location: user.location,
        ngoName: user.ngoName,
        registrationNumber: user.registrationNumber,
        capacity: user.capacity,
        defaultPickupLocation: user.defaultPickupLocation,
        isAvailable: user.isAvailable,
        totalDonations: user.totalDonations,
        completedDeliveries: user.completedDeliveries,
        rating: user.rating,
        badges: user.badges,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// @route  PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      name, phone, address, location, isAvailable,
      ngoName, registrationNumber, capacity,
      defaultPickupLocation,
    } = req.body;

    const update = {};
    if (typeof name !== 'undefined') update.name = name;
    if (typeof phone !== 'undefined') update.phone = phone;
    if (typeof address !== 'undefined') update.address = address;

    // NGO's own base location (used for donation distance-matching)
    if (location?.lat && location?.lng) {
      update.location = {
        type: 'Point',
        coordinates: [parseFloat(location.lng), parseFloat(location.lat)],
      };
    }

    if (typeof isAvailable !== 'undefined') update.isAvailable = isAvailable;

    // NGO profile fields
    if (typeof ngoName !== 'undefined') update.ngoName = ngoName;
    if (typeof registrationNumber !== 'undefined') update.registrationNumber = registrationNumber;
    if (typeof capacity !== 'undefined') update.capacity = capacity;

    // Donor's saved default pickup location
    if (defaultPickupLocation?.lat && defaultPickupLocation?.lng) {
      update.defaultPickupLocation = {
        name: defaultPickupLocation.name || '',
        address: defaultPickupLocation.address || '',
        lat: parseFloat(defaultPickupLocation.lat),
        lng: parseFloat(defaultPickupLocation.lng),
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
