const { suggestHospitals } = require("../services/hospitalService");
const Hospital = require("../models/Hospital");
const { ApiError } = require("../middleware/errorHandler");

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

module.exports = {
  suggest,
  getAllHospitals,
  getMyHospitalProfile,
  updateMyHospitalProfile,
  replaceMyTreatments,
  addMyTreatment,
  removeMyTreatment,
};
