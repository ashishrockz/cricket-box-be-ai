const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, ACCOUNT_STATUS, VALIDATION } = require('../config/constants');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [VALIDATION.USERNAME_MIN, `Username must be at least ${VALIDATION.USERNAME_MIN} characters`],
    maxlength: [VALIDATION.USERNAME_MAX, `Username cannot exceed ${VALIDATION.USERNAME_MAX} characters`],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [VALIDATION.PASSWORD_MIN, `Password must be at least ${VALIDATION.PASSWORD_MIN} characters`],
    select: false
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [VALIDATION.NAME_MIN, `First name must be at least ${VALIDATION.NAME_MIN} characters`],
    maxlength: [VALIDATION.NAME_MAX, `First name cannot exceed ${VALIDATION.NAME_MAX} characters`]
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [VALIDATION.NAME_MAX, `Last name cannot exceed ${VALIDATION.NAME_MAX} characters`]
  },
  avatar: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, 'Please provide a valid phone number']
  },
  role: {
    type: String,
    enum: {
      values: Object.values(ROLES),
      message: 'Invalid role specified'
    },
    default: ROLES.PLAYER
  },
  status: {
    type: String,
    enum: {
      values: Object.values(ACCOUNT_STATUS),
      message: 'Invalid status specified'
    },
    default: ACCOUNT_STATUS.PENDING_VERIFICATION
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  otp: {
    code: String,
    expiresAt: Date,
    attempts: {
      type: Number,
      default: 0
    }
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangedAt: Date,
  refreshToken: String,
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  // Player Statistics
  statistics: {
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    matchesLost: { type: Number, default: 0 },
    // Batting
    totalRuns: { type: Number, default: 0 },
    totalBallsFaced: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    centuries: { type: Number, default: 0 },
    fifties: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    notOuts: { type: Number, default: 0 },
    // Bowling
    totalWickets: { type: Number, default: 0 },
    totalOversBowled: { type: Number, default: 0 },
    totalRunsConceded: { type: Number, default: 0 },
    bestBowling: {
      wickets: { type: Number, default: 0 },
      runs: { type: Number, default: 0 }
    },
    // Fielding
    catches: { type: Number, default: 0 },
    runOuts: { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 },
    // Umpiring
    matchesUmpired: { type: Number, default: 0 }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Friend Management
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  incomingFriendRequests: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    message: {
      type: String,
      maxlength: 200
    }
  }],
  outgoingFriendRequests: [{
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    message: {
      type: String,
      maxlength: 200
    }
  }],
  blockedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    blockedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      maxlength: 200
    }
  }],
  blockedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Notification Preferences
  notificationPreferences: {
    enabled: {
      type: Boolean,
      default: true
    },
    categories: {
      friend: { type: Boolean, default: true },
      match: { type: Boolean, default: true },
      room: { type: Boolean, default: true },
      custom: { type: Boolean, default: true },
      system: { type: Boolean, default: true }
    },
    doNotDisturb: {
      enabled: { type: Boolean, default: false },
      startTime: String,  // "HH:mm" format (24-hour)
      endTime: String     // "HH:mm" format (24-hour)
    },
    emailNotifications: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'statistics.totalRuns': -1 });
userSchema.index({ 'statistics.totalWickets': -1 });
// Friend indexes
userSchema.index({ friends: 1 });
userSchema.index({ 'incomingFriendRequests.from': 1 });
userSchema.index({ 'outgoingFriendRequests.to': 1 });
userSchema.index({ 'blockedUsers.user': 1 });
// Notification preferences index
userSchema.index({ 'notificationPreferences.enabled': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName;
});

// Virtual for batting average
userSchema.virtual('statistics.battingAverage').get(function() {
  const innings = this.statistics.matchesPlayed - this.statistics.notOuts;
  if (innings === 0) return 0;
  return (this.statistics.totalRuns / innings).toFixed(2);
});

// Virtual for strike rate
userSchema.virtual('statistics.strikeRate').get(function() {
  if (this.statistics.totalBallsFaced === 0) return 0;
  return ((this.statistics.totalRuns / this.statistics.totalBallsFaced) * 100).toFixed(2);
});

// Virtual for bowling average
userSchema.virtual('statistics.bowlingAverage').get(function() {
  if (this.statistics.totalWickets === 0) return 0;
  return (this.statistics.totalRunsConceded / this.statistics.totalWickets).toFixed(2);
});

// Virtual for economy rate
userSchema.virtual('statistics.economyRate').get(function() {
  if (this.statistics.totalOversBowled === 0) return 0;
  return (this.statistics.totalRunsConceded / this.statistics.totalOversBowled).toFixed(2);
});

// Virtual for friends count
userSchema.virtual('friendsCount').get(function() {
  return this.friends ? this.friends.length : 0;
});

// Virtual for pending requests count
userSchema.virtual('pendingRequestsCount').get(function() {
  return this.incomingFriendRequests ? this.incomingFriendRequests.length : 0;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if password changed after token was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Instance method to check if account is locked
userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Instance method to increment login attempts
userSchema.methods.incrementLoginAttempts = async function() {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }

  return await this.updateOne(updates);
};

// Friend management instance methods
userSchema.methods.isFriend = function(userId) {
  if (!this.friends || !userId) return false;
  return this.friends.some(f => f.toString() === userId.toString());
};

userSchema.methods.hasBlockedUser = function(userId) {
  if (!this.blockedUsers || !userId) return false;
  return this.blockedUsers.some(b => b.user.toString() === userId.toString());
};

userSchema.methods.isBlockedBy = function(userId) {
  if (!this.blockedBy || !userId) return false;
  return this.blockedBy.some(b => b.toString() === userId.toString());
};

userSchema.methods.hasPendingRequestFrom = function(userId) {
  if (!this.incomingFriendRequests || !userId) return false;
  return this.incomingFriendRequests.some(r => r.from.toString() === userId.toString());
};

userSchema.methods.hasPendingRequestTo = function(userId) {
  if (!this.outgoingFriendRequests || !userId) return false;
  return this.outgoingFriendRequests.some(r => r.to.toString() === userId.toString());
};

/**
 * Check if user can receive notification of given category
 */
userSchema.methods.canReceiveNotification = function(category) {
  // Admin broadcasts always go through
  if (category === 'admin') return true;

  // Check if notifications are enabled
  if (!this.notificationPreferences || !this.notificationPreferences.enabled) {
    return false;
  }

  // Check category preference
  if (this.notificationPreferences.categories &&
      this.notificationPreferences.categories[category] === false) {
    return false;
  }

  // Check do-not-disturb mode
  if (this.notificationPreferences.doNotDisturb &&
      this.notificationPreferences.doNotDisturb.enabled) {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const { startTime, endTime } = this.notificationPreferences.doNotDisturb;

    if (startTime && endTime) {
      // Handle overnight DND (e.g., 22:00 to 06:00)
      if (startTime > endTime) {
        if (currentTime >= startTime || currentTime <= endTime) {
          return false;
        }
      } else {
        // Same-day DND (e.g., 13:00 to 14:00)
        if (currentTime >= startTime && currentTime <= endTime) {
          return false;
        }
      }
    }
  }

  return true;
};

// Static method to find user by credentials
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ email: email.toLowerCase() }).select('+password');
  
  if (!user) {
    return { user: null, error: 'INVALID_CREDENTIALS' };
  }
  
  if (user.isLocked()) {
    return { user: null, error: 'ACCOUNT_LOCKED' };
  }
  
  if (user.status === ACCOUNT_STATUS.BLOCKED) {
    return { user: null, error: 'ACCOUNT_BLOCKED' };
  }
  
  if (user.status === ACCOUNT_STATUS.INACTIVE) {
    return { user: null, error: 'ACCOUNT_INACTIVE' };
  }
  
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    await user.incrementLoginAttempts();
    return { user: null, error: 'INVALID_CREDENTIALS' };
  }
  
  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.updateOne({
      $set: { loginAttempts: 0 },
      $unset: { lockUntil: 1 }
    });
  }
  
  return { user, error: null };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
