/**
 * Centralized Express error handler.
 * Must be registered after all routes.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // JSON parse errors (malformed request body)
  if (err && (err.type === 'entity.parse.failed' || err.name === 'SyntaxError')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body.',
    });
  }

  // Multer / upload errors
  if (err && err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error',
    });
  }

  // Mongoose validation
  if (err && err.name === 'ValidationError') {
    const errors = {};
    Object.keys(err.errors || {}).forEach((key) => {
      errors[key] = err.errors[key].message;
    });
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // Duplicate key
  if (err && err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
      errors: { [field]: 'Already registered' },
    });
  }

  const status = err.status || err.statusCode || 500;
  const isInternal = status === 500;
  const message =
    isInternal && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  // eslint-disable-next-line no-console
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${status} - ${err.message || 'Unknown error'}`);
  // eslint-disable-next-line no-console
  console.error(`  Origin: ${req.headers.origin || 'N/A'}`);
  // eslint-disable-next-line no-console
  console.error(`  Referer: ${req.headers.referer || 'N/A'}`);
  if (!isInternal || process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  return res.status(status).json({
    success: false,
    message,
  });
}

function notFoundHandler(req, res, next) {
  // Only for API routes — SPA fallback handles the rest
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  }
  next();
}

module.exports = { errorHandler, notFoundHandler };
