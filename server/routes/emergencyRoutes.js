const express = require('express');
const router = express.Router();
const { createEmergency, getEmergency, updateStatus } = require('../controllers/emergencyController');

router.post('/', createEmergency);
router.get('/:id', getEmergency);
router.patch('/:id/status', updateStatus);

module.exports = router;
