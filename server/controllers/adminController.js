const mongoose = require("mongoose");
const Emergency = require("../models/Emergency");
const Ambulance = require("../models/Ambulance");
const Hospital = require("../models/Hospital");
const User = require("../models/User");
const { getNotificationLog } = require("../services/notificationService");
const { ApiError } = require("../middleware/errorHandler");

const getSystemHealthSnapshot = () => ({
  database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  socketio: "ready",
  triage: "active",
  routing: "osrm-connected",
  notifications: "simulated",
  uptimeSeconds: Math.round(process.uptime()),
  timestamp: new Date().toISOString(),
});

/**
 * @desc    Get aggregated dashboard statistics
 * @route   GET /api/admin/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const [
      totalEmergencies,
      activeEmergencies,
      resolvedEmergencies,
      totalAmbulances,
      availableAmbulances,
      dispatchedAmbulances,
      totalHospitals,
      emergenciesByType,
      emergenciesBySeverity,
      recentEmergencies,
      totalUsers,
      recentUsers,
    ] = await Promise.all([
      Emergency.countDocuments(),
      Emergency.countDocuments({ status: { $nin: ["resolved", "cancelled"] } }),
      Emergency.countDocuments({ status: "resolved" }),
      Ambulance.countDocuments(),
      Ambulance.countDocuments({ status: "available" }),
      Ambulance.countDocuments({ status: { $ne: "available" } }),
      Hospital.countDocuments(),
      Emergency.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Emergency.aggregate([
        { $group: { _id: "$severity", count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
      Emergency.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("assignedAmbulance")
        .populate("assignedHospital"),
      User.countDocuments(),
      User.find()
        .sort({ createdAt: -1 })
        .limit(12)
        .select(
          "name email phone role assignedAmbulance assignedHospital createdAt",
        )
        .populate(
          "assignedAmbulance",
          "vehicleNumber status equipmentLevel driverName",
        )
        .populate(
          "assignedHospital",
          "name totalBeds availableBeds icuTotal icuAvailable",
        ),
    ]);

    const usersByRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const ambulanceStatusBreakdown = await Ambulance.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const emergencyStatusBreakdown = await Emergency.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const hospitalStats = await Hospital.aggregate([
      {
        $group: {
          _id: null,
          totalBeds: { $sum: "$totalBeds" },
          availableBeds: { $sum: "$availableBeds" },
          totalICU: { $sum: "$icuTotal" },
          availableICU: { $sum: "$icuAvailable" },
        },
      },
    ]);

    // Get recent notification log
    const notifications = getNotificationLog().slice(0, 20);
    const systemHealth = getSystemHealthSnapshot();

    res.json({
      success: true,
      data: {
        emergencies: {
          total: totalEmergencies,
          active: activeEmergencies,
          resolved: resolvedEmergencies,
          byType: emergenciesByType,
          bySeverity: emergenciesBySeverity,
        },
        ambulances: {
          total: totalAmbulances,
          available: availableAmbulances,
          dispatched: dispatchedAmbulances,
          byStatus: ambulanceStatusBreakdown,
        },
        hospitals: {
          total: totalHospitals,
          beds: hospitalStats[0] || {
            totalBeds: 0,
            availableBeds: 0,
            totalICU: 0,
            availableICU: 0,
          },
        },
        users: {
          total: totalUsers,
          byRole: usersByRole,
          recent: recentUsers,
        },
        systemHealth,
        operations: {
          emergencyStatuses: emergencyStatusBreakdown,
          backlog: activeEmergencies,
        },
        recentEmergencies,
        notifications,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all active emergencies
 * @route   GET /api/admin/emergencies
 */
const getActiveEmergencies = async (req, res, next) => {
  try {
    const emergencies = await Emergency.find({
      status: { $nin: ["resolved", "cancelled"] },
    })
      .sort({ createdAt: -1 })
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    res.json({ success: true, count: emergencies.length, data: emergencies });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all ambulance statuses
 * @route   GET /api/admin/ambulances
 */
const getAmbulanceStatus = async (req, res, next) => {
  try {
    const ambulances = await Ambulance.find().populate("currentEmergency");
    res.json({ success: true, count: ambulances.length, data: ambulances });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get hospital capacity overview
 * @route   GET /api/admin/hospitals
 */
const getHospitalCapacity = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find().sort({ availableBeds: -1 });
    res.json({ success: true, count: hospitals.length, data: hospitals });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get notification log
 * @route   GET /api/admin/notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const notifications = getNotificationLog();
    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get admin user directory
 * @route   GET /api/admin/users
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select(
        "name email phone role assignedAmbulance assignedHospital createdAt updatedAt",
      )
      .populate(
        "assignedAmbulance",
        "vehicleNumber status equipmentLevel driverName",
      )
      .populate(
        "assignedHospital",
        "name totalBeds availableBeds icuTotal icuAvailable emergencyDepartment",
      )
      .limit(100);

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get admin system health snapshot
 * @route   GET /api/admin/health
 */
const getSystemHealth = async (req, res, next) => {
  try {
    const [emergencyCounts, ambulanceCounts, hospitalCounts] =
      await Promise.all([
        Emergency.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Ambulance.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Hospital.aggregate([
          { $group: { _id: "$isActive", count: { $sum: 1 } } },
        ]),
      ]);

    res.json({
      success: true,
      data: {
        ...getSystemHealthSnapshot(),
        databaseStatus: mongoose.connection.readyState,
        emergencyCounts,
        ambulanceCounts,
        hospitalCounts,
        notificationFeedSize: getNotificationLog().length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin login
 * @route   POST /api/admin/login
 */
const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    }).select("+password");

    if (!user) {
      throw new ApiError(401, "Invalid admin credentials");
    }

    if (user.role !== "admin") {
      throw new ApiError(403, "This endpoint is restricted to admin accounts");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, "Invalid admin credentials");
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
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getActiveEmergencies,
  getAmbulanceStatus,
  getHospitalCapacity,
  getNotifications,
  getUsers,
  getSystemHealth,
  loginAdmin,
};
