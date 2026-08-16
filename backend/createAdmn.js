require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    let admin = await User.findOne({ email: 'admin@foodshare.com' });

    if (admin) {
      admin.password = 'Admin@123';
      admin.role = 'admin';
      admin.isActive = true;

      await admin.save();

      console.log('ADMIN ALREADY EXISTED - PASSWORD RESET');
    } else {
      admin = await User.create({
        name: 'Admin',
        email: 'admin@foodshare.com',
        password: 'Admin@123',
        role: 'admin',
        isActive: true
      });

      console.log('ADMIN CREATED SUCCESSFULLY');
    }

    console.log('Email: admin@foodshare.com');
    console.log('Password: Admin@123');

    await mongoose.disconnect();
  } catch (error) {
    console.error('ERROR:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdmin();