const { NODE_ENV } = process.env;

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const response = {
    status: 'error',
    message: err.message || 'Internal Server Error',
  };

  // Include stack trace in development
  if (NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    response.message = 'Validation Error';
    response.errors = err.errors || {};
  }

  // Handle duplicate key errors
  if (err.code === 11000) {
    response.message = 'Duplicate field value entered';
    response.fields = err.keyValue;
  }

  res.status(statusCode).json(response);
};

class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ApiError {
  constructor(errors, message = 'Validation failed') {
    super(message, 400);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

module.exports = {
  errorHandler,
  ApiError,
  ValidationError,
  NotFoundError
};
