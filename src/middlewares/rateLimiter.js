const rateLimit = require('express-rate-limit');
const { TooManyRequestsError } = require('../utils/errors');

/**
 * Create rate limiter with custom options
 * @param {Object} options - Rate limit options
 * @returns {Function} - Rate limit middleware
 */
const createRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
      throw new TooManyRequestsError(options.message);
    }
  };

  return rateLimit({ ...defaults, ...options });
};

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
const apiLimiter = createRateLimiter();

/**
 * Auth routes rate limiter (stricter)
 * 10 requests per 15 minutes
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many authentication attempts, please try again after 15 minutes'
});

/**
 * Login rate limiter
 * 100 login attempts per 15 minutes (relaxed for development)
 * TODO: Change back to 5 for production
 */
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many login attempts, please try again after 15 minutes'
});

/**
 * OTP rate limiter
 * 3 OTP requests per 10 minutes
 */
const otpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Too many OTP requests, please try again after 10 minutes'
});

/**
 * Password reset rate limiter
 * 3 requests per hour
 */
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many password reset attempts, please try again after an hour'
});

/**
 * Account creation rate limiter
 * 5 accounts per hour per IP
 */
const registrationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many accounts created from this IP, please try again after an hour'
});

/**
 * Scoring rate limiter (less strict for real-time scoring)
 * 200 requests per minute
 */
const scoringLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 200,
  message: 'Too many scoring requests, please slow down'
});

/**
 * Room creation rate limiter
 * 10 rooms per hour
 */
const roomCreationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: 'Too many rooms created, please try again later'
});

/**
 * Custom notification rate limiter
 * Dynamic: 20 per hour for regular users, 100 per hour for admins
 */
const customNotificationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: async (req) => {
    if (req.user && req.user.role === 'admin') {
      return 100;
    }
    return 20;
  },
  message: 'Too many custom notifications sent. Please try again later',
  keyGenerator: (req) => req.user ? req.user._id.toString() : req.ip
});

/**
 * Broadcast notification rate limiter (admin only)
 * 5 broadcasts per hour
 */
const broadcastNotificationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many broadcast notifications sent. Please try again later',
  keyGenerator: (req) => req.user ? req.user._id.toString() : req.ip
});

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  loginLimiter,
  otpLimiter,
  passwordResetLimiter,
  registrationLimiter,
  scoringLimiter,
  roomCreationLimiter,
  customNotificationLimiter,
  broadcastNotificationLimiter
};
