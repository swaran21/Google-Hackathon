const express = require("express");
const router = express.Router();
const {
  createEmergency,
  selectHospitalAndDispatch,
  getEmergency,
  updateStatus,
} = require("../controllers/emergencyController");

router.post("/", createEmergency);
router.post("/:id/select-hospital", selectHospitalAndDispatch);
router.get("/:id", getEmergency);
router.patch("/:id/status", updateStatus);

module.exports = router;
