'use strict';

/**
 * Centralized error handler middleware.
 * All errors passed to next(err) land here.
 * Returns uniform JSON: { success: false, error: { code, message, details } }
 */
module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      error:   { code: 'VALIDATION_ERROR', message: 'Database validation failed', details },
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error:   { code: 'DUPLICATE_KEY', message: `${field} already exists`, details: err.keyValue },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error:   { code: 'INVALID_TOKEN', message: 'Invalid or malformed token' },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error:   { code: 'TOKEN_EXPIRED', message: 'Authentication token has expired' },
    });
  }

  // CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error:   { code: 'INVALID_ID', message: `Invalid ${err.path}: ${err.value}` },
    });
  }

  // Application-level errors with status
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error:   { code: err.code || 'APP_ERROR', message: err.message, details: err.details || null },
    });
  }

  // Generic fallback
  const status = err.status || 500;
  console.error('Unhandled error:', err);
  return res.status(status).json({
    success: false,
    error:   {
      code:    'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      details: process.env.NODE_ENV === 'production' ? null : err.stack,
    },
  });
};

/**
 * Create an application-level error with a status code.
 */
function createError(statusCode, code, message, details = null) {
  const err     = new Error(message);
  err.statusCode = statusCode;
  err.code       = code;
  err.details    = details;
  return err;
}

module.exports.createError = createError;
