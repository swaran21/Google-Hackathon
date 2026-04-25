const express = require("express");
const router = express.Router();
const {
  createEmergency,
  selectHospitalAndDispatch,
  bookAmbulanceAfterHospitalApproval,
  getMyActiveEmergency,
  getMyEmergencies,
  getDriverEmergencies,
  cancelEmergencyRequest,
  getEmergency,
  updateStatus,
} = require("../controllers/emergencyController");
const { protect, authorize } = require("../middleware/auth");

router.post("/", protect, authorize("user"), createEmergency);
router.get("/mine", protect, authorize("user"), getMyEmergencies);
router.get("/mine/active", protect, authorize("user"), getMyActiveEmergency);
router.get("/driver/mine", protect, authorize("driver"), getDriverEmergencies);
router.post(
  "/:id/select-hospital",
  protect,
  authorize("user"),
  selectHospitalAndDispatch,
);
router.post(
  "/:id/book-ambulance",
  protect,
  authorize("user"),
  bookAmbulanceAfterHospitalApproval,
);
router.post("/:id/cancel", protect, authorize("user"), cancelEmergencyRequest);
router.get("/:id", protect, getEmergency);
router.patch("/:id/status", protect, updateStatus);

module.exports = router;
