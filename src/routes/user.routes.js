const express = require('express');
const router = express.Router();
const { userController } = require('../controllers');
const { catchAsync, authenticate, isAdmin } = require('../middlewares');
const {
  updateProfileValidation,
  updateUserStatusValidation,
  updateUserRoleValidation,
  mongoIdValidation,
  paginationValidation
} = require('../validators');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/v1/users/leaderboard:
 *   get:
 *     summary: Get leaderboard
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [runs, wickets, matches, wins, sixes, fours, catches]
 *         description: Leaderboard type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Leaderboard data
 */
router.get('/leaderboard', catchAsync(userController.getLeaderboard));

/**
 * @swagger
 * /api/v1/users/search:
 *   get:
 *     summary: Search users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (min 2 characters)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', authenticate, catchAsync(userController.searchUsers));

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
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
 *           default: 10
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, host, player, umpire, viewer]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, blocked, pending_verification]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Admin access required
 */
router.get('/', authenticate, isAdmin, paginationValidation, catchAsync(userController.getAllUsers));

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
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
router.get('/:userId', authenticate, mongoIdValidation('userId'), catchAsync(userController.getUserById));

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Profile updated
 *       403:
 *         description: Can only update own profile
 *       404:
 *         description: User not found
 */
router.put('/:userId', authenticate, updateProfileValidation, catchAsync(userController.updateProfile));

/**
 * @swagger
 * /api/v1/users/{userId}/status:
 *   patch:
 *     summary: Update user status (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, blocked, pending_verification]
 *     responses:
 *       200:
 *         description: Status updated
 *       403:
 *         description: Admin access required
 */
router.patch('/:userId/status', authenticate, isAdmin, updateUserStatusValidation, catchAsync(userController.updateUserStatus));

/**
 * @swagger
 * /api/v1/users/{userId}/role:
 *   patch:
 *     summary: Update user role (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [host, player, umpire, viewer]
 *     responses:
 *       200:
 *         description: Role updated
 *       403:
 *         description: Admin access required
 */
router.patch('/:userId/role', authenticate, isAdmin, updateUserRoleValidation, catchAsync(userController.updateUserRole));

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: User deleted
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 */
router.delete('/:userId', authenticate, isAdmin, mongoIdValidation('userId'), catchAsync(userController.deleteUser));

/**
 * @swagger
 * /api/v1/users/{userId}/statistics:
 *   get:
 *     summary: Get user statistics
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User statistics
 *       404:
 *         description: User not found
 */
router.get('/:userId/statistics', mongoIdValidation('userId'), catchAsync(userController.getUserStatistics));

module.exports = router;
