const { User } = require('../models');
const jwtService = require('../services/jwtService');
const { 
  AuthenticationError, 
  AuthorizationError, 
  ERROR_CODES, 
  ERROR_MESSAGES 
} = require('../utils/errors');
const { ROLES, ACCOUNT_STATUS } = require('../config/constants');

/**
 * Authenticate user using JWT
 * Verifies the access token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AuthenticationError(ERROR_MESSAGES[ERROR_CODES.TOKEN_MISSING]);
    }

    // Verify token
    const decoded = jwtService.verifyAccessToken(token);

    // Find user
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AuthenticationError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
    }

    // Check account status
    if (user.status === ACCOUNT_STATUS.BLOCKED) {
      throw new AuthenticationError(ERROR_MESSAGES[ERROR_CODES.ACCOUNT_BLOCKED]);
    }

    if (user.status === ACCOUNT_STATUS.INACTIVE) {
      throw new AuthenticationError(ERROR_MESSAGES[ERROR_CODES.ACCOUNT_INACTIVE]);
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      throw new AuthenticationError('Password recently changed. Please login again.');
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication
 * Attaches user to request if valid token is provided, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromHeader(authHeader);

    if (token) {
      try {
        const decoded = jwtService.verifyAccessToken(token);
        const user = await User.findById(decoded.id);
        
        if (user && user.status === ACCOUNT_STATUS.ACTIVE) {
          req.user = user;
          req.token = token;
        }
      } catch (error) {
        // Token invalid, continue without user
        req.user = null;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorize by role(s)
 * @param  {...string} allowedRoles - Roles allowed to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Please login to access this resource'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AuthorizationError(
        `Role '${req.user.role}' is not authorized to access this resource`
      ));
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const isAdmin = authorize(ROLES.ADMIN);

/**
 * Check if user is host
 */
const isHost = authorize(ROLES.ADMIN, ROLES.HOST);

/**
 * Check if user is player or above
 */
const isPlayer = authorize(ROLES.ADMIN, ROLES.HOST, ROLES.PLAYER);

/**
 * Check if user is umpire
 */
const isUmpire = authorize(ROLES.ADMIN, ROLES.UMPIRE);

/**
 * Verify email is verified
 */
const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return next(new AuthenticationError('Please login to access this resource'));
  }

  if (!req.user.isEmailVerified) {
    return next(new AuthorizationError(ERROR_MESSAGES[ERROR_CODES.EMAIL_NOT_VERIFIED]));
  }

  next();
};

/**
 * Check ownership - user can only access their own resources
 * @param {string} paramName - Request param name containing resource owner ID
 */
const checkOwnership = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Please login to access this resource'));
    }

    const resourceOwnerId = req.params[paramName];

    // Admins can access all resources
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    // Check if user owns the resource
    if (req.user._id.toString() !== resourceOwnerId) {
      return next(new AuthorizationError('You can only access your own resources'));
    }

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  isAdmin,
  isHost,
  isPlayer,
  isUmpire,
  requireVerifiedEmail,
  checkOwnership
};
