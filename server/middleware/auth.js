const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ApiError } = require('./errorHandler');

/**
 * Protect routes — verifies JWT token from Authorization header.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized — no token provided');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'User no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token expired'));
    }
    next(error);
  }
};

/**
 * Restrict routes to specific roles.
 * Usage: authorize('admin', 'hospital')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `Role '${req.user.role}' is not authorized to access this route`));
    }
    next();
  };
};

module.exports = { protect, authorize };
