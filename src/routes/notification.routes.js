const express = require('express');
const router = express.Router();
const { notificationController } = require('../controllers');
const { catchAsync, authenticate, isAdmin } = require('../middlewares');
const {
  mongoIdValidation,
  paginationValidation,
  sendCustomNotificationValidation,
  sendBroadcastNotificationValidation,
  updatePreferencesValidation,
  getFilteredNotificationsValidation
} = require('../validators');
const {
  customNotificationLimiter,
  broadcastNotificationLimiter
} = require('../middlewares/rateLimiter');

// All notification routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management endpoints
 */

// ========== PREFERENCE ROUTES ==========

/**
 * @swagger
 * /api/v1/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences
 */
router.get('/preferences', catchAsync(notificationController.getPreferences));

/**
 * @swagger
 * /api/v1/notifications/preferences:
 *   patch:
 *     summary: Update notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences updated
 */
router.patch(
  '/preferences',
  updatePreferencesValidation,
  catchAsync(notificationController.updatePreferences)
);

// ========== CUSTOM & BROADCAST ROUTES ==========

/**
 * @swagger
 * /api/v1/notifications/custom:
 *   post:
 *     summary: Send custom notification to friends
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Custom notification sent
 */
router.post(
  '/custom',
  customNotificationLimiter,
  sendCustomNotificationValidation,
  catchAsync(notificationController.sendCustomNotification)
);

/**
 * @swagger
 * /api/v1/notifications/broadcast:
 *   post:
 *     summary: Send broadcast notification (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Broadcast sent
 */
router.post(
  '/broadcast',
  isAdmin,
  broadcastNotificationLimiter,
  sendBroadcastNotificationValidation,
  catchAsync(notificationController.sendBroadcastNotification)
);

// ========== QUERY ROUTES ==========

/**
 * @swagger
 * /api/v1/notifications/filtered:
 *   get:
 *     summary: Get filtered notifications by category and priority
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Filtered notifications
 */
router.get(
  '/filtered',
  paginationValidation,
  getFilteredNotificationsValidation,
  catchAsync(notificationController.getFilteredNotifications)
);

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: Get unread notifications count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 */
router.get('/unread-count', catchAsync(notificationController.getUnreadCount));

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Get notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Only return unread notifications
 *     responses:
 *       200:
 *         description: Notifications list
 *       401:
 *         description: Unauthorized
 */
router.get('/', paginationValidation, catchAsync(notificationController.getNotifications));

// ========== UPDATE ROUTES ==========

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch('/read-all', catchAsync(notificationController.markAllAsRead));

/**
 * @swagger
 * /api/v1/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
router.patch('/:notificationId/read', mongoIdValidation('notificationId'), catchAsync(notificationController.markAsRead));

/**
 * @swagger
 * /api/v1/notifications/{notificationId}/viewed:
 *   patch:
 *     summary: Mark notification as viewed
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as viewed
 */
router.patch('/:notificationId/viewed', mongoIdValidation('notificationId'), catchAsync(notificationController.markAsViewed));

// ========== DELETE ROUTES ==========

/**
 * @swagger
 * /api/v1/notifications/{notificationId}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       204:
 *         description: Notification deleted
 *       404:
 *         description: Notification not found
 */
router.delete('/:notificationId', mongoIdValidation('notificationId'), catchAsync(notificationController.deleteNotification));

/**
 * @swagger
 * /api/v1/notifications:
 *   delete:
 *     summary: Clear all notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: All notifications cleared
 */
router.delete('/', catchAsync(notificationController.clearAllNotifications));

module.exports = router;
