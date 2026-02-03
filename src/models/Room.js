const mongoose = require('mongoose');
const { ROOM_STATUS, ROOM_ROLES, DEFAULTS, VALIDATION } = require('../config/constants');

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
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Room creator is required']
  },
  status: {
    type: String,
    enum: {
      values: Object.values(ROOM_STATUS),
      message: 'Invalid room status'
    },
    default: ROOM_STATUS.WAITING
  },
  // Participants array - max 3 users (including creator)
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: {
        values: [...Object.values(ROOM_ROLES), null],
        message: 'Invalid participant role'
      },
      default: null
    },
    isReady: {
      type: Boolean,
      default: false
    }
  }],
  // Match settings
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
  // Team A - players added by Team A In-charge
  teamA: {
    name: {
      type: String,
      default: 'Team A',
      trim: true,
      maxlength: [VALIDATION.TEAM_NAME_MAX, `Team name cannot exceed ${VALIDATION.TEAM_NAME_MAX} characters`]
    },
    players: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      isCaptain: {
        type: Boolean,
        default: false
      },
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },
  // Team B - players added by Team B In-charge
  teamB: {
    name: {
      type: String,
      default: 'Team B',
      trim: true,
      maxlength: [VALIDATION.TEAM_NAME_MAX, `Team name cannot exceed ${VALIDATION.TEAM_NAME_MAX} characters`]
    },
    players: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      isCaptain: {
        type: Boolean,
        default: false
      },
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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
roomSchema.index({ creator: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ 'participants.user': 1 });
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
roomSchema.index({ createdAt: -1 });

// Virtual for total participants count
roomSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Virtual for team A player count
roomSchema.virtual('teamACount').get(function() {
  return this.teamA.players.length;
});

// Virtual for team B player count
roomSchema.virtual('teamBCount').get(function() {
  return this.teamB.players.length;
});

// Virtual to check if room is full (max 3 participants)
roomSchema.virtual('isFull').get(function() {
  return this.participants.length >= DEFAULTS.MAX_PARTICIPANTS_PER_ROOM;
});

// Virtual to check if all roles are assigned
roomSchema.virtual('rolesAssigned').get(function() {
  if (this.participants.length < 3) return false;
  const roles = this.participants.map(p => p.role).filter(r => r !== null);
  return roles.includes(ROOM_ROLES.UMPIRE) &&
         roles.includes(ROOM_ROLES.TEAM_A_INCHARGE) &&
         roles.includes(ROOM_ROLES.TEAM_B_INCHARGE);
});

// Virtual to check if teams are ready
roomSchema.virtual('teamsReady').get(function() {
  return this.teamA.players.length >= this.settings.playersPerTeam &&
         this.teamB.players.length >= this.settings.playersPerTeam;
});

// Virtual to check if room is in solo mode (only creator)
roomSchema.virtual('isSoloMode').get(function() {
  return this.participants.length === 1;
});

// Pre-save middleware to generate room code
roomSchema.pre('save', async function(next) {
  if (this.isNew && !this.code) {
    this.code = await generateUniqueRoomCode();
  }
  next();
});

// Generate unique 6-character room code
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

// Instance method to check if user is creator
roomSchema.methods.isCreator = function(userId) {
  return this.creator.toString() === userId.toString();
};

// Instance method to check if user is participant
roomSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => p.user && p.user.toString() === userId.toString());
};

// Instance method to get user's role in room
roomSchema.methods.getUserRole = function(userId) {
  const participant = this.participants.find(p => p.user && p.user.toString() === userId.toString());
  return participant ? participant.role : null;
};

// Instance method to check if user is umpire
roomSchema.methods.isUmpire = function(userId) {
  return this.getUserRole(userId) === ROOM_ROLES.UMPIRE;
};

// Instance method to check if user is Team A In-charge
roomSchema.methods.isTeamAIncharge = function(userId) {
  return this.getUserRole(userId) === ROOM_ROLES.TEAM_A_INCHARGE;
};

// Instance method to check if user is Team B In-charge
roomSchema.methods.isTeamBIncharge = function(userId) {
  return this.getUserRole(userId) === ROOM_ROLES.TEAM_B_INCHARGE;
};

// Instance method to check if user can manage (creator in solo mode OR has assigned role)
roomSchema.methods.canManage = function(userId) {
  if (this.isSoloMode && this.isCreator(userId)) {
    return true;
  }
  return this.getUserRole(userId) !== null;
};

// Instance method to add participant
roomSchema.methods.addParticipant = function(userId) {
  if (this.isFull) {
    throw new Error('Room is full (maximum 3 participants)');
  }

  if (this.isParticipant(userId)) {
    throw new Error('User is already a participant');
  }

  this.participants.push({
    user: userId,
    joinedAt: new Date(),
    role: null,
    isReady: false
  });
};

// Instance method to remove participant
roomSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => p.user && p.user.toString() === userId.toString());
  if (participant && participant.role) {
    // Clear the role assignment
    participant.role = null;
  }
  this.participants = this.participants.filter(
    p => p.user && p.user.toString() !== userId.toString()
  );
};

// Instance method to assign role to participant
roomSchema.methods.assignRole = function(userId, role) {
  if (!Object.values(ROOM_ROLES).includes(role)) {
    throw new Error('Invalid role');
  }

  // Check if role is already taken
  const existingWithRole = this.participants.find(p => p.role === role);
  if (existingWithRole && existingWithRole.user.toString() !== userId.toString()) {
    throw new Error(`Role ${role} is already assigned to another participant`);
  }

  const participant = this.participants.find(p => p.user && p.user.toString() === userId.toString());
  if (!participant) {
    throw new Error('User is not a participant');
  }

  participant.role = role;
};

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
