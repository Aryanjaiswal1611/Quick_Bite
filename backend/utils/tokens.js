const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate a signed JWT for any role-bearing entity.
 * @param {{ id: string, role: string }} payload
 * @param {string} [expiresIn]
 */
function generateToken({ id, role }, expiresIn = config.jwtExpiresIn) {
  return jwt.sign(
    { id: String(id), role },
    config.jwtSecret,
    { expiresIn }
  );
}

module.exports = { generateToken };
