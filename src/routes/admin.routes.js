const express = require('express');
const router = express.Router();
const { adminController } = require('../controllers');
const { catchAsync, authenticate, isAdmin } = require('../middlewares');
const { mongoIdValidation, paginationValidation } = require('../validators');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints
 */

// All admin routes require authentication and admin role
router.use(authenticate, isAdmin);

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 *       403:
 *         description: Admin access required
 */
router.get('/dashboard', catchAsync(adminController.getDashboardStats));

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users with detailed info
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, blocked, pending_verification]
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isEmailVerified
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', paginationValidation, catchAsync(adminController.getUsers));

/**
 * @swagger
 * /api/v1/admin/users/{userId}:
 *   get:
 *     summary: Get user details with history
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/users/:userId', mongoIdValidation('userId'), catchAsync(adminController.getUserDetails));

/**
 * @swagger
 * /api/v1/admin/users/{userId}/block:
 *   patch:
 *     summary: Toggle user block status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User block status toggled
 *       404:
 *         description: User not found
 */
router.patch('/users/:userId/block', mongoIdValidation('userId'), catchAsync(adminController.toggleUserBlock));

/**
 * @swagger
 * /api/v1/admin/rooms:
 *   get:
 *     summary: Get all rooms
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of rooms
 */
router.get('/rooms', paginationValidation, catchAsync(adminController.getRooms));

/**
 * @swagger
 * /api/v1/admin/rooms/{roomId}:
 *   delete:
 *     summary: Force close a room
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Room closed
 *       404:
 *         description: Room not found
 */
router.delete('/rooms/:roomId', mongoIdValidation('roomId'), catchAsync(adminController.forceCloseRoom));

/**
 * @swagger
 * /api/v1/admin/matches:
 *   get:
 *     summary: Get all matches
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of matches
 */
router.get('/matches', paginationValidation, catchAsync(adminController.getMatches));

/**
 * @swagger
 * /api/v1/admin/matches/{matchId}/end:
 *   post:
 *     summary: Force end a match
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Match ended
 *       404:
 *         description: Match not found
 */
router.post('/matches/:matchId/end', mongoIdValidation('matchId'), catchAsync(adminController.forceEndMatch));

/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs
 */
router.get('/audit-logs', catchAsync(adminController.getAuditLogs));

/**
 * @swagger
 * /api/v1/admin/config:
 *   get:
 *     summary: Get platform configuration
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform config
 */
router.get('/config', catchAsync(adminController.getPlatformConfig));

module.exports = router;
