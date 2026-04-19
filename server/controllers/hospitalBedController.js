const Hospital = require('../models/Hospital');
const { ApiError } = require('../middleware/errorHandler');

/**
 * @desc    Update hospital bed/ICU counts (for hospital staff)
 * @route   PATCH /api/hospitals/:id/beds
 */
const updateBeds = async (req, res, next) => {
  try {
    const { availableBeds, icuAvailable } = req.body;

    const update = {};
    if (availableBeds !== undefined) update.availableBeds = parseInt(availableBeds);
    if (icuAvailable !== undefined) update.icuAvailable = parseInt(icuAvailable);

    if (Object.keys(update).length === 0) {
      throw new ApiError(400, 'Provide availableBeds and/or icuAvailable');
    }

    const hospital = await Hospital.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!hospital) throw new ApiError(404, 'Hospital not found');

    // Broadcast bed update in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('hospital:beds-update', {
        hospitalId: hospital._id,
        name: hospital.name,
        availableBeds: hospital.availableBeds,
        totalBeds: hospital.totalBeds,
        icuAvailable: hospital.icuAvailable,
        icuTotal: hospital.icuTotal,
      });
    }

    res.json({ success: true, data: hospital });
  } catch (error) {
    next(error);
  }
};

module.exports = { updateBeds };
