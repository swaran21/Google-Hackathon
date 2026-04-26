const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  getDriverStatus,
  acceptDispatch,
  rejectDispatch,
  updateDriverStatus,
  simulateMove,
  manualMove,
  manualMoveByDriverId,
  getDriverHistory,
  serveSimulator,
  toggleAmbulanceStatus,
} = require("../controllers/driverController");

router.get("/simulator", serveSimulator);

router.get("/status", protect, authorize("driver", "admin"), getDriverStatus);
router.post("/accept", protect, authorize("driver", "admin"), acceptDispatch);
router.post("/reject", protect, authorize("driver", "admin"), rejectDispatch);
router.post(
  "/update-status",
  protect,
  authorize("driver", "admin"),
  updateDriverStatus,
);
router.post(
  "/simulate-move",
  protect,
  authorize("driver", "admin"),
  simulateMove,
);
router.get("/history", protect, authorize("driver", "admin"), getDriverHistory);
router.post(
  "/manual-move",
  protect,
  authorize("driver", "hospital", "admin"),
  manualMove,
);
router.post(
  "/manual-move/:driverId",
  protect,
  authorize("driver", "hospital", "admin"),
  manualMoveByDriverId,
);
router.put(
  "/ambulance/toggle-status",
  protect,
  authorize("driver"),
  toggleAmbulanceStatus,
);

module.exports = router;
