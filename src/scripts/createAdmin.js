/**
 * Script to create an admin user
 * Run with: node src/scripts/createAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Use test DB - the main DB URL has encoding issues with @ in password
const MONGODB_URL = process.env.MONGODB_URI_TEST?.trim() || process.env.MONGODB_URL;

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  role: { type: String, default: 'player' },
  status: { type: String, default: 'active' },
  isEmailVerified: { type: Boolean, default: true },
  statistics: {
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    matchesLost: { type: Number, default: 0 },
    totalRuns: { type: Number, default: 0 },
    totalBallsFaced: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    centuries: { type: Number, default: 0 },
    fifties: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    notOuts: { type: Number, default: 0 },
    totalWickets: { type: Number, default: 0 },
    totalOversBowled: { type: Number, default: 0 },
    totalRunsConceded: { type: Number, default: 0 },
    bestBowling: { wickets: { type: Number, default: 0 }, runs: { type: Number, default: 0 } },
    catches: { type: Number, default: 0 },
    runOuts: { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 },
    matchesUmpired: { type: Number, default: 0 }
  },
  friends: [],
  incomingFriendRequests: [],
  outgoingFriendRequests: [],
  blockedUsers: [],
  blockedBy: []
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URL);
    console.log('Connected to MongoDB');

    // Admin credentials - CHANGE THESE!
    const adminData = {
      username: 'admin',
      email: 'admin@cricketbox.com',
      password: 'Admin@123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      status: 'active',
      isEmailVerified: true
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [{ email: adminData.email }, { username: adminData.username }]
    });

    if (existingAdmin) {
      console.log('\n========================================');
      console.log('Admin user already exists!');
      console.log('========================================');
      console.log('Email:', existingAdmin.email);
      console.log('Username:', existingAdmin.username);
      console.log('Role:', existingAdmin.role);

      // Update role to admin if not already
      if (existingAdmin.role !== 'admin') {
        await User.updateOne(
          { _id: existingAdmin._id },
          { $set: { role: 'admin', status: 'active', isEmailVerified: true } }
        );
        console.log('\nUpdated user role to admin!');
      }

      console.log('\nUse your existing password to login.');
      console.log('========================================\n');
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(12);
      adminData.password = await bcrypt.hash(adminData.password, salt);

      // Create admin user
      const admin = await User.create(adminData);

      console.log('\n========================================');
      console.log('Admin user created successfully!');
      console.log('========================================');
      console.log('Email:', 'admin@cricketbox.com');
      console.log('Password:', 'Admin@123');
      console.log('========================================');
      console.log('\nPlease change the password after first login!');
      console.log('========================================\n');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
