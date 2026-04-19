const express = require('express');
const router = express.Router();
const { suggest, getAllHospitals } = require('../controllers/hospitalController');
const { updateBeds } = require('../controllers/hospitalBedController');

router.get('/suggest', suggest);
router.get('/', getAllHospitals);
router.patch('/:id/beds', updateBeds);

module.exports = router;
