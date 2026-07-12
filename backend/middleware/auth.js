const jwt = require('jsonwebtoken');
const config = require('../config/env');

const JWT_SECRET = config.jwtSecret;

/**
 * Verify Bearer JWT (or legacy session token) and attach payload to req.user.
 * Payload shape: { id, role }
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
    req.session?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

/**
 * Role-based authorization. Call after verifyToken.
 * @param {string|string[]} roles
 */
const authorize = (roles = []) => {
  const allowed = typeof roles === 'string' ? [roles] : roles;

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.',
      });
    }

    if (allowed.length && !allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission for this action.',
      });
    }

    next();
  };
};

const requireUser = [verifyToken, authorize(['user', 'admin'])];
const requireAdmin = [verifyToken, authorize('admin')];
const requireRestaurant = [verifyToken, authorize('restaurant')];
const requireDelivery = [verifyToken, authorize('delivery')];

module.exports = {
  verifyToken,
  authorize,
  requireUser,
  requireAdmin,
  requireRestaurant,
  requireDelivery,
  JWT_SECRET,
};
