const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/hospitalController");
const {
  updateBeds,
  updateMyBeds,
} = require("../controllers/hospitalBedController");
const { protect, authorize } = require("../middleware/auth");

router.get("/suggest", suggest);
router.get("/", getAllHospitals);

router.get(
  "/me/profile",
  protect,
  authorize("hospital", "admin"),
  getMyHospitalProfile,
);
router.patch(
  "/me/profile",
  protect,
  authorize("hospital", "admin"),
  updateMyHospitalProfile,
);
router.put(
  "/me/treatments",
  protect,
  authorize("hospital", "admin"),
  replaceMyTreatments,
);
router.post(
  "/me/treatments",
  protect,
  authorize("hospital", "admin"),
  addMyTreatment,
);
router.delete(
  "/me/treatments/:treatmentId",
  protect,
  authorize("hospital", "admin"),
  removeMyTreatment,
);
router.patch("/me/beds", protect, authorize("hospital", "admin"), updateMyBeds);
router.get(
  "/me/dashboard",
  protect,
  authorize("hospital", "admin"),
  getMyHospitalDashboard,
);
router.patch(
  "/me/requests/:emergencyId/decision",
  protect,
  authorize("hospital", "admin"),
  decideEmergencyBedRequest,
);
router.patch(
  "/me/requests/:emergencyId/release",
  protect,
  authorize("hospital", "admin"),
  releaseEmergencyBeds,
);

router.patch("/:id/beds", protect, authorize("admin"), updateBeds);

module.exports = router;
