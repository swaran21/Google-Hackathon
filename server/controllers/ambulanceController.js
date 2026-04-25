const Ambulance = require("../models/Ambulance");
const Emergency = require("../models/Emergency");
const { findNearestAmbulance } = require("../services/dispatchService");
const { ApiError } = require("../middleware/errorHandler");
const { getRouteWithFallback } = require("../services/routingService");

const USER_ACTIVE_STATUSES = ["pending", "dispatched", "en_route", "at_scene"];

const buildEmergencyRoute = async (ambulance, emergency) => {
  if (!ambulance?.location?.coordinates || !emergency?.location?.coordinates) {
    return null;
  }

  const [ambLng, ambLat] = ambulance.location.coordinates;
  const [emLng, emLat] = emergency.location.coordinates;
  const [hospLng, hospLat] =
    emergency.assignedHospital?.location?.coordinates || [];

  const isPhase2 =
    emergency.status === "at_scene" &&
    Number.isFinite(hospLat) &&
    Number.isFinite(hospLng);

  const toLat = isPhase2 ? hospLat : emLat;
  const toLng = isPhase2 ? hospLng : emLng;

  const routeResult = await getRouteWithFallback(ambLat, ambLng, toLat, toLng);

  return {
    phase: isPhase2 ? "to_hospital" : "to_patient",
    distanceKm: routeResult.route?.distance ?? null,
    etaMinutes: routeResult.route?.duration ?? null,
    path: routeResult.path,
  };
};

/**
 * @desc    Get nearest available ambulance to coordinates
 * @route   GET /api/ambulance/nearest?lat=&lng=
 */
const getNearestAmbulance = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      throw new ApiError(400, "Query params lat and lng are required");
    }

    const result = await findNearestAmbulance(parseFloat(lat), parseFloat(lng));

    if (!result) {
      return res.json({
        success: true,
        data: null,
        message: "No ambulances currently available",
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
    const ambulances =
      await Ambulance.find(filter).populate("currentEmergency");

    res.json({ success: true, count: ambulances.length, data: ambulances });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get ambulances visible to logged-in user
 *          Includes all available ambulances + ambulance assigned to this user's active SOS
 * @route   GET /api/ambulance/visible
 */
const getUserVisibleAmbulances = async (req, res, next) => {
  try {
    const availableAmbulances = await Ambulance.find({
      status: "available",
      isActive: true,
    }).populate("currentEmergency");

    const activeEmergency = await Emergency.findOne({
      reportedBy: req.user._id,
      status: { $in: USER_ACTIVE_STATUSES },
    })
      .sort({ createdAt: -1 })
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    const visibleById = new Map();
    availableAmbulances.forEach((amb) => {
      visibleById.set(amb._id.toString(), amb);
    });

    if (activeEmergency?.assignedAmbulance?._id) {
      visibleById.set(
        activeEmergency.assignedAmbulance._id.toString(),
        activeEmergency.assignedAmbulance,
      );
    }

    const visibleAmbulances = Array.from(visibleById.values());
    const activeRoute =
      activeEmergency?.assignedAmbulance && activeEmergency
        ? await buildEmergencyRoute(
            activeEmergency.assignedAmbulance,
            activeEmergency,
          )
        : null;

    res.json({
      success: true,
      count: visibleAmbulances.length,
      data: {
        ambulances: visibleAmbulances,
        activeEmergency,
        activeRoute,
      },
    });
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
      throw new ApiError(400, "latitude and longitude are required");
    }

    const ambulance = await Ambulance.findByIdAndUpdate(
      req.params.id,
      {
        location: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
      },
      { new: true },
    );

    if (!ambulance) {
      throw new ApiError(404, "Ambulance not found");
    }

    let emergency = null;
    if (ambulance.currentEmergency) {
      emergency = await Emergency.findById(ambulance.currentEmergency).populate(
        "assignedHospital",
      );
    }

    const route = emergency
      ? await buildEmergencyRoute(ambulance, emergency)
      : null;

    // Broadcast location update in real-time
    const io = req.app.get("io");
    if (io) {
      io.emit("ambulance:location-update", {
        ambulanceId: ambulance._id,
        location: ambulance.location,
        status: ambulance.status,
        phase: route?.phase || null,
        routePath: route?.path || null,
        routeDistanceKm: route?.distanceKm ?? null,
        routeEtaMinutes: route?.etaMinutes ?? null,
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
    const validStatuses = [
      "available",
      "dispatched",
      "en_route",
      "at_scene",
      "returning",
      "offline",
    ];

    if (!validStatuses.includes(status)) {
      throw new ApiError(
        400,
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      );
    }

    const update = { status };
    // Clear emergency reference when ambulance becomes available
    if (status === "available") {
      update.currentEmergency = null;
    }

    const ambulance = await Ambulance.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    if (!ambulance) {
      throw new ApiError(404, "Ambulance not found");
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("ambulance:status-change", {
        ambulanceId: ambulance._id,
        status: ambulance.status,
      });
    }

    res.json({ success: true, data: ambulance });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNearestAmbulance,
  getAllAmbulances,
  getUserVisibleAmbulances,
  updateLocation,
  updateAmbulanceStatus,
};
