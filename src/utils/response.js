/**
 * Standardized API Response Helper
 * Ensures consistent response format across all API endpoints
 */

/**
 * Success Response
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {number} options.statusCode - HTTP status code (default: 200)
 * @param {string} options.message - Success message
 * @param {Object} options.data - Response data
 * @param {Object} options.meta - Additional metadata (pagination, etc.)
 */
const successResponse = (res, { statusCode = 200, message = 'Success', data = null, meta = null }) => {
  const response = {
    success: true,
    message,
    ...(data !== null && { data }),
    ...(meta !== null && { meta })
  };
  
  return res.status(statusCode).json(response);
};

/**
 * Created Response (201)
 */
const createdResponse = (res, { message = 'Resource created successfully', data = null }) => {
  return successResponse(res, { statusCode: 201, message, data });
};

/**
 * No Content Response (204)
 */
const noContentResponse = (res) => {
  return res.status(204).send();
};

/**
 * Error Response
 * @param {Object} res - Express response object
 * @param {Object} options - Error options
 * @param {number} options.statusCode - HTTP status code
 * @param {string} options.message - Error message
 * @param {string} options.errorCode - Application error code
 * @param {Array} options.errors - Validation errors array
 * @param {string} options.stack - Error stack trace (only in development)
 */
const errorResponse = (res, { statusCode = 500, message = 'An error occurred', errorCode = null, errors = null, stack = null }) => {
  const response = {
    success: false,
    message,
    ...(errorCode && { errorCode }),
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && stack && { stack })
  };
  
  return res.status(statusCode).json(response);
};

/**
 * Validation Error Response (400)
 */
const validationErrorResponse = (res, errors, message = 'Validation failed') => {
  return errorResponse(res, {
    statusCode: 400,
    message,
    errorCode: 'VALIDATION_ERROR',
    errors
  });
};

/**
 * Unauthorized Response (401)
 */
const unauthorizedResponse = (res, message = 'Unauthorized', errorCode = 'UNAUTHORIZED') => {
  return errorResponse(res, {
    statusCode: 401,
    message,
    errorCode
  });
};

/**
 * Forbidden Response (403)
 */
const forbiddenResponse = (res, message = 'Forbidden', errorCode = 'FORBIDDEN') => {
  return errorResponse(res, {
    statusCode: 403,
    message,
    errorCode
  });
};

/**
 * Not Found Response (404)
 */
const notFoundResponse = (res, message = 'Resource not found', errorCode = 'NOT_FOUND') => {
  return errorResponse(res, {
    statusCode: 404,
    message,
    errorCode
  });
};

/**
 * Conflict Response (409)
 */
const conflictResponse = (res, message = 'Resource already exists', errorCode = 'CONFLICT') => {
  return errorResponse(res, {
    statusCode: 409,
    message,
    errorCode
  });
};

/**
 * Rate Limit Response (429)
 */
const rateLimitResponse = (res, message = 'Too many requests', retryAfter = 60) => {
  res.set('Retry-After', retryAfter);
  return errorResponse(res, {
    statusCode: 429,
    message,
    errorCode: 'RATE_LIMIT_EXCEEDED'
  });
};

/**
 * Internal Server Error Response (500)
 */
const serverErrorResponse = (res, message = 'Internal server error', stack = null) => {
  return errorResponse(res, {
    statusCode: 500,
    message,
    errorCode: 'INTERNAL_SERVER_ERROR',
    stack
  });
};

/**
 * Paginated Response
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {Array} options.data - Data array
 * @param {number} options.page - Current page
 * @param {number} options.limit - Items per page
 * @param {number} options.total - Total items count
 * @param {string} options.message - Success message
 */
const paginatedResponse = (res, { data, page, limit, total, message = 'Success' }) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return successResponse(res, {
    message,
    data,
    meta: {
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    }
  });
};

module.exports = {
  successResponse,
  createdResponse,
  noContentResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  rateLimitResponse,
  serverErrorResponse,
  paginatedResponse
};
