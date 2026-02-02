const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');
const { SOCKET_EVENTS } = require('../config/constants');
const { NotFoundError } = require('../utils/errors');

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
  NOTIFICATION_TYPES
};
