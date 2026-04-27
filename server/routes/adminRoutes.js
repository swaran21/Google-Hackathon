const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  getDashboard,
  getActiveEmergencies,
  getAmbulanceStatus,
  getHospitalCapacity,
  getNotifications,
  getUsers,
  getSystemHealth,
  loginAdmin,
} = require("../controllers/adminController");

router.post("/login", loginAdmin);

router.use(protect, authorize("admin"));

router.get("/dashboard", getDashboard);
router.get("/emergencies", getActiveEmergencies);
router.get("/ambulances", getAmbulanceStatus);
router.get("/hospitals", getHospitalCapacity);
router.get("/notifications", getNotifications);
router.get("/users", getUsers);
router.get("/health", getSystemHealth);

module.exports = router;
