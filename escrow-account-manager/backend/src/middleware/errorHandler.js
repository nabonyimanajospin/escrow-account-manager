const { ValidationError, UniqueConstraintError, DatabaseError } = require('sequelize');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Sequelize validation errors (e.g. field too short, wrong enum value)
  if (err instanceof ValidationError) {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', '),
    });
  }

  // Sequelize unique constraint error (e.g. duplicate email)
  if (err instanceof UniqueConstraintError) {
    const field = err.errors[0]?.path || 'field';
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // Sequelize database errors (e.g. wrong data type)
  if (err instanceof DatabaseError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid data provided',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired, please login again',
    });
  }

  // Default server error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
  });
};

module.exports = errorHandler;
