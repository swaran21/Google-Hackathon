const Emergency = require("../models/Emergency");
const {
  findBestAmbulanceForTransfer,
  assignAmbulance,
} = require("../services/dispatchService");
const { suggestHospitals } = require("../services/hospitalService");
const { classifyEmergency } = require("../services/triageService");
const { notifyDispatch } = require("../services/notificationService");
const { getRoute, getFullRoute } = require("../services/routingService");
const { ApiError } = require("../middleware/errorHandler");

const HOSPITAL_RADIUS_KM = 5;
const HOSPITAL_LIMIT = 10;

const buildTriageSummary = (emergency) => ({
  severity: emergency.severity,
  severityLabel: emergency.triageResult?.severityLabel || "",
  confidence: emergency.triageResult?.confidence || 0,
  reasoning: emergency.triageResult?.reasoning || "",
  responseLevel: emergency.triageResult?.responseLevel || "",
  recommendedEquipment: emergency.triageResult?.recommendedEquipment || "basic",
  matchedIndicators: emergency.triageResult?.matchedIndicators || [],
  aiModel: emergency.triageResult?.aiModel || "",
});

/**
 * @desc    Create emergency and return hospitals in 5km for user selection
 * @route   POST /api/emergency
 */
const createEmergency = async (req, res, next) => {
  try {
    const {
      type,
      latitude,
      longitude,
      description,
      patientName,
      patientPhone,
    } = req.body;

    if (!type || !latitude || !longitude || !patientName || !patientPhone) {
      throw new ApiError(
        400,
        "Missing required fields: type, latitude, longitude, patientName, patientPhone",
      );
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new ApiError(400, "latitude and longitude must be valid numbers");
    }

    const triage = classifyEmergency(type, description);

    const emergency = await Emergency.create({
      type,
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
      description: description || "",
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
        aiModel: triage.aiModel || "",
      },
    });

    const hospitals = await suggestHospitals(lat, lng, type, {
      radiusKm: HOSPITAL_RADIUS_KM,
      limit: HOSPITAL_LIMIT,
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("emergency:new", {
        emergency,
        triage,
        suggestedHospitals: hospitals,
        awaitingHospitalSelection: true,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        emergency,
        triage,
        ambulance: null,
        suggestedHospitals: hospitals,
        recommendedHospital: hospitals[0] || null,
        requiresHospitalSelection: true,
        searchRadiusKm: HOSPITAL_RADIUS_KM,
        route: null,
        fullRoute: null,
        notifications: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    User selects a hospital, then system assigns nearest ambulance
 * @route   POST /api/emergency/:id/select-hospital
 */
const selectHospitalAndDispatch = async (req, res, next) => {
  try {
    const { hospitalId } = req.body;
    if (!hospitalId) {
      throw new ApiError(400, "hospitalId is required");
    }

    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) {
      throw new ApiError(404, "Emergency not found");
    }

    if (["resolved", "cancelled"].includes(emergency.status)) {
      throw new ApiError(
        400,
        "Cannot dispatch for resolved or cancelled emergency",
      );
    }

    const [patientLng, patientLat] = emergency.location.coordinates;
    const hospitals = await suggestHospitals(
      patientLat,
      patientLng,
      emergency.type,
      {
        radiusKm: HOSPITAL_RADIUS_KM,
        limit: HOSPITAL_LIMIT,
      },
    );

    if (hospitals.length === 0) {
      throw new ApiError(
        404,
        `No hospitals found within ${HOSPITAL_RADIUS_KM} km`,
      );
    }

    const selected = hospitals.find(
      (entry) => entry.hospital._id.toString() === hospitalId.toString(),
    );

    if (!selected) {
      throw new ApiError(
        400,
        `Selected hospital must be within ${HOSPITAL_RADIUS_KM} km and have an active emergency department`,
      );
    }

    emergency.assignedHospital = selected.hospital._id;
    await emergency.save();

    const [hospitalLng, hospitalLat] = selected.hospital.location.coordinates;
    const ambulanceMatch = await findBestAmbulanceForTransfer(
      patientLat,
      patientLng,
      hospitalLat,
      hospitalLng,
      emergency.triageResult?.recommendedEquipment || "basic",
    );

    if (!ambulanceMatch) {
      const populatedNoAmbulance = await Emergency.findById(emergency._id)
        .populate("assignedHospital")
        .populate("assignedAmbulance");

      return res.json({
        success: true,
        data: {
          emergency: populatedNoAmbulance,
          triage: buildTriageSummary(emergency),
          ambulance: null,
          suggestedHospitals: hospitals,
          selectedHospital: selected,
          route: null,
          fullRoute: null,
          notifications: [],
          message: "Hospital selected. Waiting for available ambulance.",
        },
      });
    }

    let assignedEmergency = await assignAmbulance(
      emergency._id,
      ambulanceMatch.ambulance._id,
      ambulanceMatch.eta,
    );

    const [ambLng, ambLat] = ambulanceMatch.ambulance.location.coordinates;
    const routeData = await getRoute(ambLat, ambLng, patientLat, patientLng);

    if (routeData?.duration) {
      assignedEmergency.eta = routeData.duration;
      await assignedEmergency.save();
    }

    const fullRoute = await getFullRoute(
      ambLat,
      ambLng,
      patientLat,
      patientLng,
      hospitalLat,
      hospitalLng,
    );

    const notifications = notifyDispatch(
      assignedEmergency,
      ambulanceMatch.ambulance,
      routeData?.duration || ambulanceMatch.eta,
      selected.hospital,
    );

    const populated = await Emergency.findById(assignedEmergency._id)
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    const io = req.app.get("io");
    if (io) {
      io.emit("hospital:incoming-emergency", {
        hospitalId: selected.hospital._id,
        emergencyId: populated._id,
        severity: populated.severity,
      });

      io.emit("ambulance:assigned", {
        emergencyId: populated._id,
        ambulance: ambulanceMatch.ambulance,
        eta: routeData?.duration || ambulanceMatch.eta,
        distance: routeData?.distance || ambulanceMatch.distanceToPatient,
      });

      io.emit("emergency:status-change", {
        emergencyId: populated._id,
        status: populated.status,
      });
    }

    res.json({
      success: true,
      data: {
        emergency: populated,
        triage: buildTriageSummary(populated),
        ambulance: {
          ...ambulanceMatch.ambulance.toObject(),
          distance: routeData?.distance || ambulanceMatch.distanceToPatient,
          totalMissionDistance:
            fullRoute?.totalDistance || ambulanceMatch.totalDistance,
          eta: routeData?.duration || ambulanceMatch.eta,
        },
        suggestedHospitals: hospitals,
        selectedHospital: selected,
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
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    if (!emergency) throw new ApiError(404, "Emergency not found");

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
    const validStatuses = [
      "pending",
      "dispatched",
      "en_route",
      "at_scene",
      "resolved",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      throw new ApiError(
        400,
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      );
    }

    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    )
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    if (!emergency) throw new ApiError(404, "Emergency not found");

    const io = req.app.get("io");
    if (io) {
      io.emit("emergency:status-change", {
        emergencyId: emergency._id,
        status,
      });
    }

    res.json({ success: true, data: emergency });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEmergency,
  selectHospitalAndDispatch,
  getEmergency,
  updateStatus,
};
