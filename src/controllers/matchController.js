const { Match, Room, User } = require('../models');
const { 
  successResponse, 
  createdResponse,
  paginatedResponse 
} = require('../utils/response');
const { 
  NotFoundError, 
  AuthorizationError,
  ValidationError,
  ERROR_CODES,
  ERROR_MESSAGES 
} = require('../utils/errors');
const { parsePagination, parseSort, calculateRunRate } = require('../utils/helpers');
const { 
  MATCH_STATUS, 
  ROOM_STATUS, 
  INNINGS_STATUS, 
  BALL_OUTCOMES,
  TOSS_DECISIONS,
  DEFAULTS 
} = require('../config/constants');

/**
 * @desc    Start a new match
 * @route   POST /api/v1/rooms/:roomId/match/start
 * @access  Private (Host only)
 */
const startMatch = async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId)
    .populate('teamA.players.user', 'username firstName lastName')
    .populate('teamB.players.user', 'username firstName lastName');

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (!room.isHost(req.user._id)) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_ROOM_HOST]);
  }

  if (room.status !== ROOM_STATUS.READY) {
    throw new ValidationError('Room is not ready for a match');
  }

  if (!room.teamsReady) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.TEAMS_NOT_READY]);
  }

  // Create match
  const matchNumber = (room.matchHistory?.length || 0) + 1;

  const match = await Match.create({
    room: room._id,
    matchNumber,
    status: MATCH_STATUS.TOSS,
    settings: {
      overs: room.settings.overs,
      playersPerTeam: room.settings.playersPerTeam,
      wideRuns: room.settings.wideRuns,
      noBallRuns: room.settings.noBallRuns,
      noBallFreehit: room.settings.noBallFreehit
    },
    teamA: {
      name: room.teamA.name,
      players: room.teamA.players
    },
    teamB: {
      name: room.teamB.name,
      players: room.teamB.players
    },
    umpire: room.umpire,
    createdBy: req.user._id,
    startTime: new Date()
  });

  // Initialize player performances
  const performances = [];
  
  room.teamA.players.forEach(player => {
    performances.push({
      player: {
        user: player.user,
        isGuest: player.isGuest,
        guestName: player.guestName,
        guestId: player.guestId
      },
      team: 'teamA'
    });
  });

  room.teamB.players.forEach(player => {
    performances.push({
      player: {
        user: player.user,
        isGuest: player.isGuest,
        guestName: player.guestName,
        guestId: player.guestId
      },
      team: 'teamB'
    });
  });

  match.playerPerformances = performances;
  await match.save();

  // Update room
  room.currentMatch = match._id;
  room.status = ROOM_STATUS.IN_MATCH;
  await room.save();

  return createdResponse(res, {
    message: 'Match started. Please conduct the toss.',
    data: { match }
  });
};

/**
 * @desc    Conduct toss
 * @route   POST /api/v1/matches/:matchId/toss
 * @access  Private (Umpire only)
 */
const conductToss = async (req, res) => {
  const { matchId } = req.params;
  const { winner, decision } = req.body;

  const match = await Match.findById(matchId);

  if (!match) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.MATCH_NOT_FOUND]);
  }

  // Verify umpire
  const isUmpire = match.umpire.user?.toString() === req.user._id.toString();
  const room = await Room.findById(match.room);
  const isHost = room?.isHost(req.user._id);

  if (!isUmpire && !isHost) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_UMPIRE]);
  }

  if (match.status !== MATCH_STATUS.TOSS) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.TOSS_ALREADY_DONE]);
  }

  // Set toss result
  match.toss = {
    winner,
    decision,
    conductedAt: new Date()
  };

  // Initialize innings based on toss
  const battingFirst = decision === TOSS_DECISIONS.BAT ? winner : (winner === 'teamA' ? 'teamB' : 'teamA');
  const bowlingFirst = battingFirst === 'teamA' ? 'teamB' : 'teamA';

  match.innings.first = {
    battingTeam: battingFirst,
    bowlingTeam: bowlingFirst,
    status: INNINGS_STATUS.NOT_STARTED,
    totalRuns: 0,
    totalWickets: 0,
    totalOvers: 0,
    totalBalls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    currentOver: 0,
    currentBall: 0,
    balls: [],
    fallOfWickets: []
  };

  match.innings.second = {
    battingTeam: bowlingFirst,
    bowlingTeam: battingFirst,
    status: INNINGS_STATUS.NOT_STARTED,
    totalRuns: 0,
    totalWickets: 0,
    totalOvers: 0,
    totalBalls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    currentOver: 0,
    currentBall: 0,
    balls: [],
    fallOfWickets: []
  };

  match.currentInnings = 'first';
  match.status = MATCH_STATUS.IN_PROGRESS;

  await match.save();

  return successResponse(res, {
    message: 'Toss completed',
    data: {
      toss: match.toss,
      battingFirst: match[battingFirst].name,
      bowlingFirst: match[bowlingFirst].name
    }
  });
};

/**
 * @desc    Set opening batsmen
 * @route   POST /api/v1/matches/:matchId/batsmen
 * @access  Private (Umpire only)
 */
const setBatsmen = async (req, res) => {
  const { matchId } = req.params;
  const { strikerId, strikerGuestId, nonStrikerId, nonStrikerGuestId } = req.body;

  const match = await Match.findById(matchId);

  if (!match) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.MATCH_NOT_FOUND]);
  }

  // Verify umpire
  const isUmpire = match.umpire.user?.toString() === req.user._id.toString();
  const room = await Room.findById(match.room);
  const isHost = room?.isHost(req.user._id);

  if (!isUmpire && !isHost) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_UMPIRE]);
  }

  if (match.status !== MATCH_STATUS.IN_PROGRESS) {
    throw new ValidationError('Match is not in progress');
  }

  const currentInnings = match.innings[match.currentInnings];
  const battingTeam = match[currentInnings.battingTeam];

  // Set striker
  if (strikerId) {
    const striker = battingTeam.players.find(p => p.user?.toString() === strikerId);
    if (!striker) {
      throw new ValidationError('Striker not found in batting team');
    }
    currentInnings.currentBatsmen.striker = {
      user: strikerId,
      isGuest: false
    };
  } else if (strikerGuestId) {
    const striker = battingTeam.players.find(p => p.guestId === strikerGuestId);
    if (!striker) {
      throw new ValidationError('Striker not found in batting team');
    }
    currentInnings.currentBatsmen.striker = {
      isGuest: true,
      guestName: striker.guestName,
      guestId: strikerGuestId
    };
  }

  // Set non-striker
  if (nonStrikerId) {
    const nonStriker = battingTeam.players.find(p => p.user?.toString() === nonStrikerId);
    if (!nonStriker) {
      throw new ValidationError('Non-striker not found in batting team');
    }
    currentInnings.currentBatsmen.nonStriker = {
      user: nonStrikerId,
      isGuest: false
    };
  } else if (nonStrikerGuestId) {
    const nonStriker = battingTeam.players.find(p => p.guestId === nonStrikerGuestId);
    if (!nonStriker) {
      throw new ValidationError('Non-striker not found in batting team');
    }
    currentInnings.currentBatsmen.nonStriker = {
      isGuest: true,
      guestName: nonStriker.guestName,
      guestId: nonStrikerGuestId
    };
  }

  // Start innings if not started
  if (currentInnings.status === INNINGS_STATUS.NOT_STARTED) {
    currentInnings.status = INNINGS_STATUS.IN_PROGRESS;
    currentInnings.startTime = new Date();
    currentInnings.currentOver = 1;
    currentInnings.currentBall = 0;
  }

  await match.save();

  return successResponse(res, {
    message: 'Batsmen set successfully',
    data: { batsmen: currentInnings.currentBatsmen }
  });
};

/**
 * @desc    Set bowler
 * @route   POST /api/v1/matches/:matchId/bowler
 * @access  Private (Umpire only)
 */
const setBowler = async (req, res) => {
  const { matchId } = req.params;
  const { bowlerId, bowlerGuestId } = req.body;

  const match = await Match.findById(matchId);

  if (!match) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.MATCH_NOT_FOUND]);
  }

  // Verify umpire
  const isUmpire = match.umpire.user?.toString() === req.user._id.toString();
  const room = await Room.findById(match.room);
  const isHost = room?.isHost(req.user._id);

  if (!isUmpire && !isHost) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_UMPIRE]);
  }

  const currentInnings = match.innings[match.currentInnings];
  const bowlingTeam = match[currentInnings.bowlingTeam];

  if (bowlerId) {
    const bowler = bowlingTeam.players.find(p => p.user?.toString() === bowlerId);
    if (!bowler) {
      throw new ValidationError('Bowler not found in bowling team');
    }
    currentInnings.currentBowler = {
      user: bowlerId,
      isGuest: false
    };
  } else if (bowlerGuestId) {
    const bowler = bowlingTeam.players.find(p => p.guestId === bowlerGuestId);
    if (!bowler) {
      throw new ValidationError('Bowler not found in bowling team');
    }
    currentInnings.currentBowler = {
      isGuest: true,
      guestName: bowler.guestName,
      guestId: bowlerGuestId
    };
  }

  await match.save();

  return successResponse(res, {
    message: 'Bowler set successfully',
    data: { bowler: currentInnings.currentBowler }
  });
};

/**
 * @desc    Record a ball
 * @route   POST /api/v1/matches/:matchId/ball
 * @access  Private (Umpire only)
 */
const recordBall = async (req, res) => {
  const { matchId } = req.params;
  const { 
    outcome, 
    runs = 0, 
    isWicket = false, 
    dismissalType,
    batsmanOutId,
    batsmanOutGuestId,
    fielderId,
    fielderGuestId,
    commentary 
  } = req.body;

  const match = await Match.findById(matchId);

  if (!match) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.MATCH_NOT_FOUND]);
  }

  // Verify umpire
  const isUmpire = match.umpire.user?.toString() === req.user._id.toString();
  const room = await Room.findById(match.room);
  const isHost = room?.isHost(req.user._id);

  if (!isUmpire && !isHost) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_UMPIRE]);
  }

  if (match.status !== MATCH_STATUS.IN_PROGRESS) {
    throw new ValidationError('Match is not in progress');
  }

  const currentInnings = match.innings[match.currentInnings];

  if (currentInnings.status !== INNINGS_STATUS.IN_PROGRESS) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.INNINGS_NOT_STARTED]);
  }

  // Validate batsmen and bowler are set
  if (!currentInnings.currentBatsmen.striker.user && !currentInnings.currentBatsmen.striker.guestId) {
    throw new ValidationError('Please set the batsmen first');
  }

  if (!currentInnings.currentBowler.user && !currentInnings.currentBowler.guestId) {
    throw new ValidationError('Please set the bowler first');
  }

  // Calculate runs
  let batsmanRuns = 0;
  let extraRuns = 0;
  let totalRuns = 0;
  let isLegalDelivery = true;
  let isBoundary = false;

  switch (outcome) {
    case BALL_OUTCOMES.DOT:
      totalRuns = 0;
      break;
    case BALL_OUTCOMES.ONE:
    case BALL_OUTCOMES.TWO:
    case BALL_OUTCOMES.THREE:
      batsmanRuns = parseInt(outcome);
      totalRuns = batsmanRuns;
      break;
    case BALL_OUTCOMES.FOUR:
      batsmanRuns = 4;
      totalRuns = 4;
      isBoundary = true;
      break;
    case BALL_OUTCOMES.SIX:
      batsmanRuns = 6;
      totalRuns = 6;
      isBoundary = true;
      break;
    case BALL_OUTCOMES.WIDE:
      extraRuns = match.settings.wideRuns + runs;
      totalRuns = extraRuns;
      isLegalDelivery = false;
      currentInnings.extras.wides += extraRuns;
      break;
    case BALL_OUTCOMES.NO_BALL:
      extraRuns = match.settings.noBallRuns;
      batsmanRuns = runs;
      totalRuns = extraRuns + batsmanRuns;
      isLegalDelivery = false;
      currentInnings.extras.noBalls += extraRuns;
      break;
    case BALL_OUTCOMES.BYE:
      extraRuns = runs || 1;
      totalRuns = extraRuns;
      currentInnings.extras.byes += extraRuns;
      break;
    case BALL_OUTCOMES.LEG_BYE:
      extraRuns = runs || 1;
      totalRuns = extraRuns;
      currentInnings.extras.legByes += extraRuns;
      break;
    case BALL_OUTCOMES.WICKET:
      // Wicket logic handled separately
      break;
    default:
      batsmanRuns = runs;
      totalRuns = runs;
  }

  // Create ball record
  const ball = {
    overNumber: currentInnings.currentOver,
    ballNumber: currentInnings.currentBall + 1,
    bowler: currentInnings.currentBowler,
    batsman: currentInnings.currentBatsmen.striker,
    nonStriker: currentInnings.currentBatsmen.nonStriker,
    outcome,
    runs: {
      batsmanRuns,
      extraRuns,
      totalRuns
    },
    isWicket,
    isLegalDelivery,
    isBoundary,
    commentary,
    timestamp: new Date()
  };

  // Handle wicket
  if (isWicket || outcome === BALL_OUTCOMES.WICKET) {
    ball.isWicket = true;
    ball.wicket = {
      dismissalType
    };

    // Set batsman out
    if (batsmanOutId) {
      ball.wicket.batsmanOut = { user: batsmanOutId, isGuest: false };
    } else if (batsmanOutGuestId) {
      ball.wicket.batsmanOut = { isGuest: true, guestId: batsmanOutGuestId };
    } else {
      ball.wicket.batsmanOut = currentInnings.currentBatsmen.striker;
    }

    // Set fielder if applicable
    if (fielderId) {
      ball.wicket.fielder = { user: fielderId, isGuest: false };
    } else if (fielderGuestId) {
      ball.wicket.fielder = { isGuest: true, guestId: fielderGuestId };
    }

    currentInnings.totalWickets += 1;

    // Record fall of wicket
    currentInnings.fallOfWickets.push({
      wicketNumber: currentInnings.totalWickets,
      runs: currentInnings.totalRuns + totalRuns,
      overs: currentInnings.currentOver,
      balls: currentInnings.currentBall + (isLegalDelivery ? 1 : 0),
      batsman: ball.wicket.batsmanOut
    });

    // Update player performance
    const batsmanOutPerf = match.playerPerformances.find(p => {
      if (batsmanOutId) return p.player.user?.toString() === batsmanOutId;
      if (batsmanOutGuestId) return p.player.guestId === batsmanOutGuestId;
      return false;
    });

    if (batsmanOutPerf) {
      batsmanOutPerf.batting.isOut = true;
      batsmanOutPerf.batting.dismissalType = dismissalType;
    }
  }

  // Add ball to innings
  currentInnings.balls.push(ball);
  currentInnings.totalRuns += totalRuns;
  currentInnings.extras.total = 
    currentInnings.extras.wides + 
    currentInnings.extras.noBalls + 
    currentInnings.extras.byes + 
    currentInnings.extras.legByes;

  // Update ball count for legal deliveries
  if (isLegalDelivery) {
    currentInnings.currentBall += 1;
    currentInnings.totalBalls += 1;

    // Check for over completion
    if (currentInnings.currentBall >= DEFAULTS.BALLS_PER_OVER) {
      currentInnings.currentOver += 1;
      currentInnings.totalOvers += 1;
      currentInnings.currentBall = 0;

      // Swap batsmen at end of over
      const temp = currentInnings.currentBatsmen.striker;
      currentInnings.currentBatsmen.striker = currentInnings.currentBatsmen.nonStriker;
      currentInnings.currentBatsmen.nonStriker = temp;

      // Clear bowler for new over
      currentInnings.currentBowler = {};
    }
  }

  // Swap batsmen on odd runs
  if (isLegalDelivery && (batsmanRuns % 2 === 1)) {
    const temp = currentInnings.currentBatsmen.striker;
    currentInnings.currentBatsmen.striker = currentInnings.currentBatsmen.nonStriker;
    currentInnings.currentBatsmen.nonStriker = temp;
  }

  // Calculate run rate
  const totalOvers = currentInnings.totalOvers + (currentInnings.currentBall / 6);
  currentInnings.runRate = totalOvers > 0 ? (currentInnings.totalRuns / totalOvers).toFixed(2) : 0;

  // Check for innings completion
  const maxWickets = match.settings.playersPerTeam - 1;
  const maxOvers = match.settings.overs;

  if (currentInnings.totalWickets >= maxWickets || currentInnings.totalOvers >= maxOvers) {
    currentInnings.status = INNINGS_STATUS.COMPLETED;
    currentInnings.endTime = new Date();

    // Handle innings transition
    if (match.currentInnings === 'first') {
      match.status = MATCH_STATUS.INNINGS_BREAK;
      match.innings.second.target = currentInnings.totalRuns + 1;
    } else {
      // Match completed
      match.status = MATCH_STATUS.COMPLETED;
      match.endTime = new Date();
      match.result = match.determineResult();
      
      // Update room status
      await Room.findByIdAndUpdate(match.room, { status: ROOM_STATUS.COMPLETED });
    }
  }

  // Check for chase completion (second innings)
  if (match.currentInnings === 'second' && currentInnings.totalRuns >= match.innings.first.totalRuns + 1) {
    currentInnings.status = INNINGS_STATUS.COMPLETED;
    currentInnings.endTime = new Date();
    match.status = MATCH_STATUS.COMPLETED;
    match.endTime = new Date();
    match.result = match.determineResult();
    
    await Room.findByIdAndUpdate(match.room, { status: ROOM_STATUS.COMPLETED });
  }

  await match.save();

  return successResponse(res, {
    message: 'Ball recorded',
    data: {
      ball,
      innings: {
        totalRuns: currentInnings.totalRuns,
        totalWickets: currentInnings.totalWickets,
        overs: `${currentInnings.totalOvers}.${currentInnings.currentBall}`,
        runRate: currentInnings.runRate,
        status: currentInnings.status
      },
      matchStatus: match.status,
      result: match.result
    }
  });
};

/**
 * @desc    Start second innings
 * @route   POST /api/v1/matches/:matchId/innings/second
 * @access  Private (Umpire only)
 */
const startSecondInnings = async (req, res) => {
  const { matchId } = req.params;

  const match = await Match.findById(matchId);

  if (!match) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.MATCH_NOT_FOUND]);
  }

  if (match.status !== MATCH_STATUS.INNINGS_BREAK) {
    throw new ValidationError('Match is not in innings break');
  }

  match.currentInnings = 'second';
  match.innings.second.status = INNINGS_STATUS.NOT_STARTED;
  match.status = MATCH_STATUS.IN_PROGRESS;

  await match.save();

  return successResponse(res, {
    message: 'Second innings ready to start',
    data: {
      target: match.innings.first.totalRuns + 1,
      battingTeam: match[match.innings.second.battingTeam].name
    }
  });
};

/**
 * @desc    Set new batsman (after wicket)
 * @route   POST /api/v1/matches/:matchId/newBatsman
 * @access  Private (Umpire only)
 */
const setNewBatsman = async (req, res) => {
  const { matchId } = req.params;
  const { batsmanId, batsmanGuestId } = req.body;

  const match = await Match.findById(matchId);

  if (!match) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.MATCH_NOT_FOUND]);
  }

  const currentInnings = match.innings[match.currentInnings];
  const battingTeam = match[currentInnings.battingTeam];

  if (batsmanId) {
    const batsman = battingTeam.players.find(p => p.user?.toString() === batsmanId);
    if (!batsman) {
      throw new ValidationError('Batsman not found in batting team');
    }
    currentInnings.currentBatsmen.striker = {
      user: batsmanId,
      isGuest: false
    };
  } else if (batsmanGuestId) {
    const batsman = battingTeam.players.find(p => p.guestId === batsmanGuestId);
    if (!batsman) {
      throw new ValidationError('Batsman not found in batting team');
    }
    currentInnings.currentBatsmen.striker = {
      isGuest: true,
      guestName: batsman.guestName,
      guestId: batsmanGuestId
    };
  }

  await match.save();

  return successResponse(res, {
    message: 'New batsman set successfully',
    data: { batsmen: currentInnings.currentBatsmen }
  });
};

/**
 * @desc    Undo last ball
 * @route   DELETE /api/v1/matches/:matchId/ball
 * @access  Private (Umpire only)
 */
const undoLastBall = async (req, res) => {
  const { matchId } = req.params;

  const match = await Match.findById(matchId);

  if (!match) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.MATCH_NOT_FOUND]);
  }

  const currentInnings = match.innings[match.currentInnings];

  if (currentInnings.balls.length === 0) {
    throw new ValidationError('No balls to undo');
  }

  const lastBall = currentInnings.balls.pop();

  // Reverse the ball effects
  currentInnings.totalRuns -= lastBall.runs.totalRuns;

  if (lastBall.isLegalDelivery) {
    currentInnings.totalBalls -= 1;
    
    if (currentInnings.currentBall === 0) {
      currentInnings.currentOver -= 1;
      currentInnings.totalOvers -= 1;
      currentInnings.currentBall = DEFAULTS.BALLS_PER_OVER - 1;
    } else {
      currentInnings.currentBall -= 1;
    }
  }

  if (lastBall.isWicket) {
    currentInnings.totalWickets -= 1;
    currentInnings.fallOfWickets.pop();
  }

  // Reverse extras
  if (lastBall.outcome === BALL_OUTCOMES.WIDE) {
    currentInnings.extras.wides -= lastBall.runs.extraRuns;
  } else if (lastBall.outcome === BALL_OUTCOMES.NO_BALL) {
    currentInnings.extras.noBalls -= match.settings.noBallRuns;
  } else if (lastBall.outcome === BALL_OUTCOMES.BYE) {
    currentInnings.extras.byes -= lastBall.runs.extraRuns;
  } else if (lastBall.outcome === BALL_OUTCOMES.LEG_BYE) {
    currentInnings.extras.legByes -= lastBall.runs.extraRuns;
  }

  currentInnings.extras.total = 
    currentInnings.extras.wides + 
    currentInnings.extras.noBalls + 
    currentInnings.extras.byes + 
    currentInnings.extras.legByes;

  await match.save();

  return successResponse(res, {
    message: 'Last ball undone',
    data: {
      undone: lastBall,
      innings: {
        totalRuns: currentInnings.totalRuns,
        totalWickets: currentInnings.totalWickets,
        overs: `${currentInnings.totalOvers}.${currentInnings.currentBall}`
      }
    }
  });
};

/**
 * @desc    Get match by ID
 * @route   GET /api/v1/matches/:matchId
 * @access  Public
 */
const getMatchById = async (req, res) => {
  const { matchId } = req.params;

  const match = await Match.findById(matchId)
    .populate('room', 'name code')
    .populate('teamA.players.user', 'username firstName lastName fullName avatar')
    .populate('teamB.players.user', 'username firstName lastName fullName avatar')
    .populate('umpire.user', 'username firstName lastName fullName avatar')
    .populate('manOfTheMatch.user', 'username firstName lastName fullName avatar');

  if (!match) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.MATCH_NOT_FOUND]);
  }

  return successResponse(res, {
    data: { match }
  });
};

/**
 * @desc    Get all matches (with filters)
 * @route   GET /api/v1/matches
 * @access  Public
 */
const getAllMatches = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sort, ['createdAt', 'status']);

  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.roomId) {
    filter.room = req.query.roomId;
  }

  const [matches, total] = await Promise.all([
    Match.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('room', 'name code')
      .select('teamA.name teamB.name status result createdAt'),
    Match.countDocuments(filter)
  ]);

  return paginatedResponse(res, {
    data: matches,
    page,
    limit,
    total,
    message: 'Matches retrieved successfully'
  });
};

/**
 * @desc    Get live score
 * @route   GET /api/v1/matches/:matchId/live
 * @access  Public
 */
const getLiveScore = async (req, res) => {
  const { matchId } = req.params;

  const match = await Match.findById(matchId)
    .select('teamA.name teamB.name status innings currentInnings toss result settings');

  if (!match) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.MATCH_NOT_FOUND]);
  }

  const currentInnings = match.innings[match.currentInnings];

  return successResponse(res, {
    data: {
      matchStatus: match.status,
      toss: match.toss,
      currentInnings: match.currentInnings,
      score: {
        battingTeam: match[currentInnings?.battingTeam]?.name,
        runs: currentInnings?.totalRuns || 0,
        wickets: currentInnings?.totalWickets || 0,
        overs: currentInnings ? `${currentInnings.totalOvers}.${currentInnings.currentBall}` : '0.0',
        runRate: currentInnings?.runRate || 0,
        target: match.currentInnings === 'second' ? match.innings.first.totalRuns + 1 : null,
        requiredRunRate: match.currentInnings === 'second' ? match.calculateRequiredRunRate() : null
      },
      batsmen: currentInnings?.currentBatsmen,
      bowler: currentInnings?.currentBowler,
      lastBall: currentInnings?.balls?.slice(-1)[0],
      result: match.result
    }
  });
};

/**
 * @desc    End match manually (abandon)
 * @route   POST /api/v1/matches/:matchId/end
 * @access  Private (Host/Admin only)
 */
const endMatch = async (req, res) => {
  const { matchId } = req.params;
  const { reason } = req.body;

  const match = await Match.findById(matchId);

  if (!match) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.MATCH_NOT_FOUND]);
  }

  const room = await Room.findById(match.room);
  
  if (!room.isHost(req.user._id) && req.user.role !== 'admin') {
    throw new AuthorizationError('Only host or admin can end the match');
  }

  match.status = MATCH_STATUS.ABANDONED;
  match.endTime = new Date();
  match.result = {
    resultType: 'abandoned',
    resultText: reason || 'Match abandoned'
  };

  await match.save();
  await Room.findByIdAndUpdate(match.room, { status: ROOM_STATUS.COMPLETED });

  return successResponse(res, {
    message: 'Match ended',
    data: { match }
  });
};

module.exports = {
  startMatch,
  conductToss,
  setBatsmen,
  setBowler,
  recordBall,
  startSecondInnings,
  setNewBatsman,
  undoLastBall,
  getMatchById,
  getAllMatches,
  getLiveScore,
  endMatch
};
