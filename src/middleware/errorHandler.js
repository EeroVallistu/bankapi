/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Build response object
  const errorResponse = {
    status: 'error',
    message: err.message || 'Something went wrong'
  };
  
  // Add validation errors if present
  if (err.errors) {
    errorResponse.errors = err.errors;
  }
  
  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json(errorResponse);
  }
  
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token'
    });
  }
  
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      status: 'error',
      message: 'Resource already exists',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Add specific error handlers
  if (err instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  if (err instanceof jwt.TokenExpiredError) {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  if (err.name === 'ExternalServiceError') {
    return res.status(502).json({
      status: 'error',
      message: 'External service unavailable',
      code: 'EXTERNAL_SERVICE_ERROR',
      retryAfter: err.retryAfter || 60
    });
  }
  
  // Default error response
  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
