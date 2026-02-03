const express = require('express');
const router = express.Router();
const { matchController } = require('../controllers');
const { catchAsync, authenticate, optionalAuth } = require('../middlewares');
const { scoringLimiter } = require('../middlewares/rateLimiter');
const {
  conductTossValidation,
  setBatsmenValidation,
  setBowlerValidation,
  recordBallValidation,
  setNewBatsmanValidation,
  mongoIdValidation,
  paginationValidation
} = require('../validators');

/**
 * @swagger
 * tags:
 *   name: Matches
 *   description: Match management and live scoring
 */

/**
 * @swagger
 * /api/v1/matches:
 *   get:
 *     summary: Get all matches
 *     tags: [Matches]
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
 *           enum: [scheduled, toss, in_progress, innings_break, completed, abandoned, cancelled]
 *       - in: query
 *         name: roomId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of matches
 */
router.get('/', paginationValidation, catchAsync(matchController.getAllMatches));

/**
 * @swagger
 * /api/v1/matches/{matchId}:
 *   get:
 *     summary: Get match by ID
 *     tags: [Matches]
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Match details
 *       404:
 *         description: Match not found
 */
router.get('/:matchId', mongoIdValidation('matchId'), catchAsync(matchController.getMatchById));

/**
 * @swagger
 * /api/v1/matches/{matchId}/live:
 *   get:
 *     summary: Get live score (Room participants only)
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Live score data with recent balls
 *       403:
 *         description: Only room participants can view live score
 *       404:
 *         description: Match not found
 */
router.get('/:matchId/live', authenticate, mongoIdValidation('matchId'), catchAsync(matchController.getLiveScore));

/**
 * @swagger
 * /api/v1/matches/{matchId}/scoreboard:
 *   get:
 *     summary: Get full scoreboard (Room participants only)
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Full scoreboard with innings details, fall of wickets, player performances
 *       403:
 *         description: Only room participants can view scoreboard
 *       404:
 *         description: Match not found
 */
router.get('/:matchId/scoreboard', authenticate, mongoIdValidation('matchId'), catchAsync(matchController.getScoreboard));

/**
 * @swagger
 * /api/v1/matches/{matchId}/toss:
 *   post:
 *     summary: Conduct toss (Umpire/Host only)
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
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
 *               - winner
 *               - decision
 *             properties:
 *               winner:
 *                 type: string
 *                 enum: [teamA, teamB]
 *               decision:
 *                 type: string
 *                 enum: [bat, bowl]
 *     responses:
 *       200:
 *         description: Toss completed
 *       400:
 *         description: Toss already done
 *       403:
 *         description: Only umpire can conduct toss
 */
router.post('/:matchId/toss', authenticate, conductTossValidation, catchAsync(matchController.conductToss));

/**
 * @swagger
 * /api/v1/matches/{matchId}/batsmen:
 *   post:
 *     summary: Set opening batsmen (Umpire/Host only)
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               strikerId:
 *                 type: string
 *               strikerGuestId:
 *                 type: string
 *               nonStrikerId:
 *                 type: string
 *               nonStrikerGuestId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Batsmen set
 *       400:
 *         description: Invalid batsmen
 */
router.post('/:matchId/batsmen', authenticate, setBatsmenValidation, catchAsync(matchController.setBatsmen));

/**
 * @swagger
 * /api/v1/matches/{matchId}/bowler:
 *   post:
 *     summary: Set bowler (Umpire/Host only)
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bowlerId:
 *                 type: string
 *               bowlerGuestId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bowler set
 */
router.post('/:matchId/bowler', authenticate, setBowlerValidation, catchAsync(matchController.setBowler));

/**
 * @swagger
 * /api/v1/matches/{matchId}/ball:
 *   post:
 *     summary: Record a ball (Umpire/Host only)
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
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
 *               - outcome
 *             properties:
 *               outcome:
 *                 type: string
 *                 enum: [dot, '1', '2', '3', '4', '6', wide, no_ball, bye, leg_bye, wicket]
 *               runs:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 7
 *               isWicket:
 *                 type: boolean
 *               dismissalType:
 *                 type: string
 *                 enum: [bowled, caught, caught_and_bowled, run_out, stumped, lbw, hit_wicket, retired_hurt, obstructing_field, timed_out, handled_ball]
 *               batsmanOutId:
 *                 type: string
 *               batsmanOutGuestId:
 *                 type: string
 *               fielderId:
 *                 type: string
 *               fielderGuestId:
 *                 type: string
 *               commentary:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ball recorded
 *       400:
 *         description: Invalid input
 */
router.post('/:matchId/ball', authenticate, scoringLimiter, recordBallValidation, catchAsync(matchController.recordBall));

/**
 * @swagger
 * /api/v1/matches/{matchId}/ball:
 *   delete:
 *     summary: Undo last ball (Umpire/Host only)
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ball undone
 *       400:
 *         description: No balls to undo
 */
router.delete('/:matchId/ball', authenticate, mongoIdValidation('matchId'), catchAsync(matchController.undoLastBall));

/**
 * @swagger
 * /api/v1/matches/{matchId}/newBatsman:
 *   post:
 *     summary: Set new batsman after wicket (Umpire/Host only)
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batsmanId:
 *                 type: string
 *               batsmanGuestId:
 *                 type: string
 *     responses:
 *       200:
 *         description: New batsman set
 */
router.post('/:matchId/newBatsman', authenticate, setNewBatsmanValidation, catchAsync(matchController.setNewBatsman));

/**
 * @swagger
 * /api/v1/matches/{matchId}/innings/second:
 *   post:
 *     summary: Start second innings (Umpire/Host only)
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Second innings started
 *       400:
 *         description: Not in innings break
 */
router.post('/:matchId/innings/second', authenticate, mongoIdValidation('matchId'), catchAsync(matchController.startSecondInnings));

/**
 * @swagger
 * /api/v1/matches/{matchId}/end:
 *   post:
 *     summary: End match manually (Host/Admin only)
 *     tags: [Matches]
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
 *       403:
 *         description: Only host/admin can end match
 */
router.post('/:matchId/end', authenticate, mongoIdValidation('matchId'), catchAsync(matchController.endMatch));

module.exports = router;
