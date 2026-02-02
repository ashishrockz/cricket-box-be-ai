const { Room, Match } = require('../models');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { 
  successResponse, 
  createdResponse,
  paginatedResponse, 
  noContentResponse 
} = require('../utils/response');
const { 
  NotFoundError, 
  AuthorizationError,
  ConflictError,
  ValidationError,
  ERROR_CODES,
  ERROR_MESSAGES 
} = require('../utils/errors');
const { parsePagination, parseSort } = require('../utils/helpers');
const { ROOM_STATUS, MATCH_STATUS } = require('../config/constants');

/**
 * @desc    Create a new room
 * @route   POST /api/v1/rooms
 * @access  Private
 */
const createRoom = async (req, res) => {
  const { name, description, settings } = req.body;

  let roomSettings = settings || {};
  if (roomSettings.password) {
    const salt = await bcrypt.genSalt(10);
    roomSettings.password = await bcrypt.hash(roomSettings.password, salt);
    roomSettings.isPrivate = true;
  }

  const room = await Room.create({
    name,
    description,
    host: req.user._id,
    settings: roomSettings,
    participants: [{
      user: req.user._id,
      joinedAt: new Date(),
      isReady: true
    }]
  });

  await room.populate('host', 'username firstName lastName fullName avatar');
  await room.populate('participants.user', 'username firstName lastName fullName avatar');

  return createdResponse(res, {
    message: 'Room created successfully',
    data: {
      room: {
        id: room._id,
        name: room.name,
        code: room.code,
        description: room.description,
        host: room.host,
        status: room.status,
        settings: {
          ...room.settings.toObject(),
          password: undefined
        },
        participants: room.participants,
        totalParticipants: room.totalParticipants,
        createdAt: room.createdAt
      }
    }
  });
};

/**
 * @desc    Get all rooms (with filters)
 * @route   GET /api/v1/rooms
 * @access  Private
 */
const getAllRooms = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sort, ['createdAt', 'name', 'status']);

  const filter = {
    status: { $in: [ROOM_STATUS.WAITING, ROOM_STATUS.TEAM_SETUP, ROOM_STATUS.READY] }
  };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.myRooms !== 'true') {
    filter['settings.isPrivate'] = false;
  } else {
    filter.$or = [
      { host: req.user._id },
      { 'participants.user': req.user._id }
    ];
    delete filter.status;
    delete filter['settings.isPrivate'];
  }

  const [rooms, total] = await Promise.all([
    Room.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('host', 'username firstName lastName fullName avatar')
      .select('-settings.password'),
    Room.countDocuments(filter)
  ]);

  return paginatedResponse(res, {
    data: rooms,
    page,
    limit,
    total,
    message: 'Rooms retrieved successfully'
  });
};

/**
 * @desc    Get room by ID
 * @route   GET /api/v1/rooms/:roomId
 * @access  Private
 */
const getRoomById = async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId)
    .populate('host', 'username firstName lastName fullName avatar')
    .populate('participants.user', 'username firstName lastName fullName avatar')
    .populate('teamA.players.user', 'username firstName lastName fullName avatar')
    .populate('teamB.players.user', 'username firstName lastName fullName avatar')
    .populate('umpire.user', 'username firstName lastName fullName avatar')
    .populate('currentMatch')
    .select('-settings.password');

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  return successResponse(res, {
    data: { room }
  });
};

/**
 * @desc    Join a room by code
 * @route   POST /api/v1/rooms/join
 * @access  Private
 */
const joinRoom = async (req, res) => {
  const { code, password } = req.body;

  const room = await Room.findOne({ code: code.toUpperCase() })
    .select('+settings.password')
    .populate('host', 'username firstName lastName fullName avatar');

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.INVALID_ROOM_CODE]);
  }

  if (room.status === ROOM_STATUS.CLOSED || room.status === ROOM_STATUS.COMPLETED) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.ROOM_CLOSED]);
  }

  if (room.isFull) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.ROOM_FULL]);
  }

  if (room.isParticipant(req.user._id)) {
    throw new ConflictError(ERROR_MESSAGES[ERROR_CODES.USER_ALREADY_IN_ROOM]);
  }

  if (room.settings.isPrivate && room.settings.password) {
    if (!password) {
      throw new ValidationError('Password is required for this room');
    }
    const isMatch = await bcrypt.compare(password, room.settings.password);
    if (!isMatch) {
      throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.INVALID_ROOM_PASSWORD]);
    }
  }

  room.addParticipant(req.user._id);
  await room.save();

  await room.populate('participants.user', 'username firstName lastName fullName avatar');
  room.settings.password = undefined;

  return successResponse(res, {
    message: 'Joined room successfully',
    data: { room }
  });
};

/**
 * @desc    Leave a room
 * @route   POST /api/v1/rooms/:roomId/leave
 * @access  Private
 */
const leaveRoom = async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (room.isHost(req.user._id)) {
    throw new ValidationError('Host cannot leave the room. Please close the room instead.');
  }

  if (!room.isParticipant(req.user._id)) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_IN_ROOM]);
  }

  if (room.status === ROOM_STATUS.IN_MATCH) {
    throw new ValidationError('Cannot leave room while match is in progress');
  }

  room.removeParticipant(req.user._id);
  await room.save();

  return successResponse(res, {
    message: 'Left room successfully'
  });
};

/**
 * @desc    Update room settings (Host only)
 * @route   PUT /api/v1/rooms/:roomId
 * @access  Private
 */
const updateRoom = async (req, res) => {
  const { roomId } = req.params;
  const { name, description, settings } = req.body;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (!room.isHost(req.user._id)) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_ROOM_HOST]);
  }

  if (room.status === ROOM_STATUS.IN_MATCH) {
    throw new ValidationError('Cannot update room while match is in progress');
  }

  if (name) room.name = name;
  if (description !== undefined) room.description = description;
  
  if (settings) {
    if (settings.password) {
      const salt = await bcrypt.genSalt(10);
      settings.password = await bcrypt.hash(settings.password, salt);
      settings.isPrivate = true;
    }
    Object.assign(room.settings, settings);
  }

  await room.save();
  room.settings.password = undefined;

  return successResponse(res, {
    message: 'Room updated successfully',
    data: { room }
  });
};

/**
 * @desc    Close/Delete room (Host only)
 * @route   DELETE /api/v1/rooms/:roomId
 * @access  Private
 */
const closeRoom = async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (!room.isHost(req.user._id)) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_ROOM_HOST]);
  }

  if (room.status === ROOM_STATUS.IN_MATCH) {
    throw new ValidationError('Cannot close room while match is in progress');
  }

  room.status = ROOM_STATUS.CLOSED;
  await room.save();

  return successResponse(res, {
    message: 'Room closed successfully'
  });
};

/**
 * @desc    Add guest participant (Host only)
 * @route   POST /api/v1/rooms/:roomId/guests
 * @access  Private
 */
const addGuest = async (req, res) => {
  const { roomId } = req.params;
  const { name } = req.body;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (!room.isHost(req.user._id)) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_ROOM_HOST]);
  }

  if (!room.settings.allowGuests) {
    throw new ValidationError('Guests are not allowed in this room');
  }

  if (room.isFull) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.ROOM_FULL]);
  }

  const guestId = uuidv4();

  room.guestParticipants.push({
    name,
    guestId,
    joinedAt: new Date(),
    isReady: false
  });

  await room.save();

  return createdResponse(res, {
    message: 'Guest added successfully',
    data: { guest: { name, guestId } }
  });
};

/**
 * @desc    Remove guest participant (Host only)
 * @route   DELETE /api/v1/rooms/:roomId/guests/:guestId
 * @access  Private
 */
const removeGuest = async (req, res) => {
  const { roomId, guestId } = req.params;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (!room.isHost(req.user._id)) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_ROOM_HOST]);
  }

  room.guestParticipants = room.guestParticipants.filter(g => g.guestId !== guestId);
  room.teamA.players = room.teamA.players.filter(p => p.guestId !== guestId);
  room.teamB.players = room.teamB.players.filter(p => p.guestId !== guestId);

  await room.save();

  return successResponse(res, {
    message: 'Guest removed successfully'
  });
};

/**
 * @desc    Set team names (Host only)
 * @route   PUT /api/v1/rooms/:roomId/teams
 * @access  Private
 */
const setTeamNames = async (req, res) => {
  const { roomId } = req.params;
  const { teamAName, teamBName } = req.body;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (!room.isHost(req.user._id)) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_ROOM_HOST]);
  }

  if (teamAName) room.teamA.name = teamAName;
  if (teamBName) room.teamB.name = teamBName;

  await room.save();

  return successResponse(res, {
    message: 'Team names updated successfully',
    data: {
      teamA: { name: room.teamA.name },
      teamB: { name: room.teamB.name }
    }
  });
};

/**
 * @desc    Assign player to team (Host only)
 * @route   POST /api/v1/rooms/:roomId/teams/assign
 * @access  Private
 */
const assignToTeam = async (req, res) => {
  const { roomId } = req.params;
  const { team, userId, guestId, isCaptain } = req.body;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (!room.isHost(req.user._id)) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_ROOM_HOST]);
  }

  const targetTeam = team === 'teamA' ? room.teamA : room.teamB;
  if (targetTeam.players.length >= room.settings.playersPerTeam) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.TEAM_FULL]);
  }

  let playerEntry;
  
  if (userId) {
    if (!room.isParticipant(userId)) {
      throw new ValidationError('User is not a participant of this room');
    }
    
    if (room.isInTeam(userId)) {
      throw new ConflictError(ERROR_MESSAGES[ERROR_CODES.PLAYER_ALREADY_IN_TEAM]);
    }
    
    playerEntry = {
      user: userId,
      isGuest: false,
      isCaptain: isCaptain || false
    };
  } else if (guestId) {
    const guest = room.guestParticipants.find(g => g.guestId === guestId);
    if (!guest) {
      throw new ValidationError('Guest not found in room');
    }
    
    const inTeamA = room.teamA.players.some(p => p.guestId === guestId);
    const inTeamB = room.teamB.players.some(p => p.guestId === guestId);
    if (inTeamA || inTeamB) {
      throw new ConflictError(ERROR_MESSAGES[ERROR_CODES.PLAYER_ALREADY_IN_TEAM]);
    }
    
    playerEntry = {
      isGuest: true,
      guestName: guest.name,
      guestId: guest.guestId,
      isCaptain: isCaptain || false
    };
  } else {
    throw new ValidationError('Either userId or guestId is required');
  }

  if (isCaptain) {
    targetTeam.players.forEach(p => p.isCaptain = false);
  }

  targetTeam.players.push(playerEntry);

  if (room.status === ROOM_STATUS.WAITING) {
    room.status = ROOM_STATUS.TEAM_SETUP;
  }

  await room.save();
  await room.populate(`${team}.players.user`, 'username firstName lastName fullName avatar');

  return successResponse(res, {
    message: 'Player assigned to team successfully',
    data: { team: room[team] }
  });
};

/**
 * @desc    Remove player from team (Host only)
 * @route   DELETE /api/v1/rooms/:roomId/teams/:team/player
 * @access  Private
 */
const removeFromTeam = async (req, res) => {
  const { roomId, team } = req.params;
  const { userId, guestId } = req.body;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (!room.isHost(req.user._id)) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_ROOM_HOST]);
  }

  const targetTeam = team === 'teamA' ? room.teamA : room.teamB;

  if (userId) {
    targetTeam.players = targetTeam.players.filter(
      p => !p.user || p.user.toString() !== userId
    );
  } else if (guestId) {
    targetTeam.players = targetTeam.players.filter(p => p.guestId !== guestId);
  }

  await room.save();

  return successResponse(res, {
    message: 'Player removed from team successfully'
  });
};

/**
 * @desc    Assign umpire (Host only)
 * @route   POST /api/v1/rooms/:roomId/umpire
 * @access  Private
 */
const assignUmpire = async (req, res) => {
  const { roomId } = req.params;
  const { userId, guestName } = req.body;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (!room.isHost(req.user._id)) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_ROOM_HOST]);
  }

  if (userId) {
    room.umpire = {
      user: userId,
      isGuest: false
    };
  } else if (guestName) {
    room.umpire = {
      isGuest: true,
      guestName,
      guestId: uuidv4()
    };
  } else {
    room.umpire = {
      user: req.user._id,
      isGuest: false
    };
  }

  await room.save();
  await room.populate('umpire.user', 'username firstName lastName fullName avatar');

  return successResponse(res, {
    message: 'Umpire assigned successfully',
    data: { umpire: room.umpire }
  });
};

/**
 * @desc    Mark room as ready for match (Host only)
 * @route   POST /api/v1/rooms/:roomId/ready
 * @access  Private
 */
const markRoomReady = async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (!room.isHost(req.user._id)) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_ROOM_HOST]);
  }

  if (!room.teamsReady) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.TEAMS_NOT_READY]);
  }

  if (!room.umpire.user && !room.umpire.guestId) {
    throw new ValidationError('Please assign an umpire before starting');
  }

  room.status = ROOM_STATUS.READY;
  await room.save();

  return successResponse(res, {
    message: 'Room is ready for match',
    data: { status: room.status }
  });
};

/**
 * @desc    Kick participant (Host only)
 * @route   DELETE /api/v1/rooms/:roomId/participants/:participantId
 * @access  Private
 */
const kickParticipant = async (req, res) => {
  const { roomId, participantId } = req.params;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (!room.isHost(req.user._id)) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.NOT_ROOM_HOST]);
  }

  if (participantId === req.user._id.toString()) {
    throw new ValidationError('Cannot kick yourself');
  }

  if (room.status === ROOM_STATUS.IN_MATCH) {
    throw new ValidationError('Cannot kick participants during a match');
  }

  room.removeParticipant(participantId);
  await room.save();

  return successResponse(res, {
    message: 'Participant removed successfully'
  });
};

module.exports = {
  createRoom,
  getAllRooms,
  getRoomById,
  joinRoom,
  leaveRoom,
  updateRoom,
  closeRoom,
  addGuest,
  removeGuest,
  setTeamNames,
  assignToTeam,
  removeFromTeam,
  assignUmpire,
  markRoomReady,
  kickParticipant
};
