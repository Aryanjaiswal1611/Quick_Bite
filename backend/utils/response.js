/**
 * Consistent API response helpers.
 *
 * Success: { success: true, message?, data?, ...extra }
 * Failure: { success: false, message, errors? }
 */

function sendSuccess(res, { status = 200, message = 'OK', data = null, ...extra } = {}) {
  const payload = { success: true, message, ...extra };
  if (data !== null && data !== undefined) {
    payload.data = data;
  }
  return res.status(status).json(payload);
}

function sendError(res, { status = 400, message = 'Request failed', errors = null } = {}) {
  const payload = { success: false, message };
  if (errors) {
    payload.errors = errors;
  }
  return res.status(status).json(payload);
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { sendSuccess, sendError, asyncHandler };
