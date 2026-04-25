const Ambulance = require('../models/Ambulance');
const Emergency = require('../models/Emergency');
const { haversine } = require('../utils/haversine');
const { ApiError } = require('../middleware/errorHandler');

/**
 * @desc    Get driver's assigned ambulance and current emergency
 * @route   GET /api/driver/status
 */
const getDriverStatus = async (req, res, next) => {
  try {
    const { ambulanceId } = req.query;
    if (!ambulanceId) throw new ApiError(400, 'ambulanceId query param is required');

    const ambulance = await Ambulance.findById(ambulanceId).populate('currentEmergency');

    if (!ambulance) throw new ApiError(404, 'Ambulance not found');

    let emergency = null;
    if (ambulance.currentEmergency) {
      emergency = await Emergency.findById(ambulance.currentEmergency._id || ambulance.currentEmergency)
        .populate('assignedHospital');
    }

    res.json({
      success: true,
      data: { ambulance, emergency },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Driver accepts a dispatch assignment
 * @route   POST /api/driver/accept
 */
const acceptDispatch = async (req, res, next) => {
  try {
    const { ambulanceId } = req.body;
    if (!ambulanceId) throw new ApiError(400, 'ambulanceId is required');

    const ambulance = await Ambulance.findByIdAndUpdate(
      ambulanceId,
      { status: 'en_route' },
      { new: true }
    ).populate('currentEmergency');

    if (!ambulance) throw new ApiError(404, 'Ambulance not found');

    // Update emergency status too
    if (ambulance.currentEmergency) {
      await Emergency.findByIdAndUpdate(ambulance.currentEmergency._id || ambulance.currentEmergency, {
        status: 'en_route',
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('ambulance:status-change', { ambulanceId: ambulance._id, status: 'en_route' });
      if (ambulance.currentEmergency) {
        io.emit('emergency:status-change', {
          emergencyId: ambulance.currentEmergency._id || ambulance.currentEmergency,
          status: 'en_route',
        });
      }
    }

    res.json({ success: true, data: ambulance, message: 'Dispatch accepted. Navigating to emergency.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Driver rejects a dispatch (re-assigns to next nearest)
 * @route   POST /api/driver/reject
 */
const rejectDispatch = async (req, res, next) => {
  try {
    const { ambulanceId } = req.body;
    if (!ambulanceId) throw new ApiError(400, 'ambulanceId is required');

    const ambulance = await Ambulance.findById(ambulanceId);
    if (!ambulance) throw new ApiError(404, 'Ambulance not found');

    const emergencyId = ambulance.currentEmergency;

    // Release this ambulance
    ambulance.status = 'available';
    ambulance.currentEmergency = null;
    await ambulance.save();

    // Update emergency back to pending
    if (emergencyId) {
      await Emergency.findByIdAndUpdate(emergencyId, {
        status: 'pending',
        assignedAmbulance: null,
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('ambulance:status-change', { ambulanceId: ambulance._id, status: 'available' });
      io.emit('dispatch:rejected', { ambulanceId: ambulance._id, emergencyId });
    }

    res.json({ success: true, message: 'Dispatch rejected. Emergency returned to queue.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Driver updates their status (at_scene, returning, etc.)
 * @route   POST /api/driver/update-status
 */
const updateDriverStatus = async (req, res, next) => {
  try {
    const { ambulanceId, status } = req.body;
    const validStatuses = ['en_route', 'at_scene', 'returning', 'available'];

    if (!validStatuses.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const update = { status };
    if (status === 'available') {
      update.currentEmergency = null;
    }

    const ambulance = await Ambulance.findByIdAndUpdate(ambulanceId, update, { new: true });
    if (!ambulance) throw new ApiError(404, 'Ambulance not found');

    // Sync emergency status
    if (ambulance.currentEmergency || status === 'available') {
      const emergencyStatus = {
        en_route: 'en_route',
        at_scene: 'at_scene',
        returning: 'resolved',
        available: 'resolved',
      };

      if (ambulance.currentEmergency) {
        await Emergency.findByIdAndUpdate(ambulance.currentEmergency, {
          status: emergencyStatus[status],
        });
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('ambulance:status-change', { ambulanceId: ambulance._id, status });
      io.emit('emergency:status-change', {
        emergencyId: ambulance.currentEmergency,
        status: status === 'at_scene' ? 'at_scene' : status === 'available' ? 'resolved' : status,
      });
    }

    res.json({ success: true, data: ambulance });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Simulate ambulance GPS movement toward emergency location (Phase 1)
 *          or toward assigned hospital (Phase 2: after pickup).
 *          Moves the ambulance 1 step closer each call.
 * @route   POST /api/driver/simulate-move
 */
const simulateMove = async (req, res, next) => {
  try {
    const { ambulanceId } = req.body;
    if (!ambulanceId) throw new ApiError(400, 'ambulanceId is required');

    const ambulance = await Ambulance.findById(ambulanceId).populate('currentEmergency');
    if (!ambulance) throw new ApiError(404, 'Ambulance not found');
    if (!ambulance.currentEmergency) throw new ApiError(400, 'No active emergency assigned');

    const emergency = await Emergency.findById(
      ambulance.currentEmergency._id || ambulance.currentEmergency
    ).populate('assignedHospital');

    if (!emergency) throw new ApiError(404, 'Emergency not found');

    const [ambLng, ambLat] = ambulance.location.coordinates;

    // Phase 2: If at_scene, navigate toward hospital
    const isPhase2 = ambulance.status === 'at_scene' && emergency.assignedHospital;
    let targetLat, targetLng, arrivalLabel;

    if (isPhase2) {
      const [hospLng, hospLat] = emergency.assignedHospital.location.coordinates;
      targetLat = hospLat;
      targetLng = hospLng;
      arrivalLabel = 'hospital';
    } else {
      // Phase 1: Navigate toward patient
      const [emLng, emLat] = emergency.location.coordinates;
      targetLat = emLat;
      targetLng = emLng;
      arrivalLabel = 'patient';
    }

    // Move 15% closer to destination each step
    const stepFraction = 0.15;
    const newLat = ambLat + (targetLat - ambLat) * stepFraction;
    const newLng = ambLng + (targetLng - ambLng) * stepFraction;

    // Check if close enough (within ~200 meters)
    const remainingDist = haversine(newLat, newLng, targetLat, targetLng);
    const arrived = remainingDist < 0.2;

    ambulance.location.coordinates = [newLng, newLat];

    if (arrived && !isPhase2) {
      // Phase 1 arrival: reached patient
      ambulance.status = 'at_scene';
    } else if (arrived && isPhase2) {
      // Phase 2 arrival: reached hospital → resolve emergency
      ambulance.status = 'available';
      ambulance.currentEmergency = null;
      emergency.status = 'resolved';
      await emergency.save();
    }

    await ambulance.save();

    const io = req.app.get('io');
    if (io) {
      const locationPayload = {
        ambulanceId: ambulance._id,
        location: ambulance.location,
        vehicleNumber: ambulance.vehicleNumber,
        status: ambulance.status,
        phase: isPhase2 ? 'to_hospital' : 'to_patient',
      };

      // Broadcast to all tracking clients
      io.emit('ambulance:location-update', locationPayload);

      // Emit to emergency room
      io.to(`emergency:${emergency._id}`).emit('ambulance:tracking', locationPayload);

      // Emit to hospital room
      if (emergency.assignedHospital?._id) {
        io.to(`hospital:${emergency.assignedHospital._id}`).emit(
          'ambulance:tracking',
          locationPayload
        );
      }

      if (arrived && !isPhase2) {
        // Phase 1 arrival events
        io.emit('ambulance:status-change', { ambulanceId: ambulance._id, status: 'at_scene' });
        io.emit('emergency:status-change', {
          emergencyId: emergency._id,
          status: 'at_scene',
        });
        await Emergency.findByIdAndUpdate(emergency._id, { status: 'at_scene' });
      } else if (arrived && isPhase2) {
        // Phase 2 arrival events
        io.emit('ambulance:status-change', { ambulanceId: ambulance._id, status: 'available' });
        io.emit('emergency:status-change', {
          emergencyId: emergency._id,
          status: 'resolved',
        });
      }
    }

    res.json({
      success: true,
      data: {
        ambulance,
        remainingDistance: Math.round(remainingDist * 100) / 100,
        arrived,
        phase: isPhase2 ? 'to_hospital' : 'to_patient',
        arrivalLabel,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDriverStatus, acceptDispatch, rejectDispatch, updateDriverStatus, simulateMove };
