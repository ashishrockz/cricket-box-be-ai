const mongoose = require('mongoose');
const { ROOM_STATUS, DEFAULTS, VALIDATION } = require('../config/constants');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    minlength: [VALIDATION.ROOM_NAME_MIN, `Room name must be at least ${VALIDATION.ROOM_NAME_MIN} characters`],
    maxlength: [VALIDATION.ROOM_NAME_MAX, `Room name cannot exceed ${VALIDATION.ROOM_NAME_MAX} characters`]
  },
  code: {
    type: String,
    unique: true,
    uppercase: true,
    required: true
  },
  description: {
    type: String,
    maxlength: [VALIDATION.DESCRIPTION_MAX, `Description cannot exceed ${VALIDATION.DESCRIPTION_MAX} characters`]
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Room host is required']
  },
  status: {
    type: String,
    enum: {
      values: Object.values(ROOM_STATUS),
      message: 'Invalid room status'
    },
    default: ROOM_STATUS.WAITING
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isReady: {
      type: Boolean,
      default: false
    }
  }],
  // Guest participants (non-registered users)
  guestParticipants: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isReady: {
      type: Boolean,
      default: false
    },
    guestId: {
      type: String,
      required: true
    }
  }],
  umpire: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isGuest: {
      type: Boolean,
      default: false
    },
    guestName: String,
    guestId: String
  },
  settings: {
    overs: {
      type: Number,
      default: DEFAULTS.OVERS,
      min: [1, 'Minimum overs is 1'],
      max: [50, 'Maximum overs is 50']
    },
    playersPerTeam: {
      type: Number,
      default: DEFAULTS.PLAYERS_PER_TEAM,
      min: [2, 'Minimum 2 players per team'],
      max: [11, 'Maximum 11 players per team']
    },
    maxParticipants: {
      type: Number,
      default: DEFAULTS.MAX_PLAYERS_PER_ROOM,
      min: [2, 'Minimum 2 participants'],
      max: [30, 'Maximum 30 participants']
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      select: false
    },
    allowGuests: {
      type: Boolean,
      default: true
    },
    autoAssignTeams: {
      type: Boolean,
      default: false
    },
    wideRuns: {
      type: Number,
      default: 1,
      min: [1, 'Minimum 1 run for wide'],
      max: [2, 'Maximum 2 runs for wide']
    },
    noBallRuns: {
      type: Number,
      default: 1,
      min: [1, 'Minimum 1 run for no ball'],
      max: [2, 'Maximum 2 runs for no ball']
    },
    noBallFreehit: {
      type: Boolean,
      default: true
    }
  },
  teamA: {
    name: {
      type: String,
      default: 'Team A',
      trim: true,
      maxlength: [VALIDATION.TEAM_NAME_MAX, `Team name cannot exceed ${VALIDATION.TEAM_NAME_MAX} characters`]
    },
    players: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      isGuest: {
        type: Boolean,
        default: false
      },
      guestName: String,
      guestId: String,
      isCaptain: {
        type: Boolean,
        default: false
      }
    }]
  },
  teamB: {
    name: {
      type: String,
      default: 'Team B',
      trim: true,
      maxlength: [VALIDATION.TEAM_NAME_MAX, `Team name cannot exceed ${VALIDATION.TEAM_NAME_MAX} characters`]
    },
    players: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      isGuest: {
        type: Boolean,
        default: false
      },
      guestName: String,
      guestId: String,
      isCaptain: {
        type: Boolean,
        default: false
      }
    }]
  },
  currentMatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  },
  matchHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  }],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from creation
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
roomSchema.index({ code: 1 }, { unique: true });
roomSchema.index({ host: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ 'participants.user': 1 });
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
roomSchema.index({ createdAt: -1 });

// Virtual for total participants count
roomSchema.virtual('totalParticipants').get(function() {
  return this.participants.length + this.guestParticipants.length;
});

// Virtual for team A player count
roomSchema.virtual('teamACount').get(function() {
  return this.teamA.players.length;
});

// Virtual for team B player count
roomSchema.virtual('teamBCount').get(function() {
  return this.teamB.players.length;
});

// Virtual to check if room is full
roomSchema.virtual('isFull').get(function() {
  return this.totalParticipants >= this.settings.maxParticipants;
});

// Virtual to check if teams are ready
roomSchema.virtual('teamsReady').get(function() {
  return this.teamA.players.length >= this.settings.playersPerTeam &&
         this.teamB.players.length >= this.settings.playersPerTeam;
});

// Pre-save middleware to generate room code
roomSchema.pre('save', async function(next) {
  if (this.isNew && !this.code) {
    this.code = await generateUniqueRoomCode();
  }
  next();
});

// Generate unique room code
async function generateUniqueRoomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    const existingRoom = await mongoose.model('Room').findOne({ code });
    if (!existingRoom) {
      isUnique = true;
    }
  }
  
  return code;
}

// Instance method to check if user is host
roomSchema.methods.isHost = function(userId) {
  return this.host.toString() === userId.toString();
};

// Instance method to check if user is participant
roomSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => p.user && p.user.toString() === userId.toString());
};

// Instance method to check if user is in a team
roomSchema.methods.isInTeam = function(userId) {
  const inTeamA = this.teamA.players.some(p => p.user && p.user.toString() === userId.toString());
  const inTeamB = this.teamB.players.some(p => p.user && p.user.toString() === userId.toString());
  return inTeamA || inTeamB;
};

// Instance method to get user's team
roomSchema.methods.getUserTeam = function(userId) {
  if (this.teamA.players.some(p => p.user && p.user.toString() === userId.toString())) {
    return 'teamA';
  }
  if (this.teamB.players.some(p => p.user && p.user.toString() === userId.toString())) {
    return 'teamB';
  }
  return null;
};

// Instance method to check if user is umpire
roomSchema.methods.isUmpire = function(userId) {
  return this.umpire.user && this.umpire.user.toString() === userId.toString();
};

// Instance method to add participant
roomSchema.methods.addParticipant = function(userId) {
  if (this.isFull) {
    throw new Error('Room is full');
  }
  
  if (this.isParticipant(userId)) {
    throw new Error('User is already a participant');
  }
  
  this.participants.push({
    user: userId,
    joinedAt: new Date(),
    isReady: false
  });
};

// Instance method to remove participant
roomSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(
    p => p.user && p.user.toString() !== userId.toString()
  );
  
  // Also remove from teams
  this.teamA.players = this.teamA.players.filter(
    p => p.user && p.user.toString() !== userId.toString()
  );
  this.teamB.players = this.teamB.players.filter(
    p => p.user && p.user.toString() !== userId.toString()
  );
};

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
