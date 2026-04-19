const express = require('express');
const router = express.Router();
const {
  getNearestAmbulance,
  getAllAmbulances,
  updateLocation,
  updateAmbulanceStatus,
} = require('../controllers/ambulanceController');

router.get('/nearest', getNearestAmbulance);
router.get('/', getAllAmbulances);
router.patch('/:id/location', updateLocation);
router.patch('/:id/status', updateAmbulanceStatus);

module.exports = router;
