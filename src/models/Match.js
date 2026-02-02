const mongoose = require('mongoose');
const { 
  MATCH_STATUS, 
  INNINGS_STATUS, 
  BALL_OUTCOMES, 
  DISMISSAL_TYPES, 
  TOSS_DECISIONS,
  MATCH_RESULTS,
  DEFAULTS 
} = require('../config/constants');

// Ball Schema (for each delivery)
const ballSchema = new mongoose.Schema({
  overNumber: {
    type: Number,
    required: true,
    min: 1
  },
  ballNumber: {
    type: Number,
    required: true,
    min: 1,
    max: DEFAULTS.BALLS_PER_OVER
  },
  bowler: {
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
  batsman: {
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
  nonStriker: {
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
  outcome: {
    type: String,
    enum: Object.values(BALL_OUTCOMES),
    required: true
  },
  runs: {
    batsmanRuns: {
      type: Number,
      default: 0,
      min: 0
    },
    extraRuns: {
      type: Number,
      default: 0,
      min: 0
    },
    totalRuns: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  isWicket: {
    type: Boolean,
    default: false
  },
  wicket: {
    dismissalType: {
      type: String,
      enum: Object.values(DISMISSAL_TYPES)
    },
    batsmanOut: {
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
    fielder: {
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
    }
  },
  isLegalDelivery: {
    type: Boolean,
    default: true
  },
  isFreeHit: {
    type: Boolean,
    default: false
  },
  isBoundary: {
    type: Boolean,
    default: false
  },
  commentary: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Player Performance in Match
const playerPerformanceSchema = new mongoose.Schema({
  player: {
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
  team: {
    type: String,
    enum: ['teamA', 'teamB'],
    required: true
  },
  batting: {
    runs: { type: Number, default: 0 },
    ballsFaced: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    isOut: { type: Boolean, default: false },
    dismissalType: {
      type: String,
      enum: Object.values(DISMISSAL_TYPES)
    },
    dismissedBy: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      isGuest: Boolean,
      guestName: String
    },
    battingPosition: Number
  },
  bowling: {
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    economyRate: { type: Number, default: 0 }
  },
  fielding: {
    catches: { type: Number, default: 0 },
    runOuts: { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 }
  }
}, { _id: true });

// Innings Schema
const inningsSchema = new mongoose.Schema({
  battingTeam: {
    type: String,
    enum: ['teamA', 'teamB'],
    required: true
  },
  bowlingTeam: {
    type: String,
    enum: ['teamA', 'teamB'],
    required: true
  },
  status: {
    type: String,
    enum: Object.values(INNINGS_STATUS),
    default: INNINGS_STATUS.NOT_STARTED
  },
  totalRuns: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWickets: {
    type: Number,
    default: 0,
    min: 0
  },
  totalOvers: {
    type: Number,
    default: 0,
    min: 0
  },
  totalBalls: {
    type: Number,
    default: 0,
    min: 0
  },
  extras: {
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    legByes: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  currentOver: {
    type: Number,
    default: 0
  },
  currentBall: {
    type: Number,
    default: 0
  },
  currentBatsmen: {
    striker: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      isGuest: Boolean,
      guestName: String,
      guestId: String
    },
    nonStriker: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      isGuest: Boolean,
      guestName: String,
      guestId: String
    }
  },
  currentBowler: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isGuest: Boolean,
    guestName: String,
    guestId: String
  },
  balls: [ballSchema],
  fallOfWickets: [{
    wicketNumber: Number,
    runs: Number,
    overs: Number,
    balls: Number,
    batsman: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      isGuest: Boolean,
      guestName: String
    }
  }],
  runRate: {
    type: Number,
    default: 0
  },
  requiredRunRate: Number,
  target: Number,
  startTime: Date,
  endTime: Date
}, { _id: true });

// Main Match Schema
const matchSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  matchNumber: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: Object.values(MATCH_STATUS),
    default: MATCH_STATUS.SCHEDULED
  },
  settings: {
    overs: {
      type: Number,
      required: true,
      default: DEFAULTS.OVERS
    },
    playersPerTeam: {
      type: Number,
      required: true,
      default: DEFAULTS.PLAYERS_PER_TEAM
    },
    wideRuns: {
      type: Number,
      default: 1
    },
    noBallRuns: {
      type: Number,
      default: 1
    },
    noBallFreehit: {
      type: Boolean,
      default: true
    }
  },
  teamA: {
    name: {
      type: String,
      required: true
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
      required: true
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
  toss: {
    winner: {
      type: String,
      enum: ['teamA', 'teamB']
    },
    decision: {
      type: String,
      enum: Object.values(TOSS_DECISIONS)
    },
    conductedAt: Date
  },
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
  innings: {
    first: inningsSchema,
    second: inningsSchema
  },
  currentInnings: {
    type: String,
    enum: ['first', 'second']
  },
  playerPerformances: [playerPerformanceSchema],
  result: {
    winner: {
      type: String,
      enum: ['teamA', 'teamB']
    },
    resultType: {
      type: String,
      enum: Object.values(MATCH_RESULTS)
    },
    winMargin: {
      runs: Number,
      wickets: Number
    },
    resultText: String
  },
  manOfTheMatch: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isGuest: Boolean,
    guestName: String
  },
  startTime: Date,
  endTime: Date,
  duration: Number, // in minutes
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
matchSchema.index({ room: 1 });
matchSchema.index({ status: 1 });
matchSchema.index({ createdAt: -1 });
matchSchema.index({ 'teamA.players.user': 1 });
matchSchema.index({ 'teamB.players.user': 1 });
matchSchema.index({ 'umpire.user': 1 });

// Virtual for current score summary
matchSchema.virtual('scoreSummary').get(function() {
  const firstInnings = this.innings.first;
  const secondInnings = this.innings.second;
  
  return {
    teamA: {
      name: this.teamA.name,
      score: firstInnings?.battingTeam === 'teamA' 
        ? `${firstInnings.totalRuns}/${firstInnings.totalWickets}`
        : secondInnings?.totalRuns !== undefined 
          ? `${secondInnings.totalRuns}/${secondInnings.totalWickets}`
          : 'Yet to bat',
      overs: firstInnings?.battingTeam === 'teamA'
        ? firstInnings.totalOvers
        : secondInnings?.totalOvers || 0
    },
    teamB: {
      name: this.teamB.name,
      score: firstInnings?.battingTeam === 'teamB'
        ? `${firstInnings.totalRuns}/${firstInnings.totalWickets}`
        : secondInnings?.totalRuns !== undefined
          ? `${secondInnings.totalRuns}/${secondInnings.totalWickets}`
          : 'Yet to bat',
      overs: firstInnings?.battingTeam === 'teamB'
        ? firstInnings.totalOvers
        : secondInnings?.totalOvers || 0
    }
  };
});

// Instance method to calculate run rate
matchSchema.methods.calculateRunRate = function(innings) {
  const inningsData = this.innings[innings];
  if (!inningsData || inningsData.totalOvers === 0) return 0;
  
  const totalOvers = inningsData.totalOvers + (inningsData.totalBalls / 6);
  return totalOvers > 0 ? (inningsData.totalRuns / totalOvers).toFixed(2) : 0;
};

// Instance method to calculate required run rate
matchSchema.methods.calculateRequiredRunRate = function() {
  if (this.currentInnings !== 'second') return null;
  
  const target = this.innings.first.totalRuns + 1;
  const second = this.innings.second;
  const runsNeeded = target - second.totalRuns;
  const oversRemaining = this.settings.overs - (second.totalOvers + (second.totalBalls / 6));
  
  if (oversRemaining <= 0) return null;
  return (runsNeeded / oversRemaining).toFixed(2);
};

// Instance method to determine match result
matchSchema.methods.determineResult = function() {
  if (this.status !== MATCH_STATUS.COMPLETED) return null;
  
  const firstInnings = this.innings.first;
  const secondInnings = this.innings.second;
  
  if (!firstInnings || !secondInnings) return null;
  
  const firstBattingTeam = firstInnings.battingTeam;
  const secondBattingTeam = secondInnings.battingTeam;
  
  const firstTeamScore = firstInnings.totalRuns;
  const secondTeamScore = secondInnings.totalRuns;
  
  if (secondTeamScore > firstTeamScore) {
    // Second batting team won
    const wicketsRemaining = this.settings.playersPerTeam - 1 - secondInnings.totalWickets;
    return {
      winner: secondBattingTeam,
      resultType: secondBattingTeam === 'teamA' ? MATCH_RESULTS.TEAM_A_WON : MATCH_RESULTS.TEAM_B_WON,
      winMargin: { wickets: wicketsRemaining },
      resultText: `${this[secondBattingTeam].name} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`
    };
  } else if (firstTeamScore > secondTeamScore) {
    // First batting team won
    const runMargin = firstTeamScore - secondTeamScore;
    return {
      winner: firstBattingTeam,
      resultType: firstBattingTeam === 'teamA' ? MATCH_RESULTS.TEAM_A_WON : MATCH_RESULTS.TEAM_B_WON,
      winMargin: { runs: runMargin },
      resultText: `${this[firstBattingTeam].name} won by ${runMargin} run${runMargin !== 1 ? 's' : ''}`
    };
  } else {
    // Tie
    return {
      winner: null,
      resultType: MATCH_RESULTS.TIE,
      winMargin: null,
      resultText: 'Match Tied'
    };
  }
};

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;
