// all errors from controllers flow through here
// keeps error responses consistent across the whole API

// catches requests to routes that don't exist
function notFoundHandler(req, res, _next) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// main error handler - needs 4 params so express knows it's an error handler
function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  // prisma throws P2002 when a unique constraint is violated
  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'field';
    return res.status(409).json({
      success: false,
      error: `A record with this ${field} already exists.`,
    });
  }

  // prisma P2025 = record not found (e.g. delete/update on non-existent id)
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Record not found.',
    });
  }

  // express-validator errors come in as a structured object with a type field
  if (err.type === 'validation') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors,
    });
  }

  // anything we threw ourselves with createError() has a statusCode
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // fallback - hide the real error message in production
  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Something went wrong',
  });
}

// small helper to create an error object with a status code attached
// usage: throw createError(400, 'something went wrong')
function createError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = { errorHandler, notFoundHandler, createError };
