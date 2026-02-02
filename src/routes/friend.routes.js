const express = require('express');
const router = express.Router();
const { friendController } = require('../controllers');
const { catchAsync, authenticate } = require('../middlewares');
const { mongoIdValidation, paginationValidation } = require('../validators');
const { body, query } = require('express-validator');

// All friend routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: Friend management endpoints
 */

/**
 * @swagger
 * /api/v1/friends:
 *   get:
 *     summary: Get friends list
 *     tags: [Friends]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search friends by username or name
 *     responses:
 *       200:
 *         description: Friends list
 *       401:
 *         description: Unauthorized
 */
router.get('/', paginationValidation, catchAsync(friendController.getFriends));

/**
 * @swagger
 * /api/v1/friends/suggestions:
 *   get:
 *     summary: Get friend suggestions
 *     description: Returns users you may know based on mutual friends and rooms played together
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Friend suggestions
 */
router.get('/suggestions', catchAsync(friendController.getFriendSuggestions));

/**
 * @swagger
 * /api/v1/friends/requests/incoming:
 *   get:
 *     summary: Get incoming friend requests
 *     tags: [Friends]
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
 *     responses:
 *       200:
 *         description: Incoming friend requests
 */
router.get('/requests/incoming', paginationValidation, catchAsync(friendController.getIncomingRequests));

/**
 * @swagger
 * /api/v1/friends/requests/outgoing:
 *   get:
 *     summary: Get outgoing (sent) friend requests
 *     tags: [Friends]
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
 *     responses:
 *       200:
 *         description: Outgoing friend requests
 */
router.get('/requests/outgoing', paginationValidation, catchAsync(friendController.getOutgoingRequests));

/**
 * @swagger
 * /api/v1/friends/blocked:
 *   get:
 *     summary: Get blocked users list
 *     tags: [Friends]
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
 *     responses:
 *       200:
 *         description: Blocked users list
 */
router.get('/blocked', paginationValidation, catchAsync(friendController.getBlockedUsers));

/**
 * @swagger
 * /api/v1/friends/status/{userId}:
 *   get:
 *     summary: Get friendship status with a user
 *     description: Returns the relationship status (none, friends, request_sent, request_received, blocked, blocked_by)
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Target user ID
 *     responses:
 *       200:
 *         description: Friendship status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [none, friends, request_sent, request_received, blocked, blocked_by]
 */
router.get('/status/:userId', mongoIdValidation('userId'), catchAsync(friendController.getFriendshipStatus));

/**
 * @swagger
 * /api/v1/friends/mutual/{userId}:
 *   get:
 *     summary: Get mutual friends with a user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Target user ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Mutual friends list and count
 */
router.get('/mutual/:userId', mongoIdValidation('userId'), catchAsync(friendController.getMutualFriends));

/**
 * @swagger
 * /api/v1/friends/request/{userId}:
 *   post:
 *     summary: Send friend request
 *     description: Send a friend request to another user. If they already sent you a request, it will be auto-accepted.
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Target user ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 200
 *                 description: Optional message with the request
 *     responses:
 *       201:
 *         description: Friend request sent
 *       400:
 *         description: Cannot send request to yourself
 *       409:
 *         description: Request already sent or already friends
 */
router.post(
  '/request/:userId',
  mongoIdValidation('userId'),
  body('message').optional().trim().isLength({ max: 200 }).withMessage('Message cannot exceed 200 characters'),
  catchAsync(friendController.sendFriendRequest)
);

/**
 * @swagger
 * /api/v1/friends/request/{userId}:
 *   delete:
 *     summary: Cancel sent friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the request recipient
 *     responses:
 *       204:
 *         description: Request cancelled
 *       404:
 *         description: Friend request not found
 */
router.delete('/request/:userId', mongoIdValidation('userId'), catchAsync(friendController.cancelFriendRequest));

/**
 * @swagger
 * /api/v1/friends/accept/{userId}:
 *   post:
 *     summary: Accept friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the request sender
 *     responses:
 *       200:
 *         description: Friend request accepted
 *       404:
 *         description: Friend request not found
 */
router.post('/accept/:userId', mongoIdValidation('userId'), catchAsync(friendController.acceptFriendRequest));

/**
 * @swagger
 * /api/v1/friends/reject/{userId}:
 *   post:
 *     summary: Reject friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the request sender
 *     responses:
 *       200:
 *         description: Friend request rejected
 *       404:
 *         description: Friend request not found
 */
router.post('/reject/:userId', mongoIdValidation('userId'), catchAsync(friendController.rejectFriendRequest));

/**
 * @swagger
 * /api/v1/friends/block/{userId}:
 *   post:
 *     summary: Block user
 *     description: Block a user. This removes any friendship and pending requests.
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to block
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 200
 *                 description: Optional reason for blocking
 *     responses:
 *       200:
 *         description: User blocked
 *       400:
 *         description: Cannot block yourself
 *       409:
 *         description: User already blocked
 */
router.post(
  '/block/:userId',
  mongoIdValidation('userId'),
  body('reason').optional().trim().isLength({ max: 200 }).withMessage('Reason cannot exceed 200 characters'),
  catchAsync(friendController.blockUser)
);

/**
 * @swagger
 * /api/v1/friends/block/{userId}:
 *   delete:
 *     summary: Unblock user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to unblock
 *     responses:
 *       200:
 *         description: User unblocked
 *       404:
 *         description: User is not blocked
 */
router.delete('/block/:userId', mongoIdValidation('userId'), catchAsync(friendController.unblockUser));

/**
 * @swagger
 * /api/v1/friends/{userId}:
 *   delete:
 *     summary: Remove friend
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Friend's user ID to remove
 *     responses:
 *       204:
 *         description: Friend removed
 *       404:
 *         description: User is not in friends list
 */
router.delete('/:userId', mongoIdValidation('userId'), catchAsync(friendController.removeFriend));

module.exports = router;
