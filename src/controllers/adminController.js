const { User, Room, Match } = require('../models');
const { 
  successResponse, 
  paginatedResponse 
} = require('../utils/response');
const { 
  NotFoundError,
  ERROR_CODES,
  ERROR_MESSAGES 
} = require('../utils/errors');
const { parsePagination, parseSort } = require('../utils/helpers');
const { ACCOUNT_STATUS, MATCH_STATUS, ROOM_STATUS } = require('../config/constants');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/v1/admin/dashboard
 * @access  Private/Admin
 */
const getDashboardStats = async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    totalRooms,
    activeRooms,
    totalMatches,
    completedMatches,
    liveMatches
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: ACCOUNT_STATUS.ACTIVE }),
    Room.countDocuments(),
    Room.countDocuments({ status: { $in: [ROOM_STATUS.WAITING, ROOM_STATUS.TEAM_SETUP, ROOM_STATUS.READY, ROOM_STATUS.IN_MATCH] } }),
    Match.countDocuments(),
    Match.countDocuments({ status: MATCH_STATUS.COMPLETED }),
    Match.countDocuments({ status: MATCH_STATUS.IN_PROGRESS })
  ]);

  // Get recent registrations (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentRegistrations = await User.countDocuments({
    createdAt: { $gte: sevenDaysAgo }
  });

  // Get recent matches (last 7 days)
  const recentMatches = await Match.countDocuments({
    createdAt: { $gte: sevenDaysAgo }
  });

  // Get user registration trend (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const registrationTrend = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return successResponse(res, {
    data: {
      overview: {
        totalUsers,
        activeUsers,
        totalRooms,
        activeRooms,
        totalMatches,
        completedMatches,
        liveMatches
      },
      recent: {
        registrations: recentRegistrations,
        matches: recentMatches
      },
      trends: {
        registrations: registrationTrend
      }
    }
  });
};

/**
 * @desc    Get all users with detailed info
 * @route   GET /api/v1/admin/users
 * @access  Private/Admin
 */
const getUsers = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sort, ['createdAt', 'username', 'email', 'role', 'status', 'lastLogin']);

  const filter = {};

  // Apply filters
  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.role) {
    filter.role = req.query.role;
  }

  if (req.query.isEmailVerified) {
    filter.isEmailVerified = req.query.isEmailVerified === 'true';
  }

  // Search
  if (req.query.search) {
    filter.$or = [
      { username: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
      { firstName: { $regex: req.query.search, $options: 'i' } },
      { lastName: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-refreshToken -otp -password'),
    User.countDocuments(filter)
  ]);

  return paginatedResponse(res, {
    data: users,
    page,
    limit,
    total,
    message: 'Users retrieved successfully'
  });
};

/**
 * @desc    Get user details
 * @route   GET /api/v1/admin/users/:userId
 * @access  Private/Admin
 */
const getUserDetails = async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('-refreshToken -otp -password');

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  // Get user's match history
  const matchHistory = await Match.find({
    $or: [
      { 'teamA.players.user': userId },
      { 'teamB.players.user': userId }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('teamA.name teamB.name status result createdAt');

  // Get user's created rooms
  const createdRooms = await Room.find({ host: userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('name code status createdAt');

  return successResponse(res, {
    data: {
      user,
      matchHistory,
      createdRooms
    }
  });
};

/**
 * @desc    Block/Unblock user
 * @route   PATCH /api/v1/admin/users/:userId/block
 * @access  Private/Admin
 */
const toggleUserBlock = async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  // Toggle block status
  user.status = user.status === ACCOUNT_STATUS.BLOCKED 
    ? ACCOUNT_STATUS.ACTIVE 
    : ACCOUNT_STATUS.BLOCKED;

  await user.save({ validateBeforeSave: false });

  return successResponse(res, {
    message: user.status === ACCOUNT_STATUS.BLOCKED ? 'User blocked' : 'User unblocked',
    data: {
      userId: user._id,
      username: user.username,
      status: user.status
    }
  });
};

/**
 * @desc    Get all rooms with admin view
 * @route   GET /api/v1/admin/rooms
 * @access  Private/Admin
 */
const getRooms = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sort, ['createdAt', 'name', 'status']);

  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { code: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const [rooms, total] = await Promise.all([
    Room.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('host', 'username firstName lastName')
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
 * @desc    Force close a room
 * @route   DELETE /api/v1/admin/rooms/:roomId
 * @access  Private/Admin
 */
const forceCloseRoom = async (req, res) => {
  const { roomId } = req.params;
  const { reason } = req.body;

  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.ROOM_NOT_FOUND]);
  }

  // If match is in progress, abandon it
  if (room.currentMatch) {
    await Match.findByIdAndUpdate(room.currentMatch, {
      status: MATCH_STATUS.ABANDONED,
      endTime: new Date(),
      result: {
        resultType: 'abandoned',
        resultText: reason || 'Room closed by admin'
      }
    });
  }

  room.status = ROOM_STATUS.CLOSED;
  await room.save();

  return successResponse(res, {
    message: 'Room closed successfully',
    data: { roomId, status: room.status }
  });
};

/**
 * @desc    Get all matches with admin view
 * @route   GET /api/v1/admin/matches
 * @access  Private/Admin
 */
const getMatches = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sort, ['createdAt', 'status']);

  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [matches, total] = await Promise.all([
    Match.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('room', 'name code')
      .populate('createdBy', 'username firstName lastName')
      .select('teamA.name teamB.name status result createdAt startTime endTime'),
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
 * @desc    Force end a match
 * @route   POST /api/v1/admin/matches/:matchId/end
 * @access  Private/Admin
 */
const forceEndMatch = async (req, res) => {
  const { matchId } = req.params;
  const { reason } = req.body;

  const match = await Match.findById(matchId);

  if (!match) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.MATCH_NOT_FOUND]);
  }

  match.status = MATCH_STATUS.ABANDONED;
  match.endTime = new Date();
  match.result = {
    resultType: 'abandoned',
    resultText: reason || 'Match ended by admin'
  };

  await match.save();

  // Update room status
  await Room.findByIdAndUpdate(match.room, { status: ROOM_STATUS.COMPLETED });

  return successResponse(res, {
    message: 'Match ended successfully',
    data: { matchId, status: match.status }
  });
};

/**
 * @desc    Get system audit logs (placeholder)
 * @route   GET /api/v1/admin/audit-logs
 * @access  Private/Admin
 */
const getAuditLogs = async (req, res) => {
  // This would typically pull from a separate audit log collection
  // For now, return a placeholder
  return successResponse(res, {
    message: 'Audit logs feature coming soon',
    data: {
      logs: []
    }
  });
};

/**
 * @desc    Get platform configuration
 * @route   GET /api/v1/admin/config
 * @access  Private/Admin
 */
const getPlatformConfig = async (req, res) => {
  return successResponse(res, {
    data: {
      defaults: {
        overs: parseInt(process.env.DEFAULT_OVERS) || 6,
        playersPerTeam: parseInt(process.env.DEFAULT_PLAYERS_PER_TEAM) || 6,
        maxPlayersPerRoom: parseInt(process.env.MAX_PLAYERS_PER_ROOM) || 20
      },
      rateLimits: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
      },
      otp: {
        expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10,
        length: parseInt(process.env.OTP_LENGTH) || 6
      }
    }
  });
};

/**
 * @desc    Get friendship statistics
 * @route   GET /api/v1/admin/friendship-stats
 * @access  Private/Admin
 */
const getFriendshipStats = async (req, res) => {
  const [
    totalFriendshipsResult,
    pendingRequestsResult,
    totalBlockedResult,
    usersWithMostFriends
  ] = await Promise.all([
    User.aggregate([
      { $unwind: { path: '$friends', preserveNullAndEmptyArrays: false } },
      { $count: 'total' }
    ]),
    User.aggregate([
      { $unwind: { path: '$incomingFriendRequests', preserveNullAndEmptyArrays: false } },
      { $count: 'total' }
    ]),
    User.aggregate([
      { $unwind: { path: '$blockedUsers', preserveNullAndEmptyArrays: false } },
      { $count: 'total' }
    ]),
    User.aggregate([
      { $addFields: { friendsCount: { $size: { $ifNull: ['$friends', []] } } } },
      { $match: { friendsCount: { $gt: 0 } } },
      { $sort: { friendsCount: -1 } },
      { $limit: 10 },
      { $project: { username: 1, firstName: 1, lastName: 1, friendsCount: 1 } }
    ])
  ]);

  // Divide friendships by 2 since they're bidirectional
  const totalFriendships = totalFriendshipsResult[0]?.total ? Math.floor(totalFriendshipsResult[0].total / 2) : 0;
  const pendingRequests = pendingRequestsResult[0]?.total || 0;
  const totalBlocked = totalBlockedResult[0]?.total || 0;

  return successResponse(res, {
    data: {
      totalFriendships,
      pendingRequests,
      totalBlocked,
      usersWithMostFriends
    }
  });
};

/**
 * @desc    Get user relationships
 * @route   GET /api/v1/admin/users/:userId/relationships
 * @access  Private/Admin
 */
const getUserRelationships = async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId)
    .populate('friends', 'username firstName lastName avatar')
    .populate('incomingFriendRequests.from', 'username firstName lastName avatar')
    .populate('outgoingFriendRequests.to', 'username firstName lastName avatar')
    .populate('blockedUsers.user', 'username firstName lastName avatar')
    .select('friends incomingFriendRequests outgoingFriendRequests blockedUsers');

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  return successResponse(res, {
    data: {
      friends: user.friends || [],
      incomingRequests: user.incomingFriendRequests || [],
      outgoingRequests: user.outgoingFriendRequests || [],
      blockedUsers: user.blockedUsers || [],
      counts: {
        friends: (user.friends || []).length,
        incomingRequests: (user.incomingFriendRequests || []).length,
        outgoingRequests: (user.outgoingFriendRequests || []).length,
        blockedUsers: (user.blockedUsers || []).length
      }
    }
  });
};

/**
 * @desc    Force remove friendship between users
 * @route   DELETE /api/v1/admin/friendships
 * @access  Private/Admin
 */
const forceRemoveFriendship = async (req, res) => {
  const { userId1, userId2, reason } = req.body;

  const [user1, user2] = await Promise.all([
    User.findById(userId1),
    User.findById(userId2)
  ]);

  if (!user1 || !user2) {
    throw new NotFoundError('One or both users not found');
  }

  // Remove from both friends lists
  user1.friends = (user1.friends || []).filter(f => f.toString() !== userId2);
  user2.friends = (user2.friends || []).filter(f => f.toString() !== userId1);

  await Promise.all([user1.save(), user2.save()]);

  return successResponse(res, {
    message: 'Friendship removed by admin',
    data: { userId1, userId2, reason }
  });
};

module.exports = {
  getDashboardStats,
  getUsers,
  getUserDetails,
  toggleUserBlock,
  getRooms,
  forceCloseRoom,
  getMatches,
  forceEndMatch,
  getAuditLogs,
  getPlatformConfig,
  getFriendshipStats,
  getUserRelationships,
  forceRemoveFriendship
};
