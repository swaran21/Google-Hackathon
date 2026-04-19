const User = require('../models/User');
const { ApiError } = require('../middleware/errorHandler');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      throw new ApiError(400, 'Name, email, and password are required');
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      throw new ApiError(400, 'Email already registered');
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'user',
    });

    const token = user.generateToken();

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const token = user.generateToken();

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          assignedAmbulance: user.assignedAmbulance,
          assignedHospital: user.assignedHospital,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('assignedAmbulance')
      .populate('assignedHospital');

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
