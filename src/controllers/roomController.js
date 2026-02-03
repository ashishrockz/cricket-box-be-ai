const { Room, Match } = require('../models');
const {
  successResponse,
  createdResponse,
  paginatedResponse
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
const { ROOM_STATUS, ROOM_ROLES } = require('../config/constants');

/**
 * @desc    Create a new room
 * @route   POST /api/v1/rooms
 * @access  Private
 */
const createRoom = async (req, res) => {
  const { name, description, settings } = req.body;

  const room = await Room.create({
    name,
    description,
    creator: req.user._id,
    settings: settings || {},
    participants: [{
      user: req.user._id,
      joinedAt: new Date(),
      role: null,
      isReady: true
    }]
  });

  await room.populate('creator', 'username firstName lastName fullName avatar');
  await room.populate('participants.user', 'username firstName lastName fullName avatar');

  return createdResponse(res, {
    message: 'Room created successfully',
    data: {
      room: {
        id: room._id,
        name: room.name,
        code: room.code,
        description: room.description,
        creator: room.creator,
        status: room.status,
        settings: room.settings,
        participants: room.participants,
        participantCount: room.participantCount,
        isSoloMode: room.isSoloMode,
        createdAt: room.createdAt
      }
    }
  });
};

/**
 * @desc    Get user's rooms (rooms they created or joined)
 * @route   GET /api/v1/rooms
 * @access  Private
 */
const getMyRooms = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sort, ['createdAt', 'name', 'status']);

  const filter = {
    $or: [
      { creator: req.user._id },
      { 'participants.user': req.user._id }
    ]
  };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [rooms, total] = await Promise.all([
    Room.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('creator', 'username firstName lastName fullName avatar')
      .populate('participants.user', 'username firstName lastName fullName avatar'),
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
    .populate('creator', 'username firstName lastName fullName avatar')
    .populate('participants.user', 'username firstName lastName fullName avatar')
    .populate('currentMatch');

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
  const { code } = req.body;

  const room = await Room.findOne({ code: code.toUpperCase() })
    .populate('creator', 'username firstName lastName fullName avatar');

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.INVALID_ROOM_CODE]);
  }

  if (room.status === ROOM_STATUS.CLOSED || room.status === ROOM_STATUS.COMPLETED) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.ROOM_CLOSED]);
  }

  if (room.isFull) {
    throw new ValidationError('Room is full (maximum 3 participants)');
  }

  if (room.isParticipant(req.user._id)) {
    throw new ConflictError(ERROR_MESSAGES[ERROR_CODES.USER_ALREADY_IN_ROOM]);
  }

  room.addParticipant(req.user._id);

  // If room now has 3 participants, move to role selection
  if (room.participants.length === 3) {
    room.status = ROOM_STATUS.ROLE_SELECTION;
  }

  await room.save();
  await room.populate('participants.user', 'username firstName lastName fullName avatar');

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

  if (room.isCreator(req.user._id)) {
    throw new ValidationError('Creator cannot leave the room. Please close the room instead.');
  }

  if (!room.isParticipant(req.user._id)) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_IN_ROOM]);
  }

  if (room.status === ROOM_STATUS.IN_MATCH) {
    throw new ValidationError('Cannot leave room while match is in progress');
  }

  room.removeParticipant(req.user._id);

  // If room no longer has 3 participants, revert to waiting
  if (room.participants.length < 3 && room.status === ROOM_STATUS.ROLE_SELECTION) {
    room.status = ROOM_STATUS.WAITING;
  }

  await room.save();

  return successResponse(res, {
    message: 'Left room successfully'
  });
};

/**
 * @desc    Update room settings (Creator only)
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

  if (!room.isCreator(req.user._id)) {
    throw new AuthorizationError('Only the room creator can update room settings');
  }

  if (room.status === ROOM_STATUS.IN_MATCH) {
    throw new ValidationError('Cannot update room while match is in progress');
  }

  if (name) room.name = name;
  if (description !== undefined) room.description = description;

  if (settings) {
    Object.assign(room.settings, settings);
  }

  await room.save();

  return successResponse(res, {
    message: 'Room updated successfully',
    data: { room }
  });
};

/**
 * @desc    Close/Delete room (Creator only)
 * @route   DELETE /api/v1/rooms/:roomId
 * @access  Private
 */
const closeRoom = async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (!room.isCreator(req.user._id)) {
    throw new AuthorizationError('Only the room creator can close the room');
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
 * @desc    Select role (Umpire, Team A In-charge, Team B In-charge)
 * @route   POST /api/v1/rooms/:roomId/select-role
 * @access  Private
 */
const selectRole = async (req, res) => {
  const { roomId } = req.params;
  const { role } = req.body;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (!room.isParticipant(req.user._id)) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_IN_ROOM]);
  }

  // Solo mode - creator can do everything, no role selection needed
  if (room.isSoloMode) {
    throw new ValidationError('Role selection is not needed in solo mode');
  }

  if (room.participants.length < 3) {
    throw new ValidationError('Need 3 participants before selecting roles');
  }

  if (!Object.values(ROOM_ROLES).includes(role)) {
    throw new ValidationError('Invalid role. Choose from: umpire, team_a_incharge, team_b_incharge');
  }

  room.assignRole(req.user._id, role);

  // Check if all roles are assigned
  if (room.rolesAssigned) {
    room.status = ROOM_STATUS.TEAM_SETUP;
  }

  await room.save();
  await room.populate('participants.user', 'username firstName lastName fullName avatar');

  return successResponse(res, {
    message: `Role '${role}' assigned successfully`,
    data: {
      participants: room.participants,
      rolesAssigned: room.rolesAssigned,
      status: room.status
    }
  });
};

/**
 * @desc    Set team names (Creator or respective In-charge)
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

  // In solo mode, creator can set both team names
  if (room.isSoloMode) {
    if (!room.isCreator(req.user._id)) {
      throw new AuthorizationError('Only the creator can set team names in solo mode');
    }
    if (teamAName) room.teamA.name = teamAName;
    if (teamBName) room.teamB.name = teamBName;
  } else {
    // In 3-player mode, each in-charge can only set their team's name
    if (teamAName) {
      if (!room.isTeamAIncharge(req.user._id) && !room.isCreator(req.user._id)) {
        throw new AuthorizationError('Only Team A In-charge can set Team A name');
      }
      room.teamA.name = teamAName;
    }
    if (teamBName) {
      if (!room.isTeamBIncharge(req.user._id) && !room.isCreator(req.user._id)) {
        throw new AuthorizationError('Only Team B In-charge can set Team B name');
      }
      room.teamB.name = teamBName;
    }
  }

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
 * @desc    Add player to team (In-charge adds players by name)
 * @route   POST /api/v1/rooms/:roomId/teams/:team/players
 * @access  Private
 */
const addPlayerToTeam = async (req, res) => {
  const { roomId, team } = req.params;
  const { playerName, isCaptain } = req.body;

  if (!['teamA', 'teamB'].includes(team)) {
    throw new ValidationError('Invalid team. Use teamA or teamB');
  }

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  // Check authorization
  if (room.isSoloMode) {
    if (!room.isCreator(req.user._id)) {
      throw new AuthorizationError('Only the creator can add players in solo mode');
    }
  } else {
    const isTeamAIncharge = room.isTeamAIncharge(req.user._id);
    const isTeamBIncharge = room.isTeamBIncharge(req.user._id);
    const isCreator = room.isCreator(req.user._id);

    if (team === 'teamA' && !isTeamAIncharge && !isCreator) {
      throw new AuthorizationError('Only Team A In-charge can add players to Team A');
    }
    if (team === 'teamB' && !isTeamBIncharge && !isCreator) {
      throw new AuthorizationError('Only Team B In-charge can add players to Team B');
    }
  }

  const targetTeam = room[team];

  if (targetTeam.players.length >= room.settings.playersPerTeam) {
    throw new ValidationError(`Team is full (maximum ${room.settings.playersPerTeam} players)`);
  }

  // If setting as captain, remove captain from existing player
  if (isCaptain) {
    targetTeam.players.forEach(p => p.isCaptain = false);
  }

  targetTeam.players.push({
    name: playerName,
    isCaptain: isCaptain || false,
    addedBy: req.user._id
  });

  await room.save();

  return createdResponse(res, {
    message: 'Player added to team successfully',
    data: { team: room[team] }
  });
};

/**
 * @desc    Remove player from team
 * @route   DELETE /api/v1/rooms/:roomId/teams/:team/players/:playerId
 * @access  Private
 */
const removePlayerFromTeam = async (req, res) => {
  const { roomId, team, playerId } = req.params;

  if (!['teamA', 'teamB'].includes(team)) {
    throw new ValidationError('Invalid team. Use teamA or teamB');
  }

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  // Check authorization
  if (room.isSoloMode) {
    if (!room.isCreator(req.user._id)) {
      throw new AuthorizationError('Only the creator can remove players in solo mode');
    }
  } else {
    const isTeamAIncharge = room.isTeamAIncharge(req.user._id);
    const isTeamBIncharge = room.isTeamBIncharge(req.user._id);
    const isCreator = room.isCreator(req.user._id);

    if (team === 'teamA' && !isTeamAIncharge && !isCreator) {
      throw new AuthorizationError('Only Team A In-charge can remove players from Team A');
    }
    if (team === 'teamB' && !isTeamBIncharge && !isCreator) {
      throw new AuthorizationError('Only Team B In-charge can remove players from Team B');
    }
  }

  const targetTeam = room[team];
  targetTeam.players = targetTeam.players.filter(p => p._id.toString() !== playerId);

  await room.save();

  return successResponse(res, {
    message: 'Player removed from team successfully',
    data: { team: room[team] }
  });
};

/**
 * @desc    Select next batsman (Team In-charge selects who comes next)
 * @route   POST /api/v1/rooms/:roomId/select-batsman
 * @access  Private
 */
const selectNextBatsman = async (req, res) => {
  const { roomId } = req.params;
  const { playerId, team } = req.body;

  if (!['teamA', 'teamB'].includes(team)) {
    throw new ValidationError('Invalid team. Use teamA or teamB');
  }

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (room.status !== ROOM_STATUS.IN_MATCH) {
    throw new ValidationError('Match is not in progress');
  }

  // Check authorization - only respective in-charge or creator in solo mode
  if (room.isSoloMode) {
    if (!room.isCreator(req.user._id)) {
      throw new AuthorizationError('Only the creator can select batsman in solo mode');
    }
  } else {
    if (team === 'teamA' && !room.isTeamAIncharge(req.user._id)) {
      throw new AuthorizationError('Only Team A In-charge can select batsman for Team A');
    }
    if (team === 'teamB' && !room.isTeamBIncharge(req.user._id)) {
      throw new AuthorizationError('Only Team B In-charge can select batsman for Team B');
    }
  }

  const targetTeam = room[team];
  const player = targetTeam.players.find(p => p._id.toString() === playerId);

  if (!player) {
    throw new NotFoundError('Player not found in team');
  }

  // This would typically update the match state - for now return success
  return successResponse(res, {
    message: 'Next batsman selected',
    data: {
      team,
      player
    }
  });
};

/**
 * @desc    Mark room as ready for match
 * @route   POST /api/v1/rooms/:roomId/ready
 * @access  Private
 */
const markRoomReady = async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  // Only creator can mark room as ready
  if (!room.isCreator(req.user._id)) {
    throw new AuthorizationError('Only the room creator can mark the room as ready');
  }

  // In 3-player mode, all roles must be assigned
  if (!room.isSoloMode && !room.rolesAssigned) {
    throw new ValidationError('All roles must be assigned before starting');
  }

  if (!room.teamsReady) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.TEAMS_NOT_READY]);
  }

  room.status = ROOM_STATUS.READY;
  await room.save();

  return successResponse(res, {
    message: 'Room is ready for match',
    data: { status: room.status }
  });
};

/**
 * @desc    Kick participant (Creator only)
 * @route   DELETE /api/v1/rooms/:roomId/participants/:participantId
 * @access  Private
 */
const kickParticipant = async (req, res) => {
  const { roomId, participantId } = req.params;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  if (!room.isCreator(req.user._id)) {
    throw new AuthorizationError('Only the room creator can kick participants');
  }

  if (participantId === req.user._id.toString()) {
    throw new ValidationError('Cannot kick yourself');
  }

  if (room.status === ROOM_STATUS.IN_MATCH) {
    throw new ValidationError('Cannot kick participants during a match');
  }

  room.removeParticipant(participantId);

  // Revert to waiting if less than 3 participants
  if (room.participants.length < 3) {
    room.status = ROOM_STATUS.WAITING;
  }

  await room.save();

  return successResponse(res, {
    message: 'Participant removed successfully'
  });
};

/**
 * @desc    Get available roles in room
 * @route   GET /api/v1/rooms/:roomId/roles
 * @access  Private
 */
const getAvailableRoles = async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId)
    .populate('participants.user', 'username firstName lastName fullName avatar');

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  const assignedRoles = room.participants
    .filter(p => p.role)
    .map(p => ({ role: p.role, user: p.user }));

  const availableRoles = Object.values(ROOM_ROLES).filter(
    role => !assignedRoles.find(ar => ar.role === role)
  );

  const myRole = room.getUserRole(req.user._id);

  return successResponse(res, {
    data: {
      availableRoles,
      assignedRoles,
      myRole,
      allRolesAssigned: room.rolesAssigned
    }
  });
};

module.exports = {
  createRoom,
  getMyRooms,
  getRoomById,
  joinRoom,
  leaveRoom,
  updateRoom,
  closeRoom,
  selectRole,
  setTeamNames,
  addPlayerToTeam,
  removePlayerFromTeam,
  selectNextBatsman,
  markRoomReady,
  kickParticipant,
  getAvailableRoles
};
