const auth = require('./auth');
const { errorHandler, notFoundHandler, catchAsync } = require('./errorHandler');
const rateLimiter = require('./rateLimiter');

module.exports = {
  ...auth,
  errorHandler,
  notFoundHandler,
  catchAsync,
  ...rateLimiter
};
