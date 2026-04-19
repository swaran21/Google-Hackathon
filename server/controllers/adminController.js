const Emergency = require('../models/Emergency');
const Ambulance = require('../models/Ambulance');
const Hospital = require('../models/Hospital');
const { getNotificationLog } = require('../services/notificationService');

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
    ] = await Promise.all([
      Emergency.countDocuments(),
      Emergency.countDocuments({ status: { $nin: ['resolved', 'cancelled'] } }),
      Emergency.countDocuments({ status: 'resolved' }),
      Ambulance.countDocuments(),
      Ambulance.countDocuments({ status: 'available' }),
      Ambulance.countDocuments({ status: { $ne: 'available' } }),
      Hospital.countDocuments(),
      Emergency.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Emergency.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
      Emergency.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('assignedAmbulance')
        .populate('assignedHospital'),
    ]);

    const hospitalStats = await Hospital.aggregate([
      {
        $group: {
          _id: null,
          totalBeds: { $sum: '$totalBeds' },
          availableBeds: { $sum: '$availableBeds' },
          totalICU: { $sum: '$icuTotal' },
          availableICU: { $sum: '$icuAvailable' },
        },
      },
    ]);

    // Get recent notification log
    const notifications = getNotificationLog().slice(0, 20);

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
        },
        hospitals: {
          total: totalHospitals,
          beds: hospitalStats[0] || { totalBeds: 0, availableBeds: 0, totalICU: 0, availableICU: 0 },
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
      status: { $nin: ['resolved', 'cancelled'] },
    })
      .sort({ createdAt: -1 })
      .populate('assignedAmbulance')
      .populate('assignedHospital');

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
    const ambulances = await Ambulance.find().populate('currentEmergency');
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
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getActiveEmergencies, getAmbulanceStatus, getHospitalCapacity, getNotifications };
