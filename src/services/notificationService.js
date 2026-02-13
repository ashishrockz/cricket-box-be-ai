const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');
const { SOCKET_EVENTS, NOTIFICATION_CONFIG } = require('../config/constants');
const { NotFoundError, ValidationError, AuthorizationError } = require('../utils/errors');
const crypto = require('crypto');

let socketService = null;

/**
 * Set socket service reference (avoids circular dependency)
 * @param {Object} service - Socket service instance
 */
const setSocketService = (service) => {
  socketService = service;
};

/**
 * Get socket service
 * @returns {Object} Socket service
 */
const getSocketService = () => {
  if (!socketService) {
    try {
      socketService = require('./socketService');
    } catch (error) {
      console.warn('Socket service not available');
    }
  }
  return socketService;
};

/**
 * Create notification and emit via Socket.IO
 * @param {Object} data - Notification data
 * @returns {Object} Created notification
 */
const createAndEmit = async (data) => {
  const notification = await Notification.createNotification(data);

  // Emit to user's personal socket room
  try {
    const socket = getSocketService();
    if (socket && socket.emitToUser) {
      socket.emitToUser(data.recipient.toString(), SOCKET_EVENTS.NOTIFICATION, notification);
    }
  } catch (error) {
    console.warn('Socket.IO not available for notification emit:', error.message);
  }

  return notification;
};

/**
 * Get notifications for user with pagination
 * @param {string} userId - User ID
 * @param {Object} options - Pagination options
 * @returns {Object} Notifications and total count
 */
const getNotifications = async (userId, { page = 1, limit = 20, skip = 0, unreadOnly = false }) => {
  return Notification.getNotifications(userId, { skip, limit, unreadOnly });
};

/**
 * Get unread notification count
 * @param {string} userId - User ID
 * @returns {number} Unread count
 */
const getUnreadCount = async (userId) => {
  return Notification.getUnreadCount(userId);
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Object} Updated notification
 */
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId
  });

  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  return notification.markAsRead();
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Object} Update result
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  // Emit socket event
  try {
    const socket = getSocketService();
    if (socket && socket.emitToUser) {
      socket.emitToUser(userId.toString(), SOCKET_EVENTS.NOTIFICATIONS_READ, { all: true });
    }
  } catch (error) {
    console.warn('Socket.IO not available for notifications read emit');
  }

  return result;
};

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {boolean} Success
 */
const deleteNotification = async (notificationId, userId) => {
  const result = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId
  });

  if (!result) {
    throw new NotFoundError('Notification not found');
  }

  return true;
};

/**
 * Clear all notifications for a user
 * @param {string} userId - User ID
 * @returns {Object} Delete result
 */
const clearAllNotifications = async (userId) => {
  return Notification.deleteMany({ recipient: userId });
};

/**
 * Create friend request notification
 * @param {string} recipientId - Recipient user ID
 * @param {Object} sender - Sender user object
 * @param {string} message - Optional message
 */
const createFriendRequestNotification = async (recipientId, sender, message = '') => {
  return createAndEmit({
    recipient: recipientId,
    sender: sender._id,
    type: NOTIFICATION_TYPES.FRIEND_REQUEST,
    title: 'New Friend Request',
    message: `${sender.fullName || sender.username} sent you a friend request${message ? `: "${message}"` : ''}`,
    data: { senderId: sender._id, message }
  });
};

/**
 * Create friend accepted notification
 * @param {string} recipientId - Recipient user ID (original requester)
 * @param {Object} accepter - User who accepted the request
 */
const createFriendAcceptedNotification = async (recipientId, accepter) => {
  return createAndEmit({
    recipient: recipientId,
    sender: accepter._id,
    type: NOTIFICATION_TYPES.FRIEND_ACCEPTED,
    title: 'Friend Request Accepted',
    message: `${accepter.fullName || accepter.username} accepted your friend request`,
    data: { userId: accepter._id }
  });
};

/**
 * Create friend rejected notification
 * @param {string} recipientId - Recipient user ID (original requester)
 * @param {Object} rejecter - User who rejected the request
 */
const createFriendRejectedNotification = async (recipientId, rejecter) => {
  return createAndEmit({
    recipient: recipientId,
    sender: rejecter._id,
    type: NOTIFICATION_TYPES.FRIEND_REJECTED,
    title: 'Friend Request Declined',
    message: `${rejecter.fullName || rejecter.username} declined your friend request`,
    data: { userId: rejecter._id }
  });
};

/**
 * Create custom notification from user to friends
 * @param {string} senderId - Sender user ID
 * @param {string[]} recipientIds - Array of recipient user IDs
 * @param {Object} notificationData - Notification content
 * @returns {Object} Result with sent count and notifications
 */
const createCustomNotification = async (senderId, recipientIds, notificationData) => {
  const User = require('../models/User');

  // Validate sender
  const sender = await User.findById(senderId).select('friends role');
  if (!sender) {
    throw new NotFoundError('Sender not found');
  }

  // Validate recipients
  const recipients = await User.find({ _id: { $in: recipientIds } })
    .select('_id notificationPreferences friends blockedBy');

  if (recipients.length === 0) {
    throw new ValidationError('No valid recipients found');
  }

  // Filter recipients based on friend relationship, block status, and preferences
  const isAdmin = sender.role === 'admin';
  const validRecipients = recipients.filter(recipient => {
    // Check if sender is blocked
    if (recipient.blockedBy && recipient.blockedBy.includes(senderId)) {
      return false;
    }

    // Admin can send to anyone, otherwise check friendship
    if (!isAdmin) {
      if (!sender.isFriend(recipient._id)) {
        return false;
      }
    }

    // Check notification preferences
    return recipient.canReceiveNotification('custom');
  });

  if (validRecipients.length === 0) {
    throw new AuthorizationError('No recipients can receive this notification. Ensure you are friends and they have custom notifications enabled.');
  }

  // Validate notification data
  const { title, message, richContent, priority = 'normal', data } = notificationData;

  if (!title || title.trim().length === 0) {
    throw new ValidationError('Title is required');
  }

  if (!message || message.trim().length === 0) {
    throw new ValidationError('Message is required');
  }

  if (title.length > NOTIFICATION_CONFIG.MAX_TITLE_LENGTH) {
    throw new ValidationError(`Title cannot exceed ${NOTIFICATION_CONFIG.MAX_TITLE_LENGTH} characters`);
  }

  if (message.length > NOTIFICATION_CONFIG.MAX_MESSAGE_LENGTH) {
    throw new ValidationError(`Message cannot exceed ${NOTIFICATION_CONFIG.MAX_MESSAGE_LENGTH} characters`);
  }

  // Create notifications for all valid recipients
  const notifications = await Promise.all(
    validRecipients.map(recipient =>
      createAndEmit({
        recipient: recipient._id,
        sender: senderId,
        type: NOTIFICATION_TYPES.CUSTOM,
        title: title.trim(),
        message: message.trim(),
        richContent: richContent || {},
        priority,
        category: 'custom',
        data: data || {}
      })
    )
  );

  return {
    sent: notifications.length,
    notifications,
    skipped: recipientIds.length - notifications.length
  };
};

/**
 * Create admin broadcast notification
 * @param {string} adminId - Admin user ID
 * @param {Object} notificationData - Broadcast content
 * @param {Object} targeting - Targeting options (all, role, userIds)
 * @returns {Object} Broadcast result
 */
const createBroadcastNotification = async (adminId, notificationData, targeting = { all: true }) => {
  const User = require('../models/User');

  // Verify admin
  const admin = await User.findById(adminId).select('role');
  if (!admin || admin.role !== 'admin') {
    throw new AuthorizationError('Only admins can send broadcast notifications');
  }

  // Build recipient query
  let recipientQuery = {};

  if (targeting.all) {
    recipientQuery = { status: 'active' };
  } else if (targeting.role) {
    recipientQuery = { status: 'active', role: targeting.role };
  } else if (targeting.userIds && targeting.userIds.length > 0) {
    recipientQuery = { _id: { $in: targeting.userIds }, status: 'active' };
  } else {
    throw new ValidationError('Invalid targeting options');
  }

  // Fetch recipients
  const recipients = await User.find(recipientQuery).select('_id');

  if (recipients.length === 0) {
    throw new ValidationError('No recipients match the targeting criteria');
  }

  // Generate unique broadcast ID
  const broadcastId = crypto.randomBytes(8).toString('hex');

  // Create notifications (in batches to avoid overwhelming the system)
  const batchSize = 100;
  let sentCount = 0;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    await Promise.all(
      batch.map(recipient =>
        createAndEmit({
          recipient: recipient._id,
          sender: adminId,
          type: NOTIFICATION_TYPES.ADMIN_BROADCAST,
          title: notificationData.title,
          message: notificationData.message,
          richContent: notificationData.richContent || {},
          priority: notificationData.priority || 'high',
          category: 'admin',
          metadata: {
            sentByAdmin: true,
            broadcastId
          },
          data: notificationData.data || {}
        })
      )
    );

    sentCount += batch.length;
  }

  return {
    broadcastId,
    sent: sentCount,
    targeting
  };
};

/**
 * Update notification preferences for user
 * @param {string} userId - User ID
 * @param {Object} preferences - New preferences
 * @returns {Object} Updated preferences
 */
const updateNotificationPreferences = async (userId, preferences) => {
  const User = require('../models/User');
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Initialize notificationPreferences if it doesn't exist
  if (!user.notificationPreferences) {
    user.notificationPreferences = {
      enabled: true,
      categories: {
        friend: true,
        match: true,
        room: true,
        custom: true,
        system: true
      },
      doNotDisturb: {
        enabled: false
      },
      emailNotifications: false,
      pushNotifications: true
    };
  }

  // Update preferences
  if (preferences.enabled !== undefined) {
    user.notificationPreferences.enabled = preferences.enabled;
  }

  if (preferences.categories) {
    Object.keys(preferences.categories).forEach(category => {
      if (user.notificationPreferences.categories && user.notificationPreferences.categories[category] !== undefined) {
        user.notificationPreferences.categories[category] = preferences.categories[category];
      }
    });
  }

  if (preferences.doNotDisturb) {
    if (!user.notificationPreferences.doNotDisturb) {
      user.notificationPreferences.doNotDisturb = { enabled: false };
    }

    if (preferences.doNotDisturb.enabled !== undefined) {
      user.notificationPreferences.doNotDisturb.enabled = preferences.doNotDisturb.enabled;
    }
    if (preferences.doNotDisturb.startTime) {
      // Validate time format HH:mm
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(preferences.doNotDisturb.startTime)) {
        throw new ValidationError('Invalid startTime format. Use HH:mm (24-hour)');
      }
      user.notificationPreferences.doNotDisturb.startTime = preferences.doNotDisturb.startTime;
    }
    if (preferences.doNotDisturb.endTime) {
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(preferences.doNotDisturb.endTime)) {
        throw new ValidationError('Invalid endTime format. Use HH:mm (24-hour)');
      }
      user.notificationPreferences.doNotDisturb.endTime = preferences.doNotDisturb.endTime;
    }
  }

  if (preferences.emailNotifications !== undefined) {
    user.notificationPreferences.emailNotifications = preferences.emailNotifications;
  }

  if (preferences.pushNotifications !== undefined) {
    user.notificationPreferences.pushNotifications = preferences.pushNotifications;
  }

  await user.save();

  // Emit socket event
  try {
    const socket = getSocketService();
    if (socket && socket.emitToUser) {
      socket.emitToUser(
        userId.toString(),
        SOCKET_EVENTS.NOTIFICATION_PREFERENCES_UPDATED,
        user.notificationPreferences
      );
    }
  } catch (error) {
    console.warn('Socket.IO not available for preferences update emit');
  }

  return user.notificationPreferences;
};

/**
 * Get notification preferences for user
 * @param {string} userId - User ID
 * @returns {Object} Notification preferences
 */
const getNotificationPreferences = async (userId) => {
  const User = require('../models/User');
  const user = await User.findById(userId).select('notificationPreferences');

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Return default preferences if not set
  if (!user.notificationPreferences) {
    return {
      enabled: true,
      categories: {
        friend: true,
        match: true,
        room: true,
        custom: true,
        system: true
      },
      doNotDisturb: {
        enabled: false
      },
      emailNotifications: false,
      pushNotifications: true
    };
  }

  return user.notificationPreferences;
};

/**
 * Mark notification as viewed
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Object} Updated notification
 */
const markAsViewed = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId
  });

  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  return notification.markAsViewed();
};

/**
 * Get filtered notifications with category and priority
 * @param {string} userId - User ID
 * @param {Object} options - Filter options
 * @returns {Object} Filtered notifications
 */
const getFilteredNotifications = async (userId, options) => {
  return Notification.getFilteredNotifications(userId, options);
};

module.exports = {
  setSocketService,
  createAndEmit,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  createFriendRequestNotification,
  createFriendAcceptedNotification,
  createFriendRejectedNotification,
  createCustomNotification,
  createBroadcastNotification,
  updateNotificationPreferences,
  getNotificationPreferences,
  markAsViewed,
  getFilteredNotifications,
  NOTIFICATION_TYPES
};
