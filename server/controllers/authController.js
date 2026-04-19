const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Ambulance = require('../models/Ambulance');
const { ApiError } = require('../middleware/errorHandler');

/**
 * @desc    Register a regular user
 * @route   POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      throw new ApiError(400, 'Name, email, and password are required');
    }

    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(400, 'Email already registered');

    const user = await User.create({ name, email, password, phone, role: role || 'user' });
    const token = user.generateToken();

    res.status(201).json({
      success: true,
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register a hospital — creates Hospital doc + linked User account
 * @route   POST /api/auth/register-hospital
 */
const registerHospital = async (req, res, next) => {
  try {
    const {
      hospitalName, email, password, phone,
      latitude, longitude,
      totalBeds, icuTotal,
    } = req.body;

    // Validation
    if (!hospitalName || !email || !password || !latitude || !longitude || !totalBeds || !icuTotal) {
      throw new ApiError(400, 'hospitalName, email, password, location, totalBeds, and icuTotal are required');
    }

    if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new ApiError(400, 'Email already registered');

    // Create the Hospital document first
    const hospital = await Hospital.create({
      name: hospitalName,
      email,
      phone: phone || '',
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      totalBeds: parseInt(totalBeds, 10),
      availableBeds: parseInt(totalBeds, 10), // Initially all beds are available
      icuTotal: parseInt(icuTotal, 10),
      icuAvailable: parseInt(icuTotal, 10),   // Initially all ICU beds are available
      emergencyDepartment: true,
      isActive: true,
    });

    // Create the User account linked to the hospital
    const user = await User.create({
      name: hospitalName,
      email,
      password,
      phone: phone || '',
      role: 'hospital',
      assignedHospital: hospital._id,
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
          assignedHospital: hospital._id,
        },
        hospital: {
          id: hospital._id,
          name: hospital.name,
          totalBeds: hospital.totalBeds,
          icuTotal: hospital.icuTotal,
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

    if (!email || !password) throw new ApiError(400, 'Email and password are required');

    const user = await User.findOne({ email }).select('+password');
    if (!user) throw new ApiError(401, 'Invalid email or password');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new ApiError(401, 'Invalid email or password');

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

/**
 * @desc    Register an ambulance — creates Ambulance doc + linked User account
 * @route   POST /api/auth/register-ambulance
 */
const registerAmbulance = async (req, res, next) => {
  try {
    const {
      vehicleNumber, driverName, email, password, phone,
      equipmentLevel,
    } = req.body;

    // Validation
    if (!vehicleNumber || !driverName || !email || !password || !phone || !equipmentLevel) {
      throw new ApiError(400, 'vehicleNumber, driverName, email, password, phone, and equipmentLevel are required');
    }

    if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new ApiError(400, 'Email already registered');

    const existingAmbulance = await Ambulance.findOne({ vehicleNumber: vehicleNumber.toUpperCase() });
    if (existingAmbulance) throw new ApiError(400, 'Vehicle number already registered');

    // Create the Ambulance document
    const ambulance = await Ambulance.create({
      vehicleNumber,
      driverName,
      driverPhone: phone,
      location: {
        type: 'Point',
        coordinates: [78.4867, 17.3850], // Default location, can be updated from frontend later
      },
      equipmentLevel, // 'basic', 'advanced', 'critical_care'
      status: 'available',
      isActive: true,
    });

    // Create the User account
    const user = await User.create({
      name: driverName,
      email,
      password,
      phone,
      role: 'driver',
      assignedAmbulance: ambulance._id,
    });

    // Update ambulance with assigned driver
    ambulance.assignedDriver = user._id;
    await ambulance.save();

    const token = user.generateToken();

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          assignedAmbulance: ambulance._id,
        },
        ambulance: {
          id: ambulance._id,
          vehicleNumber: ambulance.vehicleNumber,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, registerHospital, registerAmbulance, login, getMe };


