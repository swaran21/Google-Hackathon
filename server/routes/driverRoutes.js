const express = require('express');
const router = express.Router();
const {
  getDriverStatus,
  acceptDispatch,
  rejectDispatch,
  updateDriverStatus,
  simulateMove,
} = require('../controllers/driverController');

router.get('/status', getDriverStatus);
router.post('/accept', acceptDispatch);
router.post('/reject', rejectDispatch);
router.post('/update-status', updateDriverStatus);
router.post('/simulate-move', simulateMove);

module.exports = router;
