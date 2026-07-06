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
    const { name, email, password, role, phone, address, location, ngoName, registrationNumber, capacity } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const userData = { name, email, password, role, phone, address };

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
    const { name, phone, address, location, isAvailable } = req.body;
    const update = { name, phone, address };

    if (location?.lat && location?.lng) {
      update.location = {
        type: 'Point',
        coordinates: [parseFloat(location.lng), parseFloat(location.lat)],
      };
    }

    if (typeof isAvailable !== 'undefined') update.isAvailable = isAvailable;

    const user = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
