import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    if (error.name === 'CastError') {
      error = ApiError.badRequest(`Invalid ${error.path}: ${error.value}`);
    } else if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      error = ApiError.conflict(`Duplicate value for ${field}. This ${field} is already taken.`);
    } else if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message,
      }));
      error = ApiError.unprocessable('Validation failed', errors);
    } else if (error.name === 'MulterError') {
      error = ApiError.badRequest(`File upload error: ${error.message}`);
    } else {
      error = new ApiError(statusCode, message);
    }
  }

  if (!error.isOperational || error.statusCode >= 500) {
    logger.error({
      err: { message: err.message, stack: err.stack, name: err.name },
      req: { method: req.method, url: req.originalUrl, ip: req.ip },
    }, 'Unhandled error');
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
  };

  if (error.errors && error.errors.length > 0) {
    response.errors = error.errors;
  }

  if (env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(error.statusCode).json(response);
};

export default errorHandler;
