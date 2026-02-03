/**
 * Custom Application Error Class
 * Extends the built-in Error class with additional properties for API error handling
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = null, errors = null) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errorCode = errorCode;
    this.errors = errors;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error - 400
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = null) {
    super(message, 400, 'VALIDATION_ERROR', errors);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication Error - 401
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error - 403
 */
class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Not Found Error - 404
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error - 409
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

/**
 * Too Many Requests Error - 429
 */
class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429, 'TOO_MANY_REQUESTS');
    this.name = 'TooManyRequestsError';
  }
}

/**
 * Internal Server Error - 500
 */
class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
    this.name = 'InternalServerError';
  }
}

/**
 * Service Unavailable Error - 503
 */
class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

// Error Code Constants
const ERROR_CODES = {
  // Authentication Errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_MISSING: 'TOKEN_MISSING',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_BLOCKED: 'ACCOUNT_BLOCKED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  
  // OTP Errors
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  
  // User Errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS: 'USERNAME_ALREADY_EXISTS',
  
  // Room Errors
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  ROOM_CLOSED: 'ROOM_CLOSED',
  INVALID_ROOM_CODE: 'INVALID_ROOM_CODE',
  USER_ALREADY_IN_ROOM: 'USER_ALREADY_IN_ROOM',
  USER_NOT_IN_ROOM: 'USER_NOT_IN_ROOM',
  NOT_ROOM_CREATOR: 'NOT_ROOM_CREATOR',
  ROLE_ALREADY_TAKEN: 'ROLE_ALREADY_TAKEN',
  INVALID_ROLE: 'INVALID_ROLE',
  ROLES_NOT_ASSIGNED: 'ROLES_NOT_ASSIGNED',
  NOT_TEAM_INCHARGE: 'NOT_TEAM_INCHARGE',
  
  // Match Errors
  MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',
  MATCH_ALREADY_STARTED: 'MATCH_ALREADY_STARTED',
  MATCH_NOT_STARTED: 'MATCH_NOT_STARTED',
  MATCH_COMPLETED: 'MATCH_COMPLETED',
  TOSS_ALREADY_DONE: 'TOSS_ALREADY_DONE',
  TOSS_NOT_DONE: 'TOSS_NOT_DONE',
  INNINGS_NOT_STARTED: 'INNINGS_NOT_STARTED',
  INNINGS_COMPLETED: 'INNINGS_COMPLETED',
  
  // Team Errors
  TEAM_FULL: 'TEAM_FULL',
  PLAYER_NOT_IN_TEAM: 'PLAYER_NOT_IN_TEAM',
  PLAYER_ALREADY_IN_TEAM: 'PLAYER_ALREADY_IN_TEAM',
  TEAMS_NOT_READY: 'TEAMS_NOT_READY',
  
  // Permission Errors
  NOT_UMPIRE: 'NOT_UMPIRE',
  NOT_CREATOR: 'NOT_CREATOR',
  NOT_ADMIN: 'NOT_ADMIN',
  
  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // General Errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Friend Errors
  ALREADY_FRIENDS: 'ALREADY_FRIENDS',
  FRIEND_REQUEST_EXISTS: 'FRIEND_REQUEST_EXISTS',
  FRIEND_REQUEST_NOT_FOUND: 'FRIEND_REQUEST_NOT_FOUND',
  CANNOT_FRIEND_SELF: 'CANNOT_FRIEND_SELF',
  USER_BLOCKED: 'USER_BLOCKED',
  USER_ALREADY_BLOCKED: 'USER_ALREADY_BLOCKED',
  USER_NOT_BLOCKED: 'USER_NOT_BLOCKED',
  CANNOT_BLOCK_SELF: 'CANNOT_BLOCK_SELF',
  NOT_FRIENDS: 'NOT_FRIENDS',
  BLOCKED_BY_USER: 'BLOCKED_BY_USER',

  // Notification Errors
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND'
};

// Error Messages
const ERROR_MESSAGES = {
  // Authentication
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please login again',
  [ERROR_CODES.TOKEN_INVALID]: 'Invalid authentication token',
  [ERROR_CODES.TOKEN_MISSING]: 'Authentication token is required',
  [ERROR_CODES.ACCOUNT_LOCKED]: 'Account is temporarily locked due to too many failed login attempts',
  [ERROR_CODES.ACCOUNT_BLOCKED]: 'Your account has been blocked. Please contact support',
  [ERROR_CODES.ACCOUNT_INACTIVE]: 'Your account is inactive. Please contact support',
  [ERROR_CODES.EMAIL_NOT_VERIFIED]: 'Please verify your email address before logging in',
  
  // OTP
  [ERROR_CODES.OTP_EXPIRED]: 'OTP has expired. Please request a new one',
  [ERROR_CODES.OTP_INVALID]: 'Invalid OTP. Please try again',
  [ERROR_CODES.OTP_MAX_ATTEMPTS]: 'Maximum OTP attempts exceeded. Please request a new OTP',
  
  // User
  [ERROR_CODES.USER_NOT_FOUND]: 'User not found',
  [ERROR_CODES.USER_ALREADY_EXISTS]: 'User already exists',
  [ERROR_CODES.EMAIL_ALREADY_EXISTS]: 'Email is already registered',
  [ERROR_CODES.USERNAME_ALREADY_EXISTS]: 'Username is already taken',
  
  // Room
  [ERROR_CODES.ROOM_NOT_FOUND]: 'Room not found',
  [ERROR_CODES.ROOM_FULL]: 'Room is full (maximum 3 participants)',
  [ERROR_CODES.ROOM_CLOSED]: 'Room is closed',
  [ERROR_CODES.INVALID_ROOM_CODE]: 'Invalid room code',
  [ERROR_CODES.USER_ALREADY_IN_ROOM]: 'You are already in this room',
  [ERROR_CODES.USER_NOT_IN_ROOM]: 'You are not a participant of this room',
  [ERROR_CODES.NOT_ROOM_CREATOR]: 'Only the room creator can perform this action',
  [ERROR_CODES.ROLE_ALREADY_TAKEN]: 'This role is already taken by another participant',
  [ERROR_CODES.INVALID_ROLE]: 'Invalid role. Choose from: umpire, team_a_incharge, team_b_incharge',
  [ERROR_CODES.ROLES_NOT_ASSIGNED]: 'All roles must be assigned before proceeding',
  [ERROR_CODES.NOT_TEAM_INCHARGE]: 'Only the team in-charge can perform this action',
  
  // Match
  [ERROR_CODES.MATCH_NOT_FOUND]: 'Match not found',
  [ERROR_CODES.MATCH_ALREADY_STARTED]: 'Match has already started',
  [ERROR_CODES.MATCH_NOT_STARTED]: 'Match has not started yet',
  [ERROR_CODES.MATCH_COMPLETED]: 'Match has already been completed',
  [ERROR_CODES.TOSS_ALREADY_DONE]: 'Toss has already been conducted',
  [ERROR_CODES.TOSS_NOT_DONE]: 'Please conduct the toss first',
  [ERROR_CODES.INNINGS_NOT_STARTED]: 'Innings has not started yet',
  [ERROR_CODES.INNINGS_COMPLETED]: 'Innings has been completed',
  
  // Team
  [ERROR_CODES.TEAM_FULL]: 'Team is full',
  [ERROR_CODES.PLAYER_NOT_IN_TEAM]: 'Player is not in the team',
  [ERROR_CODES.PLAYER_ALREADY_IN_TEAM]: 'Player is already in a team',
  [ERROR_CODES.TEAMS_NOT_READY]: 'Teams are not ready. Please ensure both teams have enough players',
  
  // Permission
  [ERROR_CODES.NOT_UMPIRE]: 'Only the umpire can perform this action',
  [ERROR_CODES.NOT_CREATOR]: 'Only the room creator can perform this action',
  [ERROR_CODES.NOT_ADMIN]: 'Admin privileges required',
  
  // General
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred. Please try again later',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please slow down',

  // Friend
  [ERROR_CODES.ALREADY_FRIENDS]: 'You are already friends with this user',
  [ERROR_CODES.FRIEND_REQUEST_EXISTS]: 'Friend request already sent',
  [ERROR_CODES.FRIEND_REQUEST_NOT_FOUND]: 'Friend request not found',
  [ERROR_CODES.CANNOT_FRIEND_SELF]: 'Cannot send friend request to yourself',
  [ERROR_CODES.USER_BLOCKED]: 'Cannot perform this action on a blocked user',
  [ERROR_CODES.USER_ALREADY_BLOCKED]: 'User is already blocked',
  [ERROR_CODES.USER_NOT_BLOCKED]: 'User is not blocked',
  [ERROR_CODES.CANNOT_BLOCK_SELF]: 'Cannot block yourself',
  [ERROR_CODES.NOT_FRIENDS]: 'User is not in your friends list',
  [ERROR_CODES.BLOCKED_BY_USER]: 'You have been blocked by this user',

  // Notification
  [ERROR_CODES.NOTIFICATION_NOT_FOUND]: 'Notification not found'
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  ERROR_CODES,
  ERROR_MESSAGES
};
