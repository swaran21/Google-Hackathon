const express = require("express");
const router = express.Router();
const {
  getNearestAmbulance,
  getAllAmbulances,
  getUserVisibleAmbulances,
  updateLocation,
  updateAmbulanceStatus,
} = require("../controllers/ambulanceController");
const { protect, authorize } = require("../middleware/auth");

router.get("/nearest", getNearestAmbulance);
router.get("/", getAllAmbulances);
router.get("/visible", protect, authorize("user"), getUserVisibleAmbulances);
router.patch("/:id/location", updateLocation);
router.patch("/:id/status", updateAmbulanceStatus);

module.exports = router;
