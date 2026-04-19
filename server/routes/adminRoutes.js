const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getActiveEmergencies,
  getAmbulanceStatus,
  getHospitalCapacity,
  getNotifications,
} = require('../controllers/adminController');

router.get('/dashboard', getDashboard);
router.get('/emergencies', getActiveEmergencies);
router.get('/ambulances', getAmbulanceStatus);
router.get('/hospitals', getHospitalCapacity);
router.get('/notifications', getNotifications);

module.exports = router;
