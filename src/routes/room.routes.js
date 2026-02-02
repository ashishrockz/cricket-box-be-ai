const express = require('express');
const router = express.Router();
const { roomController, matchController } = require('../controllers');
const { catchAsync, authenticate } = require('../middlewares');
const { roomCreationLimiter } = require('../middlewares/rateLimiter');
const {
  createRoomValidation,
  joinRoomValidation,
  updateRoomSettingsValidation,
  assignTeamValidation,
  assignUmpireValidation,
  addGuestValidation,
  mongoIdValidation,
  paginationValidation
} = require('../validators');

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Match room management
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
 *                   maxParticipants:
 *                     type: integer
 *                     minimum: 2
 *                     maximum: 30
 *                     default: 20
 *                   isPrivate:
 *                     type: boolean
 *                     default: false
 *                   password:
 *                     type: string
 *                   allowGuests:
 *                     type: boolean
 *                     default: true
 *     responses:
 *       201:
 *         description: Room created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', authenticate, roomCreationLimiter, createRoomValidation, catchAsync(roomController.createRoom));

/**
 * @swagger
 * /api/v1/rooms:
 *   get:
 *     summary: Get all rooms
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
 *           enum: [waiting, team_setup, ready, in_match, completed, closed]
 *       - in: query
 *         name: myRooms
 *         schema:
 *           type: boolean
 *         description: Get rooms user is part of
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of rooms
 */
router.get('/', authenticate, paginationValidation, catchAsync(roomController.getAllRooms));

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
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Joined room successfully
 *       400:
 *         description: Invalid room code
 *       401:
 *         description: Invalid password for private room
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
 *     summary: Update room (Host only)
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
 *         description: Host only
 */
router.put('/:roomId', authenticate, updateRoomSettingsValidation, catchAsync(roomController.updateRoom));

/**
 * @swagger
 * /api/v1/rooms/{roomId}:
 *   delete:
 *     summary: Close room (Host only)
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
 *         description: Host only
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
 *         description: Host cannot leave
 */
router.post('/:roomId/leave', authenticate, mongoIdValidation('roomId'), catchAsync(roomController.leaveRoom));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/guests:
 *   post:
 *     summary: Add guest participant (Host only)
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Guest added
 *       403:
 *         description: Host only
 */
router.post('/:roomId/guests', authenticate, addGuestValidation, catchAsync(roomController.addGuest));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/guests/{guestId}:
 *   delete:
 *     summary: Remove guest (Host only)
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
 *         name: guestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Guest removed
 */
router.delete('/:roomId/guests/:guestId', authenticate, catchAsync(roomController.removeGuest));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/teams:
 *   put:
 *     summary: Set team names (Host only)
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
router.put('/:roomId/teams', authenticate, catchAsync(roomController.setTeamNames));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/teams/assign:
 *   post:
 *     summary: Assign player to team (Host only)
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
 *               - team
 *             properties:
 *               team:
 *                 type: string
 *                 enum: [teamA, teamB]
 *               userId:
 *                 type: string
 *               guestId:
 *                 type: string
 *               isCaptain:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Player assigned
 */
router.post('/:roomId/teams/assign', authenticate, assignTeamValidation, catchAsync(roomController.assignToTeam));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/teams/{team}/player:
 *   delete:
 *     summary: Remove player from team (Host only)
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               guestId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Player removed from team
 */
router.delete('/:roomId/teams/:team/player', authenticate, catchAsync(roomController.removeFromTeam));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/umpire:
 *   post:
 *     summary: Assign umpire (Host only)
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
 *               userId:
 *                 type: string
 *               guestName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Umpire assigned
 */
router.post('/:roomId/umpire', authenticate, assignUmpireValidation, catchAsync(roomController.assignUmpire));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/ready:
 *   post:
 *     summary: Mark room ready for match (Host only)
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
 *         description: Teams not ready
 */
router.post('/:roomId/ready', authenticate, mongoIdValidation('roomId'), catchAsync(roomController.markRoomReady));

/**
 * @swagger
 * /api/v1/rooms/{roomId}/participants/{participantId}:
 *   delete:
 *     summary: Kick participant (Host only)
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
 *     summary: Start a match (Host only)
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
