const express = require('express');
const router = express.Router();
const { roomController, matchController } = require('../controllers');
const { catchAsync, authenticate } = require('../middlewares');
const { roomCreationLimiter } = require('../middlewares/rateLimiter');
const {
  createRoomValidation,
  joinRoomValidation,
  updateRoomSettingsValidation,
  selectRoleValidation,
  addPlayerValidation,
  mongoIdValidation,
  paginationValidation
} = require('../validators');

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Match room management (max 3 participants per room)
 */

/**
 * @swagger
 * /api/v1/rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               settings:
 *                 type: object
 *                 properties:
 *                   overs:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 50
 *                     default: 6
 *                   playersPerTeam:
 *                     type: integer
 *                     minimum: 2
 *                     maximum: 11
 *                     default: 6
 *     responses:
 *       201:
 *         description: Room created successfully with unique code
 *       400:
 *         description: Validation error
 */
router.post('/', authenticate, roomCreationLimiter, createRoomValidation, catchAsync(roomController.createRoom));

/**
 * @swagger
 * /api/v1/rooms:
 *   get:
 *     summary: Get my rooms (rooms I created or joined)
 *     tags: [Rooms]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [waiting, role_selection, team_setup, ready, in_match, completed, closed]
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of my rooms
 */
router.get('/', authenticate, paginationValidation, catchAsync(roomController.getMyRooms));

/**
 * @swagger
 * /api/v1/rooms/join:
 *   post:
 *     summary: Join a room by code
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 description: 6-character room code
 *     responses:
 *       200:
 *         description: Joined room successfully
 *       400:
 *         description: Invalid room code or room full (max 3 participants)
 *       409:
 *         description: Already in room
 */
router.post('/join', authenticate, joinRoomValidation, catchAsync(roomController.joinRoom));

/**
 * @swagger
 * /api/v1/rooms/{roomId}:
 *   get:
 *     summary: Get room by ID
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room details
 *       404:
 *         description: Room not found
 */
router.get('/:roomId', authenticate, mongoIdValidation('roomId'), catchAsync(roomController.getRoomById));

/**
 * @swagger
 * /api/v1/rooms/{roomId}:
 *   put:
 *     summary: Update room settings (Creator only)
 *     tags: [Rooms]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Room updated
 *       403:
 *         description: Creator only
 */
router.put('/:roomId', authenticate, updateRoomSettingsValidation, catchAsync(roomController.updateRoom));

/**
 * @swagger
 * /api/v1/rooms/{roomId}:
 *   delete:
 *     summary: Close room (Creator only)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room closed
 *       403:
 *         description: Creator only
 */
router.delete('/:roomId', authenticate, mongoIdValidation('roomId'), catchAsync(roomController.closeRoom));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/leave:
 *   post:
 *     summary: Leave a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Left room successfully
 *       400:
 *         description: Creator cannot leave
 */
router.post('/:roomId/leave', authenticate, mongoIdValidation('roomId'), catchAsync(roomController.leaveRoom));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/roles:
 *   get:
 *     summary: Get available and assigned roles in room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role information
 */
router.get('/:roomId/roles', authenticate, mongoIdValidation('roomId'), catchAsync(roomController.getAvailableRoles));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/select-role:
 *   post:
 *     summary: Select your role in the room (when 3 participants)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
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
 *                 enum: [umpire, team_a_incharge, team_b_incharge]
 *                 description: Role to select
 *     responses:
 *       200:
 *         description: Role assigned successfully
 *       400:
 *         description: Role already taken or invalid
 */
router.post('/:roomId/select-role', authenticate, selectRoleValidation, catchAsync(roomController.selectRole));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/teams:
 *   put:
 *     summary: Set team names
 *     tags: [Rooms]
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
 *               teamAName:
 *                 type: string
 *               teamBName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Team names updated
 */
router.put('/:roomId/teams', authenticate, mongoIdValidation('roomId'), catchAsync(roomController.setTeamNames));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/teams/{team}/players:
 *   post:
 *     summary: Add player to team (In-charge adds player names)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: team
 *         required: true
 *         schema:
 *           type: string
 *           enum: [teamA, teamB]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - playerName
 *             properties:
 *               playerName:
 *                 type: string
 *                 description: Name of the player to add
 *               isCaptain:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Player added to team
 *       403:
 *         description: Only respective In-charge can add players
 */
router.post('/:roomId/teams/:team/players', authenticate, addPlayerValidation, catchAsync(roomController.addPlayerToTeam));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/teams/{team}/players/{playerId}:
 *   delete:
 *     summary: Remove player from team
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: team
 *         required: true
 *         schema:
 *           type: string
 *           enum: [teamA, teamB]
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Player removed from team
 */
router.delete('/:roomId/teams/:team/players/:playerId', authenticate, catchAsync(roomController.removePlayerFromTeam));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/select-batsman:
 *   post:
 *     summary: Select next batsman (Team In-charge selects who comes next)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
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
 *               - playerId
 *               - team
 *             properties:
 *               playerId:
 *                 type: string
 *               team:
 *                 type: string
 *                 enum: [teamA, teamB]
 *     responses:
 *       200:
 *         description: Next batsman selected
 */
router.post('/:roomId/select-batsman', authenticate, catchAsync(roomController.selectNextBatsman));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/ready:
 *   post:
 *     summary: Mark room ready for match (Creator only)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room ready
 *       400:
 *         description: Teams not ready or roles not assigned
 */
router.post('/:roomId/ready', authenticate, mongoIdValidation('roomId'), catchAsync(roomController.markRoomReady));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/participants/{participantId}:
 *   delete:
 *     summary: Kick participant (Creator only)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Participant kicked
 */
router.delete('/:roomId/participants/:participantId', authenticate, catchAsync(roomController.kickParticipant));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/match/start:
 *   post:
 *     summary: Start a match (Creator only)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Match started
 *       400:
 *         description: Room not ready
 */
router.post('/:roomId/match/start', authenticate, mongoIdValidation('roomId'), catchAsync(matchController.startMatch));

module.exports = router;
