const notificationService = require('../services/notificationService');
const {
  successResponse,
  paginatedResponse,
  noContentResponse
} = require('../utils/response');
const { parsePagination } = require('../utils/helpers');

/**
 * @desc    Get notifications
 * @route   GET /api/v1/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { unreadOnly } = req.query;
  const userId = req.user._id;

  const { notifications, total } = await notificationService.getNotifications(
    userId,
    { page, limit, skip, unreadOnly: unreadOnly === 'true' }
  );

  return paginatedResponse(res, {
    data: notifications,
    page,
    limit,
    total,
    message: 'Notifications retrieved successfully'
  });
};

/**
 * @desc    Get unread notifications count
 * @route   GET /api/v1/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);

  return successResponse(res, {
    data: { unreadCount: count }
  });
};

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/v1/notifications/:notificationId/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  const { notificationId } = req.params;

  await notificationService.markAsRead(notificationId, req.user._id);

  return successResponse(res, {
    message: 'Notification marked as read'
  });
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/v1/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  await notificationService.markAllAsRead(req.user._id);

  return successResponse(res, {
    message: 'All notifications marked as read'
  });
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/v1/notifications/:notificationId
 * @access  Private
 */
const deleteNotification = async (req, res) => {
  const { notificationId } = req.params;

  await notificationService.deleteNotification(notificationId, req.user._id);

  return noContentResponse(res);
};

/**
 * @desc    Clear all notifications
 * @route   DELETE /api/v1/notifications
 * @access  Private
 */
const clearAllNotifications = async (req, res) => {
  await notificationService.clearAllNotifications(req.user._id);

  return noContentResponse(res);
};

/**
 * @desc    Send custom notification to friends
 * @route   POST /api/v1/notifications/custom
 * @access  Private
 */
const sendCustomNotification = async (req, res) => {
  const senderId = req.user._id;
  const { recipientIds, title, message, richContent, priority, data } = req.body;

  const result = await notificationService.createCustomNotification(
    senderId,
    recipientIds,
    { title, message, richContent, priority, data }
  );

  return successResponse(res, {
    data: result,
    message: `Custom notification sent to ${result.sent} recipient(s)`
  }, 201);
};

/**
 * @desc    Send admin broadcast notification
 * @route   POST /api/v1/notifications/broadcast
 * @access  Admin
 */
const sendBroadcastNotification = async (req, res) => {
  const adminId = req.user._id;
  const { title, message, richContent, priority, data, targeting } = req.body;

  const result = await notificationService.createBroadcastNotification(
    adminId,
    { title, message, richContent, priority, data },
    targeting
  );

  return successResponse(res, {
    data: result,
    message: `Broadcast notification sent to ${result.sent} user(s)`
  }, 201);
};

/**
 * @desc    Get notification preferences
 * @route   GET /api/v1/notifications/preferences
 * @access  Private
 */
const getPreferences = async (req, res) => {
  const preferences = await notificationService.getNotificationPreferences(req.user._id);

  return successResponse(res, {
    data: preferences,
    message: 'Notification preferences retrieved successfully'
  });
};

/**
 * @desc    Update notification preferences
 * @route   PATCH /api/v1/notifications/preferences
 * @access  Private
 */
const updatePreferences = async (req, res) => {
  const preferences = await notificationService.updateNotificationPreferences(
    req.user._id,
    req.body
  );

  return successResponse(res, {
    data: preferences,
    message: 'Notification preferences updated successfully'
  });
};

/**
 * @desc    Mark notification as viewed
 * @route   PATCH /api/v1/notifications/:notificationId/viewed
 * @access  Private
 */
const markAsViewed = async (req, res) => {
  const { notificationId } = req.params;

  await notificationService.markAsViewed(notificationId, req.user._id);

  return successResponse(res, {
    message: 'Notification marked as viewed'
  });
};

/**
 * @desc    Get filtered notifications
 * @route   GET /api/v1/notifications/filtered
 * @access  Private
 */
const getFilteredNotifications = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { unreadOnly, categories, priorities } = req.query;
  const userId = req.user._id;

  // Parse arrays from query params
  const categoryArray = categories ? categories.split(',') : [];
  const priorityArray = priorities ? priorities.split(',') : [];

  const { notifications, total } = await notificationService.getFilteredNotifications(
    userId,
    {
      page,
      limit,
      skip,
      unreadOnly: unreadOnly === 'true',
      categories: categoryArray,
      priorities: priorityArray
    }
  );

  return paginatedResponse(res, {
    data: notifications,
    page,
    limit,
    total,
    message: 'Filtered notifications retrieved successfully'
  });
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  sendCustomNotification,
  sendBroadcastNotification,
  getPreferences,
  updatePreferences,
  markAsViewed,
  getFilteredNotifications
};
