const { AppError, ERROR_CODES } = require('../utils/errors');
const { errorResponse } = require('../utils/response');

/**
 * Handle Cast Error (Invalid MongoDB ObjectId)
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

/**
 * Handle Duplicate Key Error (MongoDB)
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `${field} '${value}' already exists. Please use a different value.`;
  return new AppError(message, 409, 'DUPLICATE_KEY');
};

/**
 * Handle Validation Error (Mongoose)
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(el => ({
    field: el.path,
    message: el.message,
    value: el.value
  }));
  const message = 'Validation failed';
  const error = new AppError(message, 400, 'VALIDATION_ERROR');
  error.errors = errors;
  return error;
};

/**
 * Handle JWT Error
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please login again.', 401, ERROR_CODES.TOKEN_INVALID);
};

/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = () => {
  return new AppError('Your session has expired. Please login again.', 401, ERROR_CODES.TOKEN_EXPIRED);
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, res) => {
  return errorResponse(res, {
    statusCode: err.statusCode || 500,
    message: err.message,
    errorCode: err.errorCode,
    errors: err.errors,
    stack: err.stack
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return errorResponse(res, {
      statusCode: err.statusCode,
      message: err.message,
      errorCode: err.errorCode,
      errors: err.errors
    });
  }

  // Programming or unknown error: don't leak error details
  console.error('ERROR 💥:', err);

  return errorResponse(res, {
    statusCode: 500,
    message: 'Something went wrong. Please try again later.',
    errorCode: 'INTERNAL_SERVER_ERROR'
  });
};

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode
    });
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = err;

    // Handle specific error types
    // Only handle Mongoose ValidationError, not our custom ValidationError
    if (err.name === 'CastError') error = handleCastError(err);
    if (err.code === 11000) error = handleDuplicateKeyError(err);
    if (err.name === 'ValidationError' && !err.isOperational) error = handleValidationError(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

/**
 * Handle 404 - Route not found
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Cannot ${req.method} ${req.originalUrl}`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Async error wrapper - catches errors in async route handlers
 * @param {Function} fn - Async function to wrap
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  catchAsync
};
