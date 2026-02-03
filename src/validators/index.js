const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const { VALIDATION, ROLES, ACCOUNT_STATUS, MATCH_STATUS, ROOM_STATUS, ROOM_ROLES, TOSS_DECISIONS, BALL_OUTCOMES, DISMISSAL_TYPES } = require('../config/constants');

/**
 * Validate request and throw error if validation fails
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));
    
    throw new ValidationError('Validation failed', formattedErrors);
  }
  
  next();
};

// ==================== AUTH VALIDATIONS ====================

const registerValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: VALIDATION.USERNAME_MIN, max: VALIDATION.USERNAME_MAX })
    .withMessage(`Username must be between ${VALIDATION.USERNAME_MIN} and ${VALIDATION.USERNAME_MAX} characters`)
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),  
    body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: VALIDATION.PASSWORD_MIN })
    .withMessage(`Password must be at least ${VALIDATION.PASSWORD_MIN} characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#^?&])[A-Za-z\d@$!%*#^?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: VALIDATION.NAME_MIN, max: VALIDATION.NAME_MAX })
    .withMessage(`First name must be between ${VALIDATION.NAME_MIN} and ${VALIDATION.NAME_MAX} characters`),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: VALIDATION.NAME_MAX })
    .withMessage(`Last name cannot exceed ${VALIDATION.NAME_MAX} characters`),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
    .withMessage('Please provide a valid phone number'),
  
  validate
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  validate
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  validate
];

const resetPasswordValidation = [
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: VALIDATION.PASSWORD_MIN })
    .withMessage(`Password must be at least ${VALIDATION.PASSWORD_MIN} characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  validate
];

const verifyOTPValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),
  
  validate
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: VALIDATION.PASSWORD_MIN })
    .withMessage(`Password must be at least ${VALIDATION.PASSWORD_MIN} characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  validate
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required'),
  
  validate
];

// ==================== USER VALIDATIONS ====================

const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: VALIDATION.NAME_MIN, max: VALIDATION.NAME_MAX })
    .withMessage(`First name must be between ${VALIDATION.NAME_MIN} and ${VALIDATION.NAME_MAX} characters`),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: VALIDATION.NAME_MAX })
    .withMessage(`Last name cannot exceed ${VALIDATION.NAME_MAX} characters`),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
    .withMessage('Please provide a valid phone number'),
  
  body('avatar')
    .optional()
    .trim()
    .isURL().withMessage('Avatar must be a valid URL'),
  
  validate
];

const updateUserStatusValidation = [
  param('userId')
    .isMongoId().withMessage('Invalid user ID'),
  
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(Object.values(ACCOUNT_STATUS))
    .withMessage(`Status must be one of: ${Object.values(ACCOUNT_STATUS).join(', ')}`),
  
  validate
];

const updateUserRoleValidation = [
  param('userId')
    .isMongoId().withMessage('Invalid user ID'),
  
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(Object.values(ROLES))
    .withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),
  
  validate
];

// ==================== ROOM VALIDATIONS ====================

const createRoomValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Room name is required')
    .isLength({ min: VALIDATION.ROOM_NAME_MIN, max: VALIDATION.ROOM_NAME_MAX })
    .withMessage(`Room name must be between ${VALIDATION.ROOM_NAME_MIN} and ${VALIDATION.ROOM_NAME_MAX} characters`),

  body('description')
    .optional()
    .trim()
    .isLength({ max: VALIDATION.DESCRIPTION_MAX })
    .withMessage(`Description cannot exceed ${VALIDATION.DESCRIPTION_MAX} characters`),

  body('settings.overs')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Overs must be between 1 and 50'),

  body('settings.playersPerTeam')
    .optional()
    .isInt({ min: 2, max: 11 })
    .withMessage('Players per team must be between 2 and 11'),

  validate
];

const joinRoomValidation = [
  body('code')
    .trim()
    .notEmpty().withMessage('Room code is required')
    .isLength({ min: 6, max: 6 }).withMessage('Room code must be 6 characters')
    .isAlphanumeric().withMessage('Room code must be alphanumeric')
    .toUpperCase(),

  validate
];

const updateRoomSettingsValidation = [
  param('roomId')
    .isMongoId().withMessage('Invalid room ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: VALIDATION.ROOM_NAME_MIN, max: VALIDATION.ROOM_NAME_MAX })
    .withMessage(`Room name must be between ${VALIDATION.ROOM_NAME_MIN} and ${VALIDATION.ROOM_NAME_MAX} characters`),
  
  body('settings.overs')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Overs must be between 1 and 50'),
  
  body('settings.playersPerTeam')
    .optional()
    .isInt({ min: 2, max: 11 })
    .withMessage('Players per team must be between 2 and 11'),
  
  validate
];

const selectRoleValidation = [
  param('roomId')
    .isMongoId().withMessage('Invalid room ID'),

  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(Object.values(ROOM_ROLES))
    .withMessage(`Role must be one of: ${Object.values(ROOM_ROLES).join(', ')}`),

  validate
];

const addPlayerValidation = [
  param('roomId')
    .isMongoId().withMessage('Invalid room ID'),

  param('team')
    .notEmpty().withMessage('Team is required')
    .isIn(['teamA', 'teamB'])
    .withMessage('Team must be either teamA or teamB'),

  body('playerName')
    .trim()
    .notEmpty().withMessage('Player name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Player name must be between 2 and 50 characters'),

  body('isCaptain')
    .optional()
    .isBoolean()
    .withMessage('isCaptain must be a boolean'),

  validate
];

// ==================== MATCH VALIDATIONS ====================

const conductTossValidation = [
  param('matchId')
    .isMongoId().withMessage('Invalid match ID'),
  
  body('winner')
    .notEmpty().withMessage('Toss winner is required')
    .isIn(['teamA', 'teamB'])
    .withMessage('Winner must be either teamA or teamB'),
  
  body('decision')
    .notEmpty().withMessage('Toss decision is required')
    .isIn(Object.values(TOSS_DECISIONS))
    .withMessage(`Decision must be one of: ${Object.values(TOSS_DECISIONS).join(', ')}`),
  
  validate
];

const setBatsmenValidation = [
  param('matchId')
    .isMongoId().withMessage('Invalid match ID'),
  
  body('strikerId')
    .optional()
    .isMongoId().withMessage('Invalid striker ID'),
  
  body('strikerGuestId')
    .optional()
    .trim(),
  
  body('nonStrikerId')
    .optional()
    .isMongoId().withMessage('Invalid non-striker ID'),
  
  body('nonStrikerGuestId')
    .optional()
    .trim(),
  
  validate
];

const setBowlerValidation = [
  param('matchId')
    .isMongoId().withMessage('Invalid match ID'),
  
  body('bowlerId')
    .optional()
    .isMongoId().withMessage('Invalid bowler ID'),
  
  body('bowlerGuestId')
    .optional()
    .trim(),
  
  validate
];

const recordBallValidation = [
  param('matchId')
    .isMongoId().withMessage('Invalid match ID'),
  
  body('outcome')
    .notEmpty().withMessage('Ball outcome is required')
    .isIn(Object.values(BALL_OUTCOMES))
    .withMessage(`Outcome must be one of: ${Object.values(BALL_OUTCOMES).join(', ')}`),
  
  body('runs')
    .optional()
    .isInt({ min: 0, max: 7 })
    .withMessage('Runs must be between 0 and 7'),
  
  body('isWicket')
    .optional()
    .isBoolean()
    .withMessage('isWicket must be a boolean'),
  
  body('dismissalType')
    .optional()
    .isIn(Object.values(DISMISSAL_TYPES))
    .withMessage(`Dismissal type must be one of: ${Object.values(DISMISSAL_TYPES).join(', ')}`),
  
  body('batsmanOutId')
    .optional()
    .isMongoId().withMessage('Invalid batsman out ID'),
  
  body('fielderId')
    .optional()
    .isMongoId().withMessage('Invalid fielder ID'),
  
  body('commentary')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Commentary cannot exceed 200 characters'),
  
  validate
];

const setNewBatsmanValidation = [
  param('matchId')
    .isMongoId().withMessage('Invalid match ID'),
  
  body('batsmanId')
    .optional()
    .isMongoId().withMessage('Invalid batsman ID'),
  
  body('batsmanGuestId')
    .optional()
    .trim(),
  
  validate
];

// ==================== FRIEND VALIDATIONS ====================

const sendFriendRequestValidation = [
  param('userId')
    .isMongoId().withMessage('Invalid user ID'),

  body('message')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Message cannot exceed 200 characters'),

  validate
];

const blockUserValidation = [
  param('userId')
    .isMongoId().withMessage('Invalid user ID'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters'),

  validate
];

const forceRemoveFriendshipValidation = [
  body('userId1')
    .notEmpty().withMessage('userId1 is required')
    .isMongoId().withMessage('Invalid userId1'),

  body('userId2')
    .notEmpty().withMessage('userId2 is required')
    .isMongoId().withMessage('Invalid userId2'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters'),

  validate
];

// ==================== COMMON VALIDATIONS ====================

const mongoIdValidation = (paramName = 'id') => [
  param(paramName)
    .isMongoId().withMessage(`Invalid ${paramName}`),

  validate
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sort')
    .optional()
    .trim(),
  
  validate
];

module.exports = {
  validate,
  // Auth
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyOTPValidation,
  changePasswordValidation,
  refreshTokenValidation,
  // User
  updateProfileValidation,
  updateUserStatusValidation,
  updateUserRoleValidation,
  // Room
  createRoomValidation,
  joinRoomValidation,
  updateRoomSettingsValidation,
  selectRoleValidation,
  addPlayerValidation,
  // Match
  conductTossValidation,
  setBatsmenValidation,
  setBowlerValidation,
  recordBallValidation,
  setNewBatsmanValidation,
  // Friend
  sendFriendRequestValidation,
  blockUserValidation,
  forceRemoveFriendshipValidation,
  // Common
  mongoIdValidation,
  paginationValidation
};
