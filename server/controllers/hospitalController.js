const { suggestHospitals } = require("../services/hospitalService");
const Hospital = require("../models/Hospital");
const Emergency = require("../models/Emergency");
const { ApiError } = require("../middleware/errorHandler");
const { getRouteWithFallback } = require("../services/routingService");

const sanitizeSpecialties = (specialties = []) =>
  Array.isArray(specialties)
    ? specialties.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];

const sanitizeTreatments = (treatments = []) => {
  if (!Array.isArray(treatments)) return [];

  return treatments
    .map((item) => {
      const emergencyTypes = Array.isArray(item?.emergencyTypes)
        ? item.emergencyTypes
        : ["other"];
      const costMin = Number(item?.costMin);
      const costMax = Number(item?.costMax);

      if (
        !item?.name ||
        !Number.isFinite(costMin) ||
        !Number.isFinite(costMax)
      ) {
        return null;
      }

      return {
        name: String(item.name).trim(),
        emergencyTypes,
        costMin,
        costMax,
        currency: String(item.currency || "INR")
          .trim()
          .toUpperCase(),
        notes: String(item.notes || "").trim(),
      };
    })
    .filter(Boolean);
};

const getHospitalIdFromUser = (user) => {
  const hospitalId = user?.assignedHospital;
  if (!hospitalId) {
    throw new ApiError(
      403,
      "Hospital account is not linked to any hospital profile",
    );
  }

  return hospitalId;
};

const hospitalPublicProjection = {
  name: 1,
  email: 1,
  address: 1,
  phone: 1,
  location: 1,
  totalBeds: 1,
  availableBeds: 1,
  icuTotal: 1,
  icuAvailable: 1,
  specialties: 1,
  treatments: 1,
  emergencyDepartment: 1,
  isActive: 1,
  createdAt: 1,
  updatedAt: 1,
};

const DEFAULT_HOSPITAL_REQUEST_STATUSES = [
  "pending",
  "accepted",
  "released",
  "rejected",
];

const hasPoint = (entity) =>
  Array.isArray(entity?.location?.coordinates) &&
  entity.location.coordinates.length === 2;

const buildRequestRoute = async (request, hospital) => {
  if (!hasPoint(request?.assignedAmbulance) || !hasPoint(request)) {
    return null;
  }

  const [ambLng, ambLat] = request.assignedAmbulance.location.coordinates;
  const [emLng, emLat] = request.location.coordinates;
  const [hospLng, hospLat] = hospital?.location?.coordinates || [];

  const isPhase2 =
    request?.status === "at_scene" &&
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

const emitHospitalBedUpdate = (req, hospital) => {
  const io = req.app.get("io");
  if (!io || !hospital) return;

  io.emit("hospital:beds-update", {
    hospitalId: hospital._id,
    name: hospital.name,
    availableBeds: hospital.availableBeds,
    totalBeds: hospital.totalBeds,
    icuAvailable: hospital.icuAvailable,
    icuTotal: hospital.icuTotal,
  });
};

/**
 * @desc    Suggest best hospitals based on location and availability
 * @route   GET /api/hospitals/suggest?lat=&lng=
 */
const suggest = async (req, res, next) => {
  try {
    const { lat, lng, type = "other", radiusKm, limit } = req.query;

    if (!lat || !lng) {
      throw new ApiError(400, "Query params lat and lng are required");
    }

    const parsedRadius = radiusKm !== undefined ? parseFloat(radiusKm) : null;
    const parsedLimit = limit !== undefined ? parseInt(limit, 10) : undefined;

    const results = await suggestHospitals(
      parseFloat(lat),
      parseFloat(lng),
      type,
      {
        radiusKm: Number.isFinite(parsedRadius) ? parsedRadius : null,
        limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      },
    );

    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all hospitals
 * @route   GET /api/hospitals
 */
const getAllHospitals = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find();
    res.json({ success: true, count: hospitals.length, data: hospitals });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged-in hospital profile
 * @route   GET /api/hospitals/me/profile
 */
const getMyHospitalProfile = async (req, res, next) => {
  try {
    const hospitalId = getHospitalIdFromUser(req.user);
    const hospital = await Hospital.findById(
      hospitalId,
      hospitalPublicProjection,
    );

    if (!hospital) {
      throw new ApiError(404, "Hospital profile not found");
    }

    res.json({ success: true, data: hospital });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update logged-in hospital profile details
 * @route   PATCH /api/hospitals/me/profile
 */
const updateMyHospitalProfile = async (req, res, next) => {
  try {
    const hospitalId = getHospitalIdFromUser(req.user);
    const {
      name,
      email,
      address,
      phone,
      latitude,
      longitude,
      totalBeds,
      availableBeds,
      icuTotal,
      icuAvailable,
      specialties,
      emergencyDepartment,
      isActive,
    } = req.body;

    const update = {};

    if (name !== undefined) update.name = String(name || "").trim();
    if (email !== undefined)
      update.email = String(email || "")
        .trim()
        .toLowerCase();
    if (address !== undefined) update.address = String(address || "").trim();
    if (phone !== undefined) update.phone = String(phone || "").trim();
    if (totalBeds !== undefined) update.totalBeds = Number(totalBeds);
    if (availableBeds !== undefined)
      update.availableBeds = Number(availableBeds);
    if (icuTotal !== undefined) update.icuTotal = Number(icuTotal);
    if (icuAvailable !== undefined) update.icuAvailable = Number(icuAvailable);
    if (specialties !== undefined)
      update.specialties = sanitizeSpecialties(specialties);
    if (emergencyDepartment !== undefined) {
      update.emergencyDepartment = Boolean(emergencyDepartment);
    }
    if (isActive !== undefined) update.isActive = Boolean(isActive);

    if (latitude !== undefined && longitude !== undefined) {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new ApiError(400, "latitude and longitude must be valid numbers");
      }

      update.location = {
        type: "Point",
        coordinates: [lng, lat],
      };
    } else if (latitude !== undefined || longitude !== undefined) {
      throw new ApiError(
        400,
        "Both latitude and longitude are required to update location",
      );
    }

    if (update.totalBeds !== undefined && update.totalBeds < 0) {
      throw new ApiError(400, "totalBeds cannot be negative");
    }
    if (update.availableBeds !== undefined && update.availableBeds < 0) {
      throw new ApiError(400, "availableBeds cannot be negative");
    }
    if (update.icuTotal !== undefined && update.icuTotal < 0) {
      throw new ApiError(400, "icuTotal cannot be negative");
    }
    if (update.icuAvailable !== undefined && update.icuAvailable < 0) {
      throw new ApiError(400, "icuAvailable cannot be negative");
    }

    const hospital = await Hospital.findByIdAndUpdate(hospitalId, update, {
      new: true,
      runValidators: true,
    }).select(hospitalPublicProjection);

    if (!hospital) {
      throw new ApiError(404, "Hospital profile not found");
    }

    res.json({ success: true, data: hospital });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Replace logged-in hospital treatment catalog
 * @route   PUT /api/hospitals/me/treatments
 */
const replaceMyTreatments = async (req, res, next) => {
  try {
    const hospitalId = getHospitalIdFromUser(req.user);
    const treatments = sanitizeTreatments(req.body?.treatments);

    if (!Array.isArray(req.body?.treatments)) {
      throw new ApiError(400, "treatments must be an array");
    }

    const hospital = await Hospital.findByIdAndUpdate(
      hospitalId,
      { treatments },
      { new: true, runValidators: true },
    ).select(hospitalPublicProjection);

    if (!hospital) {
      throw new ApiError(404, "Hospital profile not found");
    }

    res.json({ success: true, data: hospital });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add one treatment to logged-in hospital catalog
 * @route   POST /api/hospitals/me/treatments
 */
const addMyTreatment = async (req, res, next) => {
  try {
    const hospitalId = getHospitalIdFromUser(req.user);
    const [treatment] = sanitizeTreatments([req.body]);

    if (!treatment) {
      throw new ApiError(400, "Valid treatment payload is required");
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(404, "Hospital profile not found");
    }

    hospital.treatments.push(treatment);
    await hospital.save();

    res.status(201).json({ success: true, data: hospital });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove one treatment from logged-in hospital catalog
 * @route   DELETE /api/hospitals/me/treatments/:treatmentId
 */
const removeMyTreatment = async (req, res, next) => {
  try {
    const hospitalId = getHospitalIdFromUser(req.user);
    const { treatmentId } = req.params;

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(404, "Hospital profile not found");
    }

    const treatment = hospital.treatments.id(treatmentId);
    if (!treatment) {
      throw new ApiError(404, "Treatment not found");
    }

    treatment.deleteOne();
    await hospital.save();

    res.json({ success: true, data: hospital });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged-in hospital dashboard (own hospital only)
 * @route   GET /api/hospitals/me/dashboard
 */
const getMyHospitalDashboard = async (req, res, next) => {
  try {
    const hospitalId = getHospitalIdFromUser(req.user);
    const statusFilter = req.query?.status;
    const requestStatuses = statusFilter
      ? [String(statusFilter)]
      : DEFAULT_HOSPITAL_REQUEST_STATUSES;

    const hospital = await Hospital.findById(hospitalId).select(
      hospitalPublicProjection,
    );
    if (!hospital) {
      throw new ApiError(404, "Hospital profile not found");
    }

    const emergencyRequests = await Emergency.find({
      assignedHospital: hospitalId,
      "hospitalRequest.status": { $in: requestStatuses },
    })
      .sort({ updatedAt: -1 })
      .populate("assignedAmbulance")
      .populate("reportedBy", "name email phone role")
      .lean();

    const requestsWithRoute = await Promise.all(
      emergencyRequests.map(async (entry) => ({
        ...entry,
        activeRoute: await buildRequestRoute(entry, hospital),
      })),
    );

    const summary = {
      pending: requestsWithRoute.filter(
        (entry) => entry?.hospitalRequest?.status === "pending",
      ).length,
      accepted: requestsWithRoute.filter(
        (entry) => entry?.hospitalRequest?.status === "accepted",
      ).length,
      released: requestsWithRoute.filter(
        (entry) => entry?.hospitalRequest?.status === "released",
      ).length,
      rejected: requestsWithRoute.filter(
        (entry) => entry?.hospitalRequest?.status === "rejected",
      ).length,
      total: requestsWithRoute.length,
    };

    res.json({
      success: true,
      data: {
        hospital,
        requests: requestsWithRoute,
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept or reject a bed request for an emergency in this hospital
 * @route   PATCH /api/hospitals/me/requests/:emergencyId/decision
 */
const decideEmergencyBedRequest = async (req, res, next) => {
  try {
    const hospitalId = getHospitalIdFromUser(req.user);
    const { emergencyId } = req.params;
    const { decision, note = "" } = req.body;

    if (!["accepted", "rejected"].includes(decision)) {
      throw new ApiError(
        400,
        "decision must be either 'accepted' or 'rejected'",
      );
    }

    const emergency = await Emergency.findOne({
      _id: emergencyId,
      assignedHospital: hospitalId,
    })
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    if (!emergency) {
      throw new ApiError(404, "Emergency request not found for this hospital");
    }

    if (emergency.hospitalRequest?.status !== "pending") {
      throw new ApiError(
        400,
        `Only pending requests can be processed (current: ${emergency.hospitalRequest?.status || "unknown"})`,
      );
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(404, "Hospital profile not found");
    }

    const requiredBedType =
      emergency.hospitalRequest?.requiredBedType ||
      (emergency.severity >= 4 ? "icu" : "general");

    let allocatedGeneralBeds = 0;
    let allocatedIcuBeds = 0;

    if (decision === "accepted") {
      if (requiredBedType === "icu") {
        if (hospital.icuAvailable < 1) {
          throw new ApiError(
            409,
            "No ICU beds currently available to accept this request",
          );
        }

        hospital.icuAvailable -= 1;
        allocatedIcuBeds = 1;
      } else {
        if (hospital.availableBeds < 1) {
          throw new ApiError(
            409,
            "No general beds currently available to accept this request",
          );
        }

        hospital.availableBeds -= 1;
        allocatedGeneralBeds = 1;
      }

      emergency.hospitalRequest.status = "accepted";
      emergency.hospitalRequest.respondedAt = new Date();
      emergency.hospitalRequest.decisionNote = String(note || "").trim();
      emergency.hospitalRequest.allocatedGeneralBeds = allocatedGeneralBeds;
      emergency.hospitalRequest.allocatedIcuBeds = allocatedIcuBeds;
      emergency.ambulanceBooking.status = "ready_to_book";
      emergency.chatThread.push({
        senderRole: "hospital",
        senderName: hospital.name,
        message:
          "Hospital accepted the bed request. Patient can now book an ambulance.",
      });

      await hospital.save();
    } else {
      emergency.hospitalRequest.status = "rejected";
      emergency.hospitalRequest.respondedAt = new Date();
      emergency.hospitalRequest.decisionNote = String(note || "").trim();
      emergency.hospitalRequest.allocatedGeneralBeds = 0;
      emergency.hospitalRequest.allocatedIcuBeds = 0;
      emergency.ambulanceBooking.status = "not_ready";
      emergency.assignedHospital = null;
      emergency.chatThread.push({
        senderRole: "hospital",
        senderName: hospital.name,
        message:
          "Hospital rejected the bed request. Please select another hospital.",
      });
    }

    await emergency.save();

    const populatedEmergency = await Emergency.findById(emergency._id)
      .populate("assignedAmbulance")
      .populate("assignedHospital")
      .populate("reportedBy", "name email phone role");

    const io = req.app.get("io");
    if (io) {
      if (decision === "accepted") {
        emitHospitalBedUpdate(req, hospital);
      }

      io.to(`hospital:${hospitalId}`).emit("hospital:request-update", {
        hospitalId,
        emergencyId: populatedEmergency._id,
        decision,
        emergency: populatedEmergency,
      });

      if (populatedEmergency.reportedBy?._id) {
        io.to(`user:${populatedEmergency.reportedBy._id}`).emit(
          "emergency:hospital-decision",
          {
            emergencyId: populatedEmergency._id,
            decision,
            canBookAmbulance: decision === "accepted",
            hospitalId,
            hospitalName: hospital.name,
            note: String(note || "").trim(),
          },
        );
      }

      io.to(`emergency:${populatedEmergency._id}`).emit(
        "emergency:hospital-decision",
        {
          emergencyId: populatedEmergency._id,
          decision,
          canBookAmbulance: decision === "accepted",
          hospitalId,
          hospitalName: hospital.name,
          note: String(note || "").trim(),
        },
      );
    }

    res.json({
      success: true,
      data: {
        emergency: populatedEmergency,
        hospital,
        decision,
        canBookAmbulance: decision === "accepted",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Release allocated beds for an emergency in this hospital
 * @route   PATCH /api/hospitals/me/requests/:emergencyId/release
 */
const releaseEmergencyBeds = async (req, res, next) => {
  try {
    const hospitalId = getHospitalIdFromUser(req.user);
    const { emergencyId } = req.params;
    const { generalBeds, icuBeds, note = "" } = req.body;

    const emergency = await Emergency.findOne({
      _id: emergencyId,
      assignedHospital: hospitalId,
    })
      .populate("assignedAmbulance")
      .populate("assignedHospital")
      .populate("reportedBy", "name email phone role");

    if (!emergency) {
      throw new ApiError(404, "Emergency request not found for this hospital");
    }

    if (!["accepted", "released"].includes(emergency.hospitalRequest?.status)) {
      throw new ApiError(
        400,
        "Beds can only be released for accepted/released hospital requests",
      );
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(404, "Hospital profile not found");
    }

    const currentGeneral = Number(
      emergency.hospitalRequest?.allocatedGeneralBeds || 0,
    );
    const currentIcu = Number(emergency.hospitalRequest?.allocatedIcuBeds || 0);

    const releaseGeneral =
      generalBeds === undefined
        ? currentGeneral
        : Math.max(0, Number.parseInt(generalBeds, 10) || 0);
    const releaseIcu =
      icuBeds === undefined
        ? currentIcu
        : Math.max(0, Number.parseInt(icuBeds, 10) || 0);

    const effectiveGeneral = Math.min(currentGeneral, releaseGeneral);
    const effectiveIcu = Math.min(currentIcu, releaseIcu);

    hospital.availableBeds = Math.min(
      hospital.totalBeds,
      hospital.availableBeds + effectiveGeneral,
    );
    hospital.icuAvailable = Math.min(
      hospital.icuTotal,
      hospital.icuAvailable + effectiveIcu,
    );

    emergency.hospitalRequest.allocatedGeneralBeds = Math.max(
      0,
      currentGeneral - effectiveGeneral,
    );
    emergency.hospitalRequest.allocatedIcuBeds = Math.max(
      0,
      currentIcu - effectiveIcu,
    );
    emergency.hospitalRequest.releasedAt = new Date();
    emergency.hospitalRequest.decisionNote = String(note || "").trim();

    const hasRemainingBeds =
      emergency.hospitalRequest.allocatedGeneralBeds > 0 ||
      emergency.hospitalRequest.allocatedIcuBeds > 0;
    emergency.hospitalRequest.status = hasRemainingBeds
      ? "accepted"
      : "released";

    emergency.chatThread.push({
      senderRole: "hospital",
      senderName: hospital.name,
      message: hasRemainingBeds
        ? "Hospital partially released allocated beds for this patient."
        : "Hospital released all allocated beds for this patient.",
    });

    await hospital.save();
    await emergency.save();

    emitHospitalBedUpdate(req, hospital);

    const io = req.app.get("io");
    if (io) {
      io.to(`hospital:${hospitalId}`).emit("hospital:request-update", {
        hospitalId,
        emergencyId: emergency._id,
        status: emergency.hospitalRequest.status,
        emergency,
        releasedBeds: {
          generalBeds: effectiveGeneral,
          icuBeds: effectiveIcu,
        },
      });

      if (emergency.reportedBy?._id) {
        io.to(`user:${emergency.reportedBy._id}`).emit(
          "emergency:hospital-release",
          {
            emergencyId: emergency._id,
            status: emergency.hospitalRequest.status,
            releasedBeds: {
              generalBeds: effectiveGeneral,
              icuBeds: effectiveIcu,
            },
          },
        );
      }
    }

    res.json({
      success: true,
      data: {
        emergency,
        hospital,
        releasedBeds: {
          generalBeds: effectiveGeneral,
          icuBeds: effectiveIcu,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  suggest,
  getAllHospitals,
  getMyHospitalProfile,
  updateMyHospitalProfile,
  replaceMyTreatments,
  addMyTreatment,
  removeMyTreatment,
  getMyHospitalDashboard,
  decideEmergencyBedRequest,
  releaseEmergencyBeds,
};
