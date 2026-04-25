const Emergency = require("../models/Emergency");
const Ambulance = require("../models/Ambulance");
const Hospital = require("../models/Hospital");
const {
  findBestAmbulanceForTransfer,
  assignAmbulance,
} = require("../services/dispatchService");
const { suggestHospitals } = require("../services/hospitalService");
const { classifyEmergency } = require("../services/triageService");
const { notifyDispatch } = require("../services/notificationService");
const { getRouteWithFallback, getFullRoute } = require("../services/routingService");
const { ApiError } = require("../middleware/errorHandler");

const HOSPITAL_RADIUS_KM = 5;
const HOSPITAL_LIMIT = 10;
const ACTIVE_USER_STATUSES = ["pending", "dispatched", "en_route", "at_scene"];

const getBedRequirementFromSeverity = (severity = 3) => {
  if (severity >= 4) {
    return { requiredBedType: "icu", generalBeds: 0, icuBeds: 1 };
  }

  return { requiredBedType: "general", generalBeds: 1, icuBeds: 0 };
};

const isEmergencyOwner = (emergency, userId) => {
  if (!emergency?.reportedBy || !userId) return false;
  return emergency.reportedBy.toString() === userId.toString();
};

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
      vitals,
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

    const triage = classifyEmergency(type, description, { vitals });
    const bedRequirement = getBedRequirementFromSeverity(triage.severity);

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
      hospitalRequest: {
        status: "not_requested",
        requiredBedType: bedRequirement.requiredBedType,
      },
      ambulanceBooking: {
        status: "not_ready",
      },
      chatThread: [
        {
          senderRole: "system",
          senderName: "ResQNet",
          message: "Emergency created. Select a hospital to request a bed.",
        },
      ],
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
        requiresHospitalApproval: false,
        canBookAmbulance: false,
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
 * @desc    User selects a hospital and creates a bed request for hospital approval
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

    if (!isEmergencyOwner(emergency, req.user?._id)) {
      throw new ApiError(403, "You can only manage your own emergency");
    }

    if (["resolved", "cancelled"].includes(emergency.status)) {
      throw new ApiError(
        400,
        "Cannot request hospital for resolved or cancelled emergency",
      );
    }

    if (emergency.assignedAmbulance) {
      throw new ApiError(
        400,
        "Ambulance already booked for this emergency. Cancel first to re-select hospital.",
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

    const bedRequirement = getBedRequirementFromSeverity(emergency.severity);

    emergency.assignedHospital = selected.hospital._id;
    emergency.hospitalRequest = {
      status: "pending",
      requiredBedType: bedRequirement.requiredBedType,
      requestedAt: new Date(),
      respondedAt: null,
      releasedAt: null,
      decisionNote: "",
      allocatedGeneralBeds: 0,
      allocatedIcuBeds: 0,
    };
    emergency.ambulanceBooking = {
      status: "not_ready",
      bookedAt: null,
    };
    emergency.eta = null;
    emergency.chatThread.push({
      senderRole: "system",
      senderName: "ResQNet",
      message: `Bed request sent to ${selected.hospital.name}. Waiting for hospital approval.`,
    });
    await emergency.save();

    const populated = await Emergency.findById(emergency._id)
      .populate("assignedHospital")
      .populate("assignedAmbulance");

    const io = req.app.get("io");
    if (io) {
      const eventPayload = {
        hospitalId: selected.hospital._id,
        emergencyId: populated._id,
        emergency: populated,
        requiredBedType: bedRequirement.requiredBedType,
        triage: buildTriageSummary(populated),
      };

      io.to(`hospital:${selected.hospital._id}`).emit(
        "hospital:bed-request",
        eventPayload,
      );
      io.to(`user:${req.user._id}`).emit("emergency:hospital-requested", {
        emergencyId: populated._id,
        hospitalId: selected.hospital._id,
        hospitalName: selected.hospital.name,
        requestStatus: "pending",
      });
      io.to(`emergency:${populated._id}`).emit(
        "hospital:bed-request",
        eventPayload,
      );
    }

    res.json({
      success: true,
      data: {
        emergency: populated,
        triage: buildTriageSummary(populated),
        ambulance: null,
        suggestedHospitals: hospitals,
        selectedHospital: selected,
        requiresHospitalSelection: false,
        requiresHospitalApproval: true,
        canBookAmbulance: false,
        route: null,
        fullRoute: null,
        notifications: [],
        message: "Hospital request sent. Waiting for hospital confirmation.",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Book ambulance after hospital accepts bed request
 * @route   POST /api/emergency/:id/book-ambulance
 */
const bookAmbulanceAfterHospitalApproval = async (req, res, next) => {
  try {
    const emergency = await Emergency.findById(req.params.id)
      .populate("assignedHospital")
      .populate("assignedAmbulance");

    if (!emergency) {
      throw new ApiError(404, "Emergency not found");
    }

    if (!isEmergencyOwner(emergency, req.user?._id)) {
      throw new ApiError(
        403,
        "You can only book ambulance for your own emergency",
      );
    }

    if (["resolved", "cancelled"].includes(emergency.status)) {
      throw new ApiError(
        400,
        "Cannot book ambulance for resolved or cancelled emergency",
      );
    }

    if (emergency.hospitalRequest?.status !== "accepted") {
      throw new ApiError(400, "Hospital has not accepted your bed request yet");
    }

    if (!emergency.assignedHospital) {
      throw new ApiError(400, "No hospital assigned for this emergency");
    }

    if (emergency.assignedAmbulance) {
      return res.json({
        success: true,
        data: {
          emergency,
          triage: buildTriageSummary(emergency),
          ambulance: emergency.assignedAmbulance,
          selectedHospital: { hospital: emergency.assignedHospital },
          requiresHospitalSelection: false,
          requiresHospitalApproval: false,
          canBookAmbulance: false,
          message: "Ambulance already booked for this emergency.",
        },
      });
    }

    const [patientLng, patientLat] = emergency.location.coordinates;
    const [hospitalLng, hospitalLat] =
      emergency.assignedHospital.location.coordinates;

    const ambulanceMatch = await findBestAmbulanceForTransfer(
      patientLat,
      patientLng,
      hospitalLat,
      hospitalLng,
      emergency.triageResult?.recommendedEquipment || "basic",
    );

    if (!ambulanceMatch) {
      emergency.ambulanceBooking = {
        status: "ready_to_book",
        bookedAt: null,
      };
      await emergency.save();

      return res.json({
        success: true,
        data: {
          emergency,
          triage: buildTriageSummary(emergency),
          ambulance: null,
          selectedHospital: { hospital: emergency.assignedHospital },
          requiresHospitalSelection: false,
          requiresHospitalApproval: false,
          canBookAmbulance: true,
          route: null,
          fullRoute: null,
          notifications: [],
          message:
            "No ambulance available right now. Please retry booking in a few moments.",
        },
      });
    }

    let assignedEmergency = await assignAmbulance(
      emergency._id,
      ambulanceMatch.ambulance._id,
      ambulanceMatch.eta,
    );

    const [ambLng, ambLat] = ambulanceMatch.ambulance.location.coordinates;
    const routeResult = await getRouteWithFallback(
      ambLat,
      ambLng,
      patientLat,
      patientLng,
    );
    const routeData = routeResult?.route;

    if (routeData?.duration) {
      assignedEmergency.eta = routeData.duration;
    }
    assignedEmergency.ambulanceBooking = {
      status: "booked",
      bookedAt: new Date(),
    };
    assignedEmergency.chatThread.push({
      senderRole: "system",
      senderName: "ResQNet",
      message: `Ambulance ${ambulanceMatch.ambulance.vehicleNumber} booked and dispatched.`,
    });
    await assignedEmergency.save();

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
      emergency.assignedHospital,
    );

    const populated = await Emergency.findById(assignedEmergency._id)
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    const io = req.app.get("io");
    if (io) {
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

      if (populated.assignedHospital?._id) {
        io.to(`hospital:${populated.assignedHospital._id}`).emit(
          "hospital:request-update",
          {
            hospitalId: populated.assignedHospital._id,
            emergencyId: populated._id,
            emergency: populated,
          },
        );
      }

      io.to(`user:${req.user._id}`).emit("emergency:ambulance-booked", {
        emergencyId: populated._id,
        ambulance: populated.assignedAmbulance,
      });
      io.to(`emergency:${populated._id}`).emit("emergency:ambulance-booked", {
        emergencyId: populated._id,
        ambulance: populated.assignedAmbulance,
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
        selectedHospital: { hospital: populated.assignedHospital },
        requiresHospitalSelection: false,
        requiresHospitalApproval: false,
        canBookAmbulance: false,
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
 * @desc    Get current user's latest active emergency
 * @route   GET /api/emergency/mine/active
 */
const getMyActiveEmergency = async (req, res, next) => {
  try {
    const emergency = await Emergency.findOne({
      reportedBy: req.user._id,
      status: { $in: ACTIVE_USER_STATUSES },
    })
      .sort({ createdAt: -1 })
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    res.json({ success: true, data: emergency });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all emergencies for current user
 * @route   GET /api/emergency/mine
 */
const getMyEmergencies = async (req, res, next) => {
  try {
    const emergencies = await Emergency.find({
      reportedBy: req.user._id,
    })
      .sort({ createdAt: -1 })
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    res.json({ success: true, data: emergencies });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all emergencies assigned to the driver's ambulance
 * @route   GET /api/emergency/driver/mine
 */
const getDriverEmergencies = async (req, res, next) => {
  try {
    if (!req.user.assignedAmbulance) {
      return res.status(400).json({
        success: false,
        message: "No ambulance assigned to this driver",
      });
    }

    const emergencies = await Emergency.find({
      assignedAmbulance: req.user.assignedAmbulance,
    })
      .sort({ createdAt: -1 })
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    res.json({ success: true, data: emergencies });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel current user's emergency and release assigned ambulance
 * @route   POST /api/emergency/:id/cancel
 */
const cancelEmergencyRequest = async (req, res, next) => {
  try {
    const emergency = await Emergency.findById(req.params.id)
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    if (!emergency) {
      throw new ApiError(404, "Emergency not found");
    }

    if (!isEmergencyOwner(emergency, req.user?._id)) {
      throw new ApiError(403, "You can only cancel your own emergency");
    }

    if (["resolved", "cancelled"].includes(emergency.status)) {
      throw new ApiError(
        400,
        `Emergency is already ${emergency.status} and cannot be cancelled`,
      );
    }

    let releasedAmbulance = null;
    if (emergency.assignedAmbulance?._id) {
      releasedAmbulance = await Ambulance.findByIdAndUpdate(
        emergency.assignedAmbulance._id,
        {
          status: "available",
          currentEmergency: null,
        },
        { new: true },
      );
    }

    const previousHospitalId = emergency.assignedHospital?._id?.toString();
    let releasedHospital = null;
    let releasedBeds = { generalBeds: 0, icuBeds: 0 };

    if (
      previousHospitalId &&
      emergency.hospitalRequest?.status === "accepted"
    ) {
      const generalBeds = Number(
        emergency.hospitalRequest.allocatedGeneralBeds || 0,
      );
      const icuBeds = Number(emergency.hospitalRequest.allocatedIcuBeds || 0);

      if (generalBeds > 0 || icuBeds > 0) {
        const hospital = await Hospital.findById(previousHospitalId);
        if (hospital) {
          hospital.availableBeds = Math.min(
            hospital.totalBeds,
            hospital.availableBeds + generalBeds,
          );
          hospital.icuAvailable = Math.min(
            hospital.icuTotal,
            hospital.icuAvailable + icuBeds,
          );
          await hospital.save();
          releasedHospital = hospital;
          releasedBeds = { generalBeds, icuBeds };
        }
      }

      emergency.hospitalRequest.status = "released";
      emergency.hospitalRequest.releasedAt = new Date();
      emergency.hospitalRequest.allocatedGeneralBeds = 0;
      emergency.hospitalRequest.allocatedIcuBeds = 0;
      emergency.hospitalRequest.decisionNote =
        emergency.hospitalRequest.decisionNote ||
        "Released automatically due to patient cancellation";
    }

    emergency.status = "cancelled";
    emergency.assignedAmbulance = null;
    emergency.assignedHospital = null;
    emergency.ambulanceBooking = {
      status: "cancelled",
      bookedAt: emergency.ambulanceBooking?.bookedAt || null,
    };
    emergency.eta = null;
    emergency.chatThread.push({
      senderRole: "system",
      senderName: "ResQNet",
      message: "Emergency request cancelled by patient.",
    });
    await emergency.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("emergency:status-change", {
        emergencyId: emergency._id,
        status: emergency.status,
      });

      if (releasedAmbulance) {
        io.emit("ambulance:status-change", {
          ambulanceId: releasedAmbulance._id,
          status: releasedAmbulance.status,
        });
      }

      io.emit("emergency:cancelled", {
        emergencyId: emergency._id,
        releasedAmbulanceId: releasedAmbulance?._id || null,
      });

      if (releasedHospital) {
        io.emit("hospital:beds-update", {
          hospitalId: releasedHospital._id,
          name: releasedHospital.name,
          availableBeds: releasedHospital.availableBeds,
          totalBeds: releasedHospital.totalBeds,
          icuAvailable: releasedHospital.icuAvailable,
          icuTotal: releasedHospital.icuTotal,
        });
      }

      if (previousHospitalId) {
        io.to(`hospital:${previousHospitalId}`).emit(
          "hospital:request-update",
          {
            hospitalId: previousHospitalId,
            emergencyId: emergency._id,
            status: "cancelled",
            releasedBeds,
          },
        );
      }

      io.to(`user:${req.user._id}`).emit("emergency:cancelled", {
        emergencyId: emergency._id,
        releasedAmbulanceId: releasedAmbulance?._id || null,
      });
    }

    res.json({
      success: true,
      data: {
        emergency,
        releasedAmbulance,
        releasedHospital,
        releasedBeds,
      },
      message: "Emergency request cancelled successfully",
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

    if (
      req.user?.role === "user" &&
      !isEmergencyOwner(emergency, req.user._id)
    ) {
      throw new ApiError(403, "You can only view your own emergency");
    }

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

    const existingEmergency = await Emergency.findById(req.params.id);
    if (!existingEmergency) throw new ApiError(404, "Emergency not found");

    if (
      req.user?.role === "user" &&
      !isEmergencyOwner(existingEmergency, req.user._id)
    ) {
      throw new ApiError(403, "You can only update your own emergency");
    }

    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    )
      .populate("assignedAmbulance")
      .populate("assignedHospital");

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
  bookAmbulanceAfterHospitalApproval,
  getMyActiveEmergency,
  getMyEmergencies,
  getDriverEmergencies,
  cancelEmergencyRequest,
  getEmergency,
  updateStatus,
};
