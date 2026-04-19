const { suggestHospitals } = require("../services/hospitalService");
const Hospital = require("../models/Hospital");
const { ApiError } = require("../middleware/errorHandler");

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

module.exports = { suggest, getAllHospitals };
