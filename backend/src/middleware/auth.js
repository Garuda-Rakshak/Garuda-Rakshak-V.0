'use strict';

/**
 * JWT Authentication & Role-Based Authorization Middleware
 */

const jwt    = require('jsonwebtoken');
const { getEnv }    = require('../config/env');
const { createError } = require('./errorHandler');

/**
 * Authenticate: verify JWT from Authorization: Bearer <token>
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return next(createError(401, 'MISSING_TOKEN', 'Authorization header missing or malformed'));
  }

  const token = authHeader.slice(7);
  const { JWT_SECRET } = getEnv();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role, iat, exp }
    return next();
  } catch (err) {
    return next(err); // forwarded to errorHandler (handles JWT errors)
  }
}

/**
 * Authorization factory: require one of the given roles.
 * Must be called AFTER authenticate().
 *
 * @param {...string} roles - Allowed roles (e.g. 'admin', 'engineer')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'UNAUTHENTICATED', 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(createError(403, 'FORBIDDEN', `Access denied. Required role: ${roles.join(' or ')}`));
    }
    return next();
  };
}

/**
 * Optional auth: attach user if token present, but don't fail if absent.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return next();

  const token = authHeader.slice(7);
  const { JWT_SECRET } = getEnv();

  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (_) { /* ignore */ }
  return next();
}

module.exports = { authenticate, requireRole, optionalAuth };
