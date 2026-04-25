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
  serveSimulator,
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
router.post(
  "/manual-move",
  protect,
  authorize("driver", "hospital", "admin"),
  manualMove,
);

module.exports = router;
