const Hospital = require("../models/Hospital");
const { ApiError } = require("../middleware/errorHandler");

const buildBedUpdate = (payload) => {
  const { availableBeds, icuAvailable } = payload || {};

  const update = {};
  if (availableBeds !== undefined)
    update.availableBeds = parseInt(availableBeds, 10);
  if (icuAvailable !== undefined)
    update.icuAvailable = parseInt(icuAvailable, 10);

  if (Object.keys(update).length === 0) {
    throw new ApiError(400, "Provide availableBeds and/or icuAvailable");
  }

  return update;
};

const emitBedUpdate = (req, hospital) => {
  const io = req.app.get("io");
  if (!io) return;

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
 * @desc    Update hospital bed/ICU counts (for hospital staff)
 * @route   PATCH /api/hospitals/:id/beds
 */
const updateBeds = async (req, res, next) => {
  try {
    const update = buildBedUpdate(req.body);

    const hospital = await Hospital.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    if (!hospital) throw new ApiError(404, "Hospital not found");

    emitBedUpdate(req, hospital);

    res.json({ success: true, data: hospital });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update own hospital bed/ICU counts
 * @route   PATCH /api/hospitals/me/beds
 */
const updateMyBeds = async (req, res, next) => {
  try {
    if (!req.user?.assignedHospital) {
      throw new ApiError(403, "Hospital account is not linked to a hospital");
    }

    const update = buildBedUpdate(req.body);

    const hospital = await Hospital.findByIdAndUpdate(
      req.user.assignedHospital,
      update,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!hospital) {
      throw new ApiError(404, "Hospital not found");
    }

    emitBedUpdate(req, hospital);
    res.json({ success: true, data: hospital });
  } catch (error) {
    next(error);
  }
};

module.exports = { updateBeds, updateMyBeds };
