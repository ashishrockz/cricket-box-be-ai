const crypto = require('crypto');
const { OTP, PAGINATION } = require('../config/constants');

/**
 * Generate OTP
 * @param {number} length - OTP length (default from config)
 * @returns {string} - Generated OTP
 */
const generateOTP = (length = OTP.LENGTH) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

/**
 * Generate random token
 * @param {number} bytes - Number of bytes (default: 32)
 * @returns {string} - Hex token
 */
const generateToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash token
 * @param {string} token - Plain token
 * @returns {string} - Hashed token
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Calculate OTP expiry time
 * @param {number} minutes - Minutes until expiry (default from config)
 * @returns {Date} - Expiry date
 */
const calculateOTPExpiry = (minutes = OTP.EXPIRY_MINUTES) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

/**
 * Check if OTP is expired
 * @param {Date} expiryTime - OTP expiry time
 * @returns {boolean}
 */
const isOTPExpired = (expiryTime) => {
  return new Date() > new Date(expiryTime);
};

/**
 * Parse pagination parameters
 * @param {Object} query - Request query object
 * @returns {Object} - Pagination parameters
 */
const parsePagination = (query) => {
  let page = parseInt(query.page) || PAGINATION.DEFAULT_PAGE;
  let limit = parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT;
  
  // Ensure positive values
  page = Math.max(1, page);
  limit = Math.max(1, Math.min(limit, PAGINATION.MAX_LIMIT));
  
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

/**
 * Parse sort parameters
 * @param {string} sortString - Sort string (e.g., "-createdAt" or "name")
 * @param {Array} allowedFields - Allowed sort fields
 * @param {string} defaultSort - Default sort field
 * @returns {Object} - MongoDB sort object
 */
const parseSort = (sortString, allowedFields = [], defaultSort = '-createdAt') => {
  const sort = {};
  const sortField = sortString || defaultSort;
  
  const sortFields = sortField.split(',');
  
  sortFields.forEach(field => {
    const trimmedField = field.trim();
    const isDescending = trimmedField.startsWith('-');
    const fieldName = isDescending ? trimmedField.substring(1) : trimmedField;
    
    if (allowedFields.length === 0 || allowedFields.includes(fieldName)) {
      sort[fieldName] = isDescending ? -1 : 1;
    }
  });
  
  // Default sort if no valid fields
  if (Object.keys(sort).length === 0) {
    sort.createdAt = -1;
  }
  
  return sort;
};

/**
 * Build filter query from request query
 * @param {Object} query - Request query object
 * @param {Array} allowedFilters - Allowed filter fields
 * @returns {Object} - MongoDB filter object
 */
const buildFilter = (query, allowedFilters = []) => {
  const filter = {};
  
  allowedFilters.forEach(field => {
    if (query[field] !== undefined && query[field] !== '') {
      // Handle array fields (e.g., status=active,inactive)
      if (query[field].includes(',')) {
        filter[field] = { $in: query[field].split(',') };
      } else {
        filter[field] = query[field];
      }
    }
  });
  
  // Handle search
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { username: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } }
    ];
  }
  
  return filter;
};

/**
 * Calculate match duration
 * @param {Date} startTime - Match start time
 * @param {Date} endTime - Match end time
 * @returns {number} - Duration in minutes
 */
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  return Math.round((new Date(endTime) - new Date(startTime)) / (1000 * 60));
};

/**
 * Format overs
 * @param {number} overs - Complete overs
 * @param {number} balls - Balls in current over
 * @returns {string} - Formatted overs string (e.g., "5.3")
 */
const formatOvers = (overs, balls) => {
  return `${overs}.${balls}`;
};

/**
 * Parse overs string
 * @param {string} oversString - Overs string (e.g., "5.3")
 * @returns {Object} - { overs, balls }
 */
const parseOvers = (oversString) => {
  const parts = oversString.split('.');
  return {
    overs: parseInt(parts[0]) || 0,
    balls: parseInt(parts[1]) || 0
  };
};

/**
 * Calculate run rate
 * @param {number} runs - Total runs
 * @param {number} overs - Overs bowled
 * @param {number} balls - Balls in current over
 * @returns {number} - Run rate
 */
const calculateRunRate = (runs, overs, balls = 0) => {
  const totalOvers = overs + (balls / 6);
  if (totalOvers === 0) return 0;
  return parseFloat((runs / totalOvers).toFixed(2));
};

/**
 * Calculate required run rate
 * @param {number} target - Target runs
 * @param {number} currentRuns - Current runs
 * @param {number} oversRemaining - Overs remaining
 * @param {number} ballsRemaining - Balls remaining in current over
 * @returns {number} - Required run rate
 */
const calculateRequiredRunRate = (target, currentRuns, oversRemaining, ballsRemaining = 0) => {
  const runsNeeded = target - currentRuns;
  const totalOversRemaining = oversRemaining + (ballsRemaining / 6);
  if (totalOversRemaining <= 0) return runsNeeded > 0 ? Infinity : 0;
  return parseFloat((runsNeeded / totalOversRemaining).toFixed(2));
};

/**
 * Sanitize object - remove undefined/null values
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
const sanitizeObject = (obj) => {
  const sanitized = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      sanitized[key] = obj[key];
    }
  });
  return sanitized;
};

/**
 * Sleep function for async delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if string is valid MongoDB ObjectId
 * @param {string} id - String to check
 * @returns {boolean}
 */
const isValidObjectId = (id) => {
  const ObjectId = require('mongoose').Types.ObjectId;
  return ObjectId.isValid(id) && (new ObjectId(id)).toString() === id;
};

module.exports = {
  generateOTP,
  generateToken,
  hashToken,
  calculateOTPExpiry,
  isOTPExpired,
  parsePagination,
  parseSort,
  buildFilter,
  calculateDuration,
  formatOvers,
  parseOvers,
  calculateRunRate,
  calculateRequiredRunRate,
  sanitizeObject,
  sleep,
  isValidObjectId
};
