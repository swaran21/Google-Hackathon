const Emergency = require('../models/Emergency');
const { findNearestAmbulance, assignAmbulance } = require('../services/dispatchService');
const { suggestHospitals } = require('../services/hospitalService');
const { classifyEmergency } = require('../services/triageService');
const { notifyDispatch } = require('../services/notificationService');
const { getRoute, getFullRoute } = require('../services/routingService');
const { ApiError } = require('../middleware/errorHandler');

/**
 * @desc    Create a new emergency SOS request with AI triage
 * @route   POST /api/emergency
 */
const createEmergency = async (req, res, next) => {
  try {
    const { type, latitude, longitude, description, patientName, patientPhone } = req.body;

    if (!type || !latitude || !longitude || !patientName || !patientPhone) {
      throw new ApiError(400, 'Missing required fields: type, latitude, longitude, patientName, patientPhone');
    }

    // ── Step 1: AI Triage — classify severity ──────────────────────
    const triage = classifyEmergency(type, description);

    // ── Step 2: Create emergency record ────────────────────────────
    const emergency = await Emergency.create({
      type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      description: description || '',
      patientName,
      patientPhone,
      severity: triage.severity,
      reportedBy: req.user ? req.user.id : null,
      triageResult: {
        severityLabel: triage.severityLabel,
        confidence: triage.confidence,
        reasoning: triage.reasoning,
        recommendedEquipment: triage.recommendedEquipment,
        responseLevel: triage.responseLevel,
        matchedIndicators: triage.matchedIndicators || [],
        aiModel: triage.aiModel || '',
      },
    });

    // ── Step 3: Find nearest ambulance (severity-aware) ────────────
    const nearest = await findNearestAmbulance(
      parseFloat(latitude),
      parseFloat(longitude),
      triage.recommendedEquipment
    );

    let assignedEmergency = emergency;
    let routeData = null;

    if (nearest) {
      assignedEmergency = await assignAmbulance(
        emergency._id,
        nearest.ambulance._id,
        nearest.eta
      );

      // ── Step 4: Get real road route via OSRM ───────────────────
      const [ambLng, ambLat] = nearest.ambulance.location.coordinates;
      routeData = await getRoute(ambLat, ambLng, parseFloat(latitude), parseFloat(longitude));

      // Use OSRM ETA if available (more accurate than Haversine)
      if (routeData) {
        assignedEmergency.eta = routeData.duration;
        await assignedEmergency.save();
      }
    }

    // ── Step 5: Suggest hospitals ──────────────────────────────────
    const hospitals = await suggestHospitals(parseFloat(latitude), parseFloat(longitude));

    if (hospitals.length > 0) {
      assignedEmergency.assignedHospital = hospitals[0].hospital._id;
      await assignedEmergency.save();
    }

    // ── Step 6: Get full route (ambulance → emergency → hospital) ─
    let fullRoute = null;
    if (nearest && hospitals.length > 0) {
      const [ambLng, ambLat] = nearest.ambulance.location.coordinates;
      const [hLng, hLat] = hospitals[0].hospital.location.coordinates;
      fullRoute = await getFullRoute(
        ambLat, ambLng,
        parseFloat(latitude), parseFloat(longitude),
        hLat, hLng
      );
    }

    // ── Step 7: Send notifications ─────────────────────────────────
    let notifications = [];
    if (nearest) {
      notifications = notifyDispatch(
        assignedEmergency,
        nearest.ambulance,
        routeData?.duration || nearest.eta,
        hospitals.length > 0 ? hospitals[0].hospital : null
      );
    }

    // Populate references for response
    const populated = await Emergency.findById(assignedEmergency._id)
      .populate('assignedAmbulance')
      .populate('assignedHospital');

    // ── Step 8: Emit real-time events ──────────────────────────────
    const io = req.app.get('io');
    if (io) {
      io.emit('emergency:new', {
        emergency: populated,
        triage,
      });
      if (nearest) {
        io.emit('ambulance:assigned', {
          emergencyId: populated._id,
          ambulance: nearest.ambulance,
          eta: routeData?.duration || nearest.eta,
          distance: routeData?.distance || nearest.distance,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        emergency: populated,
        triage,
        ambulance: nearest
          ? {
              ...nearest.ambulance.toObject(),
              distance: routeData?.distance || nearest.distance,
              eta: routeData?.duration || nearest.eta,
            }
          : null,
        suggestedHospitals: hospitals,
        route: routeData,
        fullRoute,
        notifications: notifications.map((n) => ({
          type: n.type,
          to: n.to,
          message: n.message,
          status: n.status,
          provider: n.provider,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get emergency by ID
 * @route   GET /api/emergency/:id
 */
const getEmergency = async (req, res, next) => {
  try {
    const emergency = await Emergency.findById(req.params.id)
      .populate('assignedAmbulance')
      .populate('assignedHospital');

    if (!emergency) throw new ApiError(404, 'Emergency not found');

    res.json({ success: true, data: emergency });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update emergency status
 * @route   PATCH /api/emergency/:id/status
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'dispatched', 'en_route', 'at_scene', 'resolved', 'cancelled'];

    if (!validStatuses.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('assignedAmbulance')
      .populate('assignedHospital');

    if (!emergency) throw new ApiError(404, 'Emergency not found');

    const io = req.app.get('io');
    if (io) {
      io.emit('emergency:status-change', { emergencyId: emergency._id, status });
    }

    res.json({ success: true, data: emergency });
  } catch (error) {
    next(error);
  }
};

module.exports = { createEmergency, getEmergency, updateStatus };
