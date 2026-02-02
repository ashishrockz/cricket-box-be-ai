const friendService = require('../services/friendService');
const {
  successResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse
} = require('../utils/response');
const { parsePagination } = require('../utils/helpers');

/**
 * @desc    Send friend request
 * @route   POST /api/v1/friends/request/:userId
 * @access  Private
 */
const sendFriendRequest = async (req, res) => {
  const { userId } = req.params;
  const { message } = req.body;
  const senderId = req.user._id;

  await friendService.sendFriendRequest(senderId, userId, message);

  return createdResponse(res, {
    message: 'Friend request sent successfully'
  });
};

/**
 * @desc    Accept friend request
 * @route   POST /api/v1/friends/accept/:userId
 * @access  Private
 */
const acceptFriendRequest = async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  await friendService.acceptFriendRequest(currentUserId, userId);

  return successResponse(res, {
    message: 'Friend request accepted'
  });
};

/**
 * @desc    Reject friend request
 * @route   POST /api/v1/friends/reject/:userId
 * @access  Private
 */
const rejectFriendRequest = async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  await friendService.rejectFriendRequest(currentUserId, userId);

  return successResponse(res, {
    message: 'Friend request rejected'
  });
};

/**
 * @desc    Cancel sent friend request
 * @route   DELETE /api/v1/friends/request/:userId
 * @access  Private
 */
const cancelFriendRequest = async (req, res) => {
  const { userId } = req.params;
  const senderId = req.user._id;

  await friendService.cancelFriendRequest(senderId, userId);

  return noContentResponse(res);
};

/**
 * @desc    Remove friend
 * @route   DELETE /api/v1/friends/:userId
 * @access  Private
 */
const removeFriend = async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  await friendService.removeFriend(currentUserId, userId);

  return noContentResponse(res);
};

/**
 * @desc    Get friends list
 * @route   GET /api/v1/friends
 * @access  Private
 */
const getFriends = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search } = req.query;
  const userId = req.user._id;

  const { friends, total } = await friendService.getFriends(userId, { page, limit, skip, search });

  return paginatedResponse(res, {
    data: friends,
    page,
    limit,
    total,
    message: 'Friends retrieved successfully'
  });
};

/**
 * @desc    Get incoming friend requests
 * @route   GET /api/v1/friends/requests/incoming
 * @access  Private
 */
const getIncomingRequests = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const userId = req.user._id;

  const { requests, total } = await friendService.getIncomingRequests(userId, { page, limit, skip });

  return paginatedResponse(res, {
    data: requests,
    page,
    limit,
    total,
    message: 'Incoming friend requests retrieved'
  });
};

/**
 * @desc    Get outgoing friend requests
 * @route   GET /api/v1/friends/requests/outgoing
 * @access  Private
 */
const getOutgoingRequests = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const userId = req.user._id;

  const { requests, total } = await friendService.getOutgoingRequests(userId, { page, limit, skip });

  return paginatedResponse(res, {
    data: requests,
    page,
    limit,
    total,
    message: 'Outgoing friend requests retrieved'
  });
};

/**
 * @desc    Get mutual friends with a user
 * @route   GET /api/v1/friends/mutual/:userId
 * @access  Private
 */
const getMutualFriends = async (req, res) => {
  const { userId } = req.params;
  const { limit = 10 } = req.query;
  const currentUserId = req.user._id;

  const { mutualFriends, count } = await friendService.getMutualFriends(
    currentUserId,
    userId,
    parseInt(limit)
  );

  return successResponse(res, {
    data: {
      mutualFriends,
      count
    }
  });
};

/**
 * @desc    Get friend suggestions
 * @route   GET /api/v1/friends/suggestions
 * @access  Private
 */
const getFriendSuggestions = async (req, res) => {
  const { limit = 10 } = req.query;
  const userId = req.user._id;

  const suggestions = await friendService.getFriendSuggestions(userId, parseInt(limit));

  return successResponse(res, {
    data: { suggestions }
  });
};

/**
 * @desc    Block user
 * @route   POST /api/v1/friends/block/:userId
 * @access  Private
 */
const blockUser = async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  const currentUserId = req.user._id;

  await friendService.blockUser(currentUserId, userId, reason);

  return successResponse(res, {
    message: 'User blocked successfully'
  });
};

/**
 * @desc    Unblock user
 * @route   DELETE /api/v1/friends/block/:userId
 * @access  Private
 */
const unblockUser = async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  await friendService.unblockUser(currentUserId, userId);

  return successResponse(res, {
    message: 'User unblocked successfully'
  });
};

/**
 * @desc    Get blocked users list
 * @route   GET /api/v1/friends/blocked
 * @access  Private
 */
const getBlockedUsers = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const userId = req.user._id;

  const { blockedUsers, total } = await friendService.getBlockedUsers(userId, { page, limit, skip });

  return paginatedResponse(res, {
    data: blockedUsers,
    page,
    limit,
    total,
    message: 'Blocked users retrieved'
  });
};

/**
 * @desc    Get friendship status with user
 * @route   GET /api/v1/friends/status/:userId
 * @access  Private
 */
const getFriendshipStatus = async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  const status = await friendService.getFriendshipStatus(currentUserId, userId);

  return successResponse(res, {
    data: { status }
  });
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  getMutualFriends,
  getFriendSuggestions,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getFriendshipStatus
};
