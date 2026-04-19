const Ambulance = require('../models/Ambulance');
const { findNearestAmbulance } = require('../services/dispatchService');
const { ApiError } = require('../middleware/errorHandler');

/**
 * @desc    Get nearest available ambulance to coordinates
 * @route   GET /api/ambulance/nearest?lat=&lng=
 */
const getNearestAmbulance = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      throw new ApiError(400, 'Query params lat and lng are required');
    }

    const result = await findNearestAmbulance(parseFloat(lat), parseFloat(lng));

    if (!result) {
      return res.json({
        success: true,
        data: null,
        message: 'No ambulances currently available',
      });
    }

    res.json({
      success: true,
      data: {
        ambulance: result.ambulance,
        distance: result.distance,
        eta: result.eta,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all ambulances
 * @route   GET /api/ambulance
 */
const getAllAmbulances = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const ambulances = await Ambulance.find(filter).populate('currentEmergency');

    res.json({ success: true, count: ambulances.length, data: ambulances });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update ambulance location (used by ambulance driver app / simulation)
 * @route   PATCH /api/ambulance/:id/location
 */
const updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      throw new ApiError(400, 'latitude and longitude are required');
    }

    const ambulance = await Ambulance.findByIdAndUpdate(
      req.params.id,
      {
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
      },
      { new: true }
    );

    if (!ambulance) {
      throw new ApiError(404, 'Ambulance not found');
    }

    // Broadcast location update in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('ambulance:location-update', {
        ambulanceId: ambulance._id,
        location: ambulance.location,
        status: ambulance.status,
      });
    }

    res.json({ success: true, data: ambulance });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update ambulance status
 * @route   PATCH /api/ambulance/:id/status
 */
const updateAmbulanceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['available', 'dispatched', 'en_route', 'at_scene', 'returning'];

    if (!validStatuses.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const update = { status };
    // Clear emergency reference when ambulance becomes available
    if (status === 'available') {
      update.currentEmergency = null;
    }

    const ambulance = await Ambulance.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!ambulance) {
      throw new ApiError(404, 'Ambulance not found');
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('ambulance:status-change', {
        ambulanceId: ambulance._id,
        status: ambulance.status,
      });
    }

    res.json({ success: true, data: ambulance });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNearestAmbulance, getAllAmbulances, updateLocation, updateAmbulanceStatus };
