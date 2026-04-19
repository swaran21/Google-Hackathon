const express = require('express');
const router = express.Router();
const { register, registerHospital, registerAmbulance, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/register-hospital', registerHospital);
router.post('/register-ambulance', registerAmbulance);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;

