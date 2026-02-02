const { User } = require('../models');
const { 
  successResponse, 
  paginatedResponse, 
  noContentResponse 
} = require('../utils/response');
const { 
  NotFoundError, 
  AuthorizationError,
  ConflictError,
  ERROR_CODES,
  ERROR_MESSAGES 
} = require('../utils/errors');
const { 
  parsePagination, 
  parseSort, 
  buildFilter,
  sanitizeObject 
} = require('../utils/helpers');
const { ROLES, ACCOUNT_STATUS } = require('../config/constants');

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/v1/users
 * @access  Private/Admin
 */
const getAllUsers = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sort, ['createdAt', 'username', 'email', 'role', 'status']);
  
  const allowedFilters = ['role', 'status', 'isEmailVerified'];
  const filter = buildFilter(req.query, allowedFilters);

  // Search functionality
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
      .select('-refreshToken'),
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
 * @desc    Get user by ID
 * @route   GET /api/v1/users/:userId
 * @access  Private
 */
const getUserById = async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('-refreshToken -otp');

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  // Non-admins can only see basic info of other users
  if (req.user.role !== ROLES.ADMIN && req.user._id.toString() !== userId) {
    return successResponse(res, {
      data: {
        user: {
          id: user._id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          avatar: user.avatar,
          statistics: user.statistics
        }
      }
    });
  }

  return successResponse(res, {
    data: { user }
  });
};

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/users/:userId
 * @access  Private
 */
const updateProfile = async (req, res) => {
  const { userId } = req.params;

  // Only allow user to update their own profile (or admin)
  if (req.user.role !== ROLES.ADMIN && req.user._id.toString() !== userId) {
    throw new AuthorizationError('You can only update your own profile');
  }

  const allowedUpdates = ['firstName', 'lastName', 'phone', 'avatar'];
  const updates = sanitizeObject(req.body);

  // Filter only allowed updates
  const filteredUpdates = {};
  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      filteredUpdates[field] = updates[field];
    }
  });

  const user = await User.findByIdAndUpdate(
    userId,
    filteredUpdates,
    { new: true, runValidators: true }
  ).select('-refreshToken -otp -password');

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  return successResponse(res, {
    message: 'Profile updated successfully',
    data: { user }
  });
};

/**
 * @desc    Update user status (Admin only)
 * @route   PATCH /api/v1/users/:userId/status
 * @access  Private/Admin
 */
const updateUserStatus = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  // Prevent admin from changing their own status
  if (req.user._id.toString() === userId) {
    throw new AuthorizationError('You cannot change your own status');
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  // Prevent changing admin status by non-super admin
  if (user.role === ROLES.ADMIN) {
    throw new AuthorizationError('Cannot change status of admin users');
  }

  user.status = status;
  await user.save({ validateBeforeSave: false });

  return successResponse(res, {
    message: `User status updated to ${status}`,
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        status: user.status
      }
    }
  });
};

/**
 * @desc    Update user role (Admin only)
 * @route   PATCH /api/v1/users/:userId/role
 * @access  Private/Admin
 */
const updateUserRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  // Prevent admin from changing their own role
  if (req.user._id.toString() === userId) {
    throw new AuthorizationError('You cannot change your own role');
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  // Prevent creating new admins (only super admin should be able to do this)
  if (role === ROLES.ADMIN) {
    throw new AuthorizationError('Cannot assign admin role');
  }

  user.role = role;
  await user.save({ validateBeforeSave: false });

  return successResponse(res, {
    message: `User role updated to ${role}`,
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    }
  });
};

/**
 * @desc    Delete user (Admin only)
 * @route   DELETE /api/v1/users/:userId
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
  const { userId } = req.params;

  // Prevent admin from deleting themselves
  if (req.user._id.toString() === userId) {
    throw new AuthorizationError('You cannot delete your own account');
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  // Prevent deleting admin users
  if (user.role === ROLES.ADMIN) {
    throw new AuthorizationError('Cannot delete admin users');
  }

  await User.findByIdAndDelete(userId);

  return noContentResponse(res);
};

/**
 * @desc    Get user statistics
 * @route   GET /api/v1/users/:userId/statistics
 * @access  Public
 */
const getUserStatistics = async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('username firstName lastName fullName avatar statistics');

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  return successResponse(res, {
    data: {
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        avatar: user.avatar
      },
      statistics: user.statistics,
      derived: {
        battingAverage: user.statistics.battingAverage,
        strikeRate: user.statistics.strikeRate,
        bowlingAverage: user.statistics.bowlingAverage,
        economyRate: user.statistics.economyRate
      }
    }
  });
};

/**
 * @desc    Get leaderboard
 * @route   GET /api/v1/users/leaderboard
 * @access  Public
 */
const getLeaderboard = async (req, res) => {
  const { type = 'runs', limit = 10 } = req.query;
  const limitNum = Math.min(parseInt(limit) || 10, 50);

  let sortField;
  switch (type) {
    case 'runs':
      sortField = { 'statistics.totalRuns': -1 };
      break;
    case 'wickets':
      sortField = { 'statistics.totalWickets': -1 };
      break;
    case 'matches':
      sortField = { 'statistics.matchesPlayed': -1 };
      break;
    case 'wins':
      sortField = { 'statistics.matchesWon': -1 };
      break;
    case 'sixes':
      sortField = { 'statistics.sixes': -1 };
      break;
    case 'fours':
      sortField = { 'statistics.fours': -1 };
      break;
    case 'catches':
      sortField = { 'statistics.catches': -1 };
      break;
    default:
      sortField = { 'statistics.totalRuns': -1 };
  }

  const users = await User.find({
    'statistics.matchesPlayed': { $gt: 0 },
    status: ACCOUNT_STATUS.ACTIVE
  })
    .sort(sortField)
    .limit(limitNum)
    .select('username firstName lastName fullName avatar statistics');

  const leaderboard = users.map((user, index) => ({
    rank: index + 1,
    user: {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      avatar: user.avatar
    },
    statistics: user.statistics
  }));

  return successResponse(res, {
    message: `${type.charAt(0).toUpperCase() + type.slice(1)} leaderboard`,
    data: {
      type,
      leaderboard
    }
  });
};

/**
 * @desc    Search users
 * @route   GET /api/v1/users/search
 * @access  Private
 */
const searchUsers = async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.length < 2) {
    return successResponse(res, {
      data: { users: [] }
    });
  }

  const limitNum = Math.min(parseInt(limit) || 10, 20);

  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { firstName: { $regex: q, $options: 'i' } },
      { lastName: { $regex: q, $options: 'i' } }
    ],
    status: ACCOUNT_STATUS.ACTIVE
  })
    .limit(limitNum)
    .select('username firstName lastName fullName avatar');

  return successResponse(res, {
    data: { users }
  });
};

module.exports = {
  getAllUsers,
  getUserById,
  updateProfile,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getUserStatistics,
  getLeaderboard,
  searchUsers
};
