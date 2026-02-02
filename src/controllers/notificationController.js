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

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
};
