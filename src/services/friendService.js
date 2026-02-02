const mongoose = require('mongoose');
const User = require('../models/User');
const Room = require('../models/Room');
const notificationService = require('./notificationService');
const {
  NotFoundError,
  ConflictError,
  ValidationError,
  AuthorizationError,
  ERROR_CODES,
  ERROR_MESSAGES
} = require('../utils/errors');
const { ACCOUNT_STATUS, FRIENDSHIP_STATUS } = require('../config/constants');

/**
 * Send friend request
 * @param {string} senderId - Sender user ID
 * @param {string} recipientId - Recipient user ID
 * @param {string} message - Optional message
 */
const sendFriendRequest = async (senderId, recipientId, message = '') => {
  // Validate not self-request
  if (senderId.toString() === recipientId.toString()) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.CANNOT_FRIEND_SELF]);
  }

  const [sender, recipient] = await Promise.all([
    User.findById(senderId),
    User.findById(recipientId)
  ]);

  if (!recipient) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  if (recipient.status !== ACCOUNT_STATUS.ACTIVE) {
    throw new ValidationError('Cannot send friend request to this user');
  }

  // Check if blocked
  if (sender.hasBlockedUser(recipientId)) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.USER_BLOCKED]);
  }

  if (sender.isBlockedBy(recipientId)) {
    throw new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.BLOCKED_BY_USER]);
  }

  // Check if already friends
  if (sender.isFriend(recipientId)) {
    throw new ConflictError(ERROR_MESSAGES[ERROR_CODES.ALREADY_FRIENDS]);
  }

  // Check if request already sent
  if (sender.hasPendingRequestTo(recipientId)) {
    throw new ConflictError(ERROR_MESSAGES[ERROR_CODES.FRIEND_REQUEST_EXISTS]);
  }

  // Check if incoming request exists (auto-accept)
  if (sender.hasPendingRequestFrom(recipientId)) {
    return acceptFriendRequest(senderId, recipientId);
  }

  // Add to outgoing requests
  sender.outgoingFriendRequests.push({
    to: recipientId,
    sentAt: new Date(),
    message
  });

  // Add to recipient's incoming requests
  recipient.incomingFriendRequests.push({
    from: senderId,
    sentAt: new Date(),
    message
  });

  await Promise.all([sender.save(), recipient.save()]);

  // Create notification
  await notificationService.createFriendRequestNotification(recipientId, sender, message);

  return true;
};

/**
 * Accept friend request
 * @param {string} userId - User accepting the request
 * @param {string} requesterId - User who sent the request
 */
const acceptFriendRequest = async (userId, requesterId) => {
  const [user, requester] = await Promise.all([
    User.findById(userId),
    User.findById(requesterId)
  ]);

  if (!requester) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  // Verify request exists
  if (!user.hasPendingRequestFrom(requesterId)) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.FRIEND_REQUEST_NOT_FOUND]);
  }

  // Remove from pending requests
  user.incomingFriendRequests = user.incomingFriendRequests.filter(
    r => r.from.toString() !== requesterId.toString()
  );
  requester.outgoingFriendRequests = requester.outgoingFriendRequests.filter(
    r => r.to.toString() !== userId.toString()
  );

  // Add to friends lists (avoid duplicates)
  if (!user.isFriend(requesterId)) {
    user.friends.push(requesterId);
  }
  if (!requester.isFriend(userId)) {
    requester.friends.push(userId);
  }

  await Promise.all([user.save(), requester.save()]);

  // Notify requester
  await notificationService.createFriendAcceptedNotification(requesterId, user);

  return true;
};

/**
 * Reject friend request
 * @param {string} userId - User rejecting the request
 * @param {string} requesterId - User who sent the request
 */
const rejectFriendRequest = async (userId, requesterId) => {
  const [user, requester] = await Promise.all([
    User.findById(userId),
    User.findById(requesterId)
  ]);

  if (!user.hasPendingRequestFrom(requesterId)) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.FRIEND_REQUEST_NOT_FOUND]);
  }

  // Remove from pending requests
  user.incomingFriendRequests = user.incomingFriendRequests.filter(
    r => r.from.toString() !== requesterId.toString()
  );

  if (requester) {
    requester.outgoingFriendRequests = requester.outgoingFriendRequests.filter(
      r => r.to.toString() !== userId.toString()
    );
    await requester.save();

    // Notify requester
    await notificationService.createFriendRejectedNotification(requesterId, user);
  }

  await user.save();

  return true;
};

/**
 * Cancel sent friend request
 * @param {string} senderId - User who sent the request
 * @param {string} recipientId - User who received the request
 */
const cancelFriendRequest = async (senderId, recipientId) => {
  const [sender, recipient] = await Promise.all([
    User.findById(senderId),
    User.findById(recipientId)
  ]);

  if (!sender.hasPendingRequestTo(recipientId)) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.FRIEND_REQUEST_NOT_FOUND]);
  }

  // Remove from outgoing requests
  sender.outgoingFriendRequests = sender.outgoingFriendRequests.filter(
    r => r.to.toString() !== recipientId.toString()
  );

  // Remove from recipient's incoming requests
  if (recipient) {
    recipient.incomingFriendRequests = recipient.incomingFriendRequests.filter(
      r => r.from.toString() !== senderId.toString()
    );
    await recipient.save();
  }

  await sender.save();
  return true;
};

/**
 * Remove friend
 * @param {string} userId - User removing the friend
 * @param {string} friendId - Friend to remove
 */
const removeFriend = async (userId, friendId) => {
  const [user, friend] = await Promise.all([
    User.findById(userId),
    User.findById(friendId)
  ]);

  if (!user.isFriend(friendId)) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.NOT_FRIENDS]);
  }

  // Remove from both friends lists
  user.friends = user.friends.filter(f => f.toString() !== friendId.toString());

  if (friend) {
    friend.friends = friend.friends.filter(f => f.toString() !== userId.toString());
    await friend.save();
  }

  await user.save();
  return true;
};

/**
 * Get friends list with pagination
 * @param {string} userId - User ID
 * @param {Object} options - Pagination options
 */
const getFriends = async (userId, { page = 1, limit = 20, skip = 0, search = '' }) => {
  const user = await User.findById(userId);

  if (!user || !user.friends || user.friends.length === 0) {
    return { friends: [], total: 0 };
  }

  const query = {
    _id: { $in: user.friends },
    status: ACCOUNT_STATUS.ACTIVE
  };

  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } }
    ];
  }

  const [friends, total] = await Promise.all([
    User.find(query)
      .skip(skip)
      .limit(limit)
      .select('username firstName lastName fullName avatar statistics.matchesPlayed'),
    User.countDocuments(query)
  ]);

  return { friends, total };
};

/**
 * Get incoming friend requests
 * @param {string} userId - User ID
 * @param {Object} options - Pagination options
 */
const getIncomingRequests = async (userId, { page = 1, limit = 20, skip = 0 }) => {
  const user = await User.findById(userId)
    .populate({
      path: 'incomingFriendRequests.from',
      select: 'username firstName lastName fullName avatar'
    });

  if (!user) {
    return { requests: [], total: 0 };
  }

  const allRequests = user.incomingFriendRequests || [];
  const total = allRequests.length;

  // Sort by sentAt descending and paginate
  const sortedRequests = allRequests.sort((a, b) => b.sentAt - a.sentAt);
  const requests = sortedRequests.slice(skip, skip + limit);

  return { requests, total };
};

/**
 * Get outgoing friend requests
 * @param {string} userId - User ID
 * @param {Object} options - Pagination options
 */
const getOutgoingRequests = async (userId, { page = 1, limit = 20, skip = 0 }) => {
  const user = await User.findById(userId)
    .populate({
      path: 'outgoingFriendRequests.to',
      select: 'username firstName lastName fullName avatar'
    });

  if (!user) {
    return { requests: [], total: 0 };
  }

  const allRequests = user.outgoingFriendRequests || [];
  const total = allRequests.length;

  // Sort by sentAt descending and paginate
  const sortedRequests = allRequests.sort((a, b) => b.sentAt - a.sentAt);
  const requests = sortedRequests.slice(skip, skip + limit);

  return { requests, total };
};

/**
 * Get mutual friends between two users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @param {number} limit - Max number of mutual friends to return
 */
const getMutualFriends = async (userId1, userId2, limit = 10) => {
  const [user1, user2] = await Promise.all([
    User.findById(userId1).select('friends'),
    User.findById(userId2).select('friends')
  ]);

  if (!user2) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  const friends1 = user1.friends || [];
  const friends2 = user2.friends || [];

  const mutualIds = friends1.filter(f1 =>
    friends2.some(f2 => f1.toString() === f2.toString())
  );

  const mutualFriends = await User.find({
    _id: { $in: mutualIds.slice(0, limit) },
    status: ACCOUNT_STATUS.ACTIVE
  }).select('username firstName lastName fullName avatar');

  return {
    mutualFriends,
    count: mutualIds.length
  };
};

/**
 * Get friend suggestions
 * @param {string} userId - User ID
 * @param {number} limit - Max suggestions to return
 */
const getFriendSuggestions = async (userId, limit = 10) => {
  const user = await User.findById(userId).select('friends blockedUsers blockedBy outgoingFriendRequests incomingFriendRequests');

  const excludeIds = [
    userId,
    ...(user.friends || []),
    ...(user.blockedUsers || []).map(b => b.user),
    ...(user.blockedBy || []),
    ...(user.outgoingFriendRequests || []).map(r => r.to),
    ...(user.incomingFriendRequests || []).map(r => r.from)
  ].map(id => new mongoose.Types.ObjectId(id));

  const suggestions = [];

  // Find users with mutual friends
  if (user.friends && user.friends.length > 0) {
    const mutualFriendsSuggestions = await User.aggregate([
      {
        $match: {
          _id: { $nin: excludeIds },
          status: ACCOUNT_STATUS.ACTIVE,
          friends: { $in: user.friends }
        }
      },
      {
        $addFields: {
          mutualCount: {
            $size: { $setIntersection: ['$friends', user.friends] }
          }
        }
      },
      { $sort: { mutualCount: -1 } },
      { $limit: limit },
      {
        $project: {
          username: 1,
          firstName: 1,
          lastName: 1,
          avatar: 1,
          mutualCount: 1,
          suggestionType: { $literal: 'mutual_friends' }
        }
      }
    ]);

    suggestions.push(...mutualFriendsSuggestions);
  }

  // Find users from same rooms if not enough suggestions
  if (suggestions.length < limit) {
    const remainingLimit = limit - suggestions.length;
    const existingSuggestionIds = suggestions.map(s => s._id.toString());

    try {
      const roommates = await Room.aggregate([
        { $match: { 'participants.user': new mongoose.Types.ObjectId(userId) } },
        { $unwind: '$participants' },
        {
          $match: {
            'participants.user': {
              $nin: [...excludeIds, ...existingSuggestionIds.map(id => new mongoose.Types.ObjectId(id))]
            }
          }
        },
        { $group: { _id: '$participants.user', roomsCount: { $sum: 1 } } },
        { $sort: { roomsCount: -1 } },
        { $limit: remainingLimit },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        { $match: { 'user.status': ACCOUNT_STATUS.ACTIVE } },
        {
          $project: {
            _id: '$user._id',
            username: '$user.username',
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            avatar: '$user.avatar',
            roomsCount: 1,
            suggestionType: { $literal: 'played_together' }
          }
        }
      ]);

      suggestions.push(...roommates);
    } catch (error) {
      // Room aggregation failed, continue with existing suggestions
      console.warn('Room suggestions failed:', error.message);
    }
  }

  return suggestions;
};

/**
 * Block user
 * @param {string} userId - User blocking
 * @param {string} targetId - User to block
 * @param {string} reason - Optional reason
 */
const blockUser = async (userId, targetId, reason = '') => {
  if (userId.toString() === targetId.toString()) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.CANNOT_BLOCK_SELF]);
  }

  const [user, target] = await Promise.all([
    User.findById(userId),
    User.findById(targetId)
  ]);

  if (!target) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  if (user.hasBlockedUser(targetId)) {
    throw new ConflictError(ERROR_MESSAGES[ERROR_CODES.USER_ALREADY_BLOCKED]);
  }

  // Add to blocked list
  user.blockedUsers.push({
    user: targetId,
    blockedAt: new Date(),
    reason
  });

  // Add to target's blockedBy
  target.blockedBy.push(userId);

  // Remove from friends if they were friends
  user.friends = user.friends.filter(f => f.toString() !== targetId.toString());
  target.friends = target.friends.filter(f => f.toString() !== userId.toString());

  // Remove any pending requests
  user.incomingFriendRequests = user.incomingFriendRequests.filter(
    r => r.from.toString() !== targetId.toString()
  );
  user.outgoingFriendRequests = user.outgoingFriendRequests.filter(
    r => r.to.toString() !== targetId.toString()
  );
  target.incomingFriendRequests = target.incomingFriendRequests.filter(
    r => r.from.toString() !== userId.toString()
  );
  target.outgoingFriendRequests = target.outgoingFriendRequests.filter(
    r => r.to.toString() !== userId.toString()
  );

  await Promise.all([user.save(), target.save()]);
  return true;
};

/**
 * Unblock user
 * @param {string} userId - User unblocking
 * @param {string} targetId - User to unblock
 */
const unblockUser = async (userId, targetId) => {
  const [user, target] = await Promise.all([
    User.findById(userId),
    User.findById(targetId)
  ]);

  if (!user.hasBlockedUser(targetId)) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_BLOCKED]);
  }

  // Remove from blocked list
  user.blockedUsers = user.blockedUsers.filter(
    b => b.user.toString() !== targetId.toString()
  );

  // Remove from target's blockedBy
  if (target) {
    target.blockedBy = target.blockedBy.filter(
      b => b.toString() !== userId.toString()
    );
    await target.save();
  }

  await user.save();
  return true;
};

/**
 * Get blocked users list
 * @param {string} userId - User ID
 * @param {Object} options - Pagination options
 */
const getBlockedUsers = async (userId, { page = 1, limit = 20, skip = 0 }) => {
  const user = await User.findById(userId)
    .populate({
      path: 'blockedUsers.user',
      select: 'username firstName lastName fullName avatar'
    });

  if (!user) {
    return { blockedUsers: [], total: 0 };
  }

  const allBlocked = user.blockedUsers || [];
  const total = allBlocked.length;

  // Sort by blockedAt descending and paginate
  const sortedBlocked = allBlocked.sort((a, b) => b.blockedAt - a.blockedAt);
  const blockedUsers = sortedBlocked.slice(skip, skip + limit);

  return { blockedUsers, total };
};

/**
 * Get friendship status between two users
 * @param {string} userId - Current user ID
 * @param {string} targetId - Target user ID
 */
const getFriendshipStatus = async (userId, targetId) => {
  if (userId.toString() === targetId.toString()) {
    return FRIENDSHIP_STATUS.NONE;
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  if (user.isFriend(targetId)) {
    return FRIENDSHIP_STATUS.FRIENDS;
  }
  if (user.hasBlockedUser(targetId)) {
    return FRIENDSHIP_STATUS.BLOCKED;
  }
  if (user.isBlockedBy(targetId)) {
    return FRIENDSHIP_STATUS.BLOCKED_BY;
  }
  if (user.hasPendingRequestTo(targetId)) {
    return FRIENDSHIP_STATUS.REQUEST_SENT;
  }
  if (user.hasPendingRequestFrom(targetId)) {
    return FRIENDSHIP_STATUS.REQUEST_RECEIVED;
  }

  return FRIENDSHIP_STATUS.NONE;
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
