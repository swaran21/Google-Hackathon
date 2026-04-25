const Ambulance = require("../models/Ambulance");
const Emergency = require("../models/Emergency");
const { haversine } = require("../utils/haversine");
const { ApiError } = require("../middleware/errorHandler");
const { getRouteWithFallback } = require("../services/routingService");

const metersToLat = (meters) => meters / 111320;
const metersToLng = (meters, latitude) => {
  const latFactor = Math.cos((latitude * Math.PI) / 180);
  const divisor = Math.max(Math.abs(latFactor), 0.1) * 111320;
  return meters / divisor;
};

const getNavigationTarget = (ambulance, emergency) => {
  if (!ambulance?.location?.coordinates || !emergency?.location?.coordinates) {
    return null;
  }

  const [ambLng, ambLat] = ambulance.location.coordinates;
  const [emLng, emLat] = emergency.location.coordinates;
  const [hospLng, hospLat] =
    emergency.assignedHospital?.location?.coordinates || [];

  const isPhase2 =
    ambulance.status === "at_scene" &&
    Number.isFinite(hospLat) &&
    Number.isFinite(hospLng);

  if (isPhase2) {
    return {
      fromLat: ambLat,
      fromLng: ambLng,
      toLat: hospLat,
      toLng: hospLng,
      phase: "to_hospital",
    };
  }

  return {
    fromLat: ambLat,
    fromLng: ambLng,
    toLat: emLat,
    toLng: emLng,
    phase: "to_patient",
  };
};

/**
 * @desc    Get driver's assigned ambulance and current emergency
 * @route   GET /api/driver/status
 */
const getDriverStatus = async (req, res, next) => {
  try {
    const { ambulanceId } = req.query;
    if (!ambulanceId) {
      throw new ApiError(400, "ambulanceId query param is required");
    }

    const ambulance =
      await Ambulance.findById(ambulanceId).populate("currentEmergency");
    if (!ambulance) throw new ApiError(404, "Ambulance not found");

    let emergency = null;
    let route = null;

    if (ambulance.currentEmergency) {
      emergency = await Emergency.findById(
        ambulance.currentEmergency._id || ambulance.currentEmergency,
      ).populate("assignedHospital");

      const navTarget = getNavigationTarget(ambulance, emergency);
      if (navTarget) {
        const routeResult = await getRouteWithFallback(
          navTarget.fromLat,
          navTarget.fromLng,
          navTarget.toLat,
          navTarget.toLng,
        );

        route = {
          phase: navTarget.phase,
          distanceKm: routeResult.route?.distance ?? null,
          etaMinutes: routeResult.route?.duration ?? null,
          path: routeResult.path,
        };
      }
    }

    res.json({
      success: true,
      data: { ambulance, emergency, route },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Driver accepts a dispatch assignment
 * @route   POST /api/driver/accept
 */
const acceptDispatch = async (req, res, next) => {
  try {
    const { ambulanceId } = req.body;
    if (!ambulanceId) throw new ApiError(400, "ambulanceId is required");

    const ambulance = await Ambulance.findByIdAndUpdate(
      ambulanceId,
      { status: "en_route" },
      { new: true },
    ).populate("currentEmergency");

    if (!ambulance) throw new ApiError(404, "Ambulance not found");

    if (ambulance.currentEmergency) {
      await Emergency.findByIdAndUpdate(
        ambulance.currentEmergency._id || ambulance.currentEmergency,
        {
          status: "en_route",
        },
      );
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("ambulance:status-change", {
        ambulanceId: ambulance._id,
        status: "en_route",
      });
      if (ambulance.currentEmergency) {
        io.emit("emergency:status-change", {
          emergencyId:
            ambulance.currentEmergency._id || ambulance.currentEmergency,
          status: "en_route",
        });
      }
    }

    res.json({
      success: true,
      data: ambulance,
      message: "Dispatch accepted. Navigating to emergency.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Driver rejects a dispatch
 * @route   POST /api/driver/reject
 */
const rejectDispatch = async (req, res, next) => {
  try {
    const { ambulanceId } = req.body;
    if (!ambulanceId) throw new ApiError(400, "ambulanceId is required");

    const ambulance = await Ambulance.findById(ambulanceId);
    if (!ambulance) throw new ApiError(404, "Ambulance not found");

    const emergencyId = ambulance.currentEmergency;

    ambulance.status = "available";
    ambulance.currentEmergency = null;
    await ambulance.save();

    if (emergencyId) {
      await Emergency.findByIdAndUpdate(emergencyId, {
        status: "pending",
        assignedAmbulance: null,
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("ambulance:status-change", {
        ambulanceId: ambulance._id,
        status: "available",
      });
      io.emit("dispatch:rejected", { ambulanceId: ambulance._id, emergencyId });
    }

    res.json({
      success: true,
      message: "Dispatch rejected. Emergency returned to queue.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Driver updates their status
 * @route   POST /api/driver/update-status
 */
const updateDriverStatus = async (req, res, next) => {
  try {
    const { ambulanceId, status } = req.body;
    const validStatuses = [
      "en_route",
      "at_scene",
      "returning",
      "available",
      "offline",
    ];

    if (!validStatuses.includes(status)) {
      throw new ApiError(
        400,
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      );
    }

    const update = { status };
    if (status === "available") {
      update.currentEmergency = null;
    }

    const ambulance = await Ambulance.findByIdAndUpdate(ambulanceId, update, {
      new: true,
    });
    if (!ambulance) throw new ApiError(404, "Ambulance not found");

    if (ambulance.currentEmergency || status === "available") {
      const emergencyStatus = {
        en_route: "en_route",
        at_scene: "at_scene",
        returning: "resolved",
        available: "resolved",
        offline: undefined,
      };

      if (ambulance.currentEmergency && emergencyStatus[status]) {
        await Emergency.findByIdAndUpdate(ambulance.currentEmergency, {
          status: emergencyStatus[status],
        });
      }
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("ambulance:status-change", {
        ambulanceId: ambulance._id,
        status,
      });
      io.emit("emergency:status-change", {
        emergencyId: ambulance.currentEmergency,
        status:
          status === "at_scene"
            ? "at_scene"
            : status === "available"
              ? "resolved"
              : status,
      });
    }

    res.json({ success: true, data: ambulance });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Simulate ambulance GPS movement toward destination
 * @route   POST /api/driver/simulate-move
 */
const simulateMove = async (req, res, next) => {
  try {
    const { ambulanceId } = req.body;
    if (!ambulanceId) throw new ApiError(400, "ambulanceId is required");

    const ambulance =
      await Ambulance.findById(ambulanceId).populate("currentEmergency");
    if (!ambulance) throw new ApiError(404, "Ambulance not found");
    if (!ambulance.currentEmergency) {
      throw new ApiError(400, "No active emergency assigned");
    }

    const emergency = await Emergency.findById(
      ambulance.currentEmergency._id || ambulance.currentEmergency,
    ).populate("assignedHospital");

    if (!emergency) throw new ApiError(404, "Emergency not found");

    const [ambLng, ambLat] = ambulance.location.coordinates;

    const isPhase2 =
      ambulance.status === "at_scene" && emergency.assignedHospital;
    let targetLat;
    let targetLng;
    let arrivalLabel;

    if (isPhase2) {
      const [hospLng, hospLat] =
        emergency.assignedHospital.location.coordinates;
      targetLat = hospLat;
      targetLng = hospLng;
      arrivalLabel = "hospital";
    } else {
      const [emLng, emLat] = emergency.location.coordinates;
      targetLat = emLat;
      targetLng = emLng;
      arrivalLabel = "patient";
    }

    const stepFraction = 0.15;
    const newLat = ambLat + (targetLat - ambLat) * stepFraction;
    const newLng = ambLng + (targetLng - ambLng) * stepFraction;

    const remainingDist = haversine(newLat, newLng, targetLat, targetLng);
    const arrived = remainingDist < 0.2;

    ambulance.location.coordinates = [newLng, newLat];

    if (arrived && !isPhase2) {
      ambulance.status = "at_scene";
    } else if (arrived && isPhase2) {
      ambulance.status = "available";
      ambulance.currentEmergency = null;
      emergency.status = "resolved";
      await emergency.save();
    }

    await ambulance.save();

    const routeResult = await getRouteWithFallback(
      newLat,
      newLng,
      targetLat,
      targetLng,
    );

    const io = req.app.get("io");
    if (io) {
      const locationPayload = {
        ambulanceId: ambulance._id,
        location: ambulance.location,
        vehicleNumber: ambulance.vehicleNumber,
        status: ambulance.status,
        phase: isPhase2 ? "to_hospital" : "to_patient",
        routePath: routeResult.path,
        routeDistanceKm: routeResult.route?.distance ?? null,
        routeEtaMinutes: routeResult.route?.duration ?? null,
      };

      io.emit("ambulance:location-update", locationPayload);
      io.to(`emergency:${emergency._id}`).emit(
        "ambulance:tracking",
        locationPayload,
      );

      if (emergency.assignedHospital?._id) {
        io.to(`hospital:${emergency.assignedHospital._id}`).emit(
          "ambulance:tracking",
          locationPayload,
        );
      }

      if (arrived && !isPhase2) {
        io.emit("ambulance:status-change", {
          ambulanceId: ambulance._id,
          status: "at_scene",
        });
        io.emit("emergency:status-change", {
          emergencyId: emergency._id,
          status: "at_scene",
        });
        await Emergency.findByIdAndUpdate(emergency._id, {
          status: "at_scene",
        });
      } else if (arrived && isPhase2) {
        io.emit("ambulance:status-change", {
          ambulanceId: ambulance._id,
          status: "available",
        });
        io.emit("emergency:status-change", {
          emergencyId: emergency._id,
          status: "resolved",
        });
      }
    }

    res.json({
      success: true,
      data: {
        ambulance,
        remainingDistance: Math.round(remainingDist * 100) / 100,
        arrived,
        phase: isPhase2 ? "to_hospital" : "to_patient",
        arrivalLabel,
        route: {
          phase: isPhase2 ? "to_hospital" : "to_patient",
          distanceKm: routeResult.route?.distance ?? null,
          etaMinutes: routeResult.route?.duration ?? null,
          path: routeResult.path,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Move ambulance manually by arrow direction (for simulator)
 * @route   POST /api/driver/manual-move
 */
const manualMove = async (req, res, next) => {
  try {
    const { direction, stepMeters = 35 } = req.body;
    const validDirections = ["up", "down", "left", "right"];

    if (!validDirections.includes(direction)) {
      throw new ApiError(
        400,
        "direction must be one of: up, down, left, right",
      );
    }

    const ambulanceId =
      req.body.ambulanceId ||
      req.user?.assignedAmbulance?._id ||
      req.user?.assignedAmbulance;

    if (!ambulanceId) {
      throw new ApiError(
        400,
        "No ambulance associated with current user/session",
      );
    }

    const ambulance = await Ambulance.findById(ambulanceId);
    if (!ambulance) throw new ApiError(404, "Ambulance not found");

    const [currentLng, currentLat] = ambulance.location.coordinates;
    const step = Number(stepMeters);

    let nextLat = currentLat;
    let nextLng = currentLng;

    if (direction === "up") nextLat += metersToLat(step);
    if (direction === "down") nextLat -= metersToLat(step);
    if (direction === "right") nextLng += metersToLng(step, currentLat);
    if (direction === "left") nextLng -= metersToLng(step, currentLat);

    ambulance.location.coordinates = [nextLng, nextLat];
    if (ambulance.status === "offline") {
      ambulance.status = "available";
    }
    await ambulance.save();

    let emergency = null;
    let routeResult = null;

    if (ambulance.currentEmergency) {
      emergency = await Emergency.findById(ambulance.currentEmergency).populate(
        "assignedHospital",
      );

      if (emergency?.location?.coordinates) {
        const [emLng, emLat] = emergency.location.coordinates;
        const [hospLng, hospLat] =
          emergency.assignedHospital?.location?.coordinates || [];
        const isPhase2 =
          ambulance.status === "at_scene" &&
          Number.isFinite(hospLat) &&
          Number.isFinite(hospLng);

        routeResult = await getRouteWithFallback(
          nextLat,
          nextLng,
          isPhase2 ? hospLat : emLat,
          isPhase2 ? hospLng : emLng,
        );
      }
    }

    const io = req.app.get("io");
    if (io) {
      const payload = {
        ambulanceId: ambulance._id,
        location: ambulance.location,
        vehicleNumber: ambulance.vehicleNumber,
        status: ambulance.status,
        source: "manual-simulator",
        phase: ambulance.status === "at_scene" ? "to_hospital" : "to_patient",
        routePath: routeResult?.path || null,
        routeDistanceKm: routeResult?.route?.distance ?? null,
        routeEtaMinutes: routeResult?.route?.duration ?? null,
      };

      io.emit("ambulance:location-update", payload);
      io.to("admin").emit("ambulance:location-update", payload);

      if (emergency?._id) {
        io.to(`emergency:${emergency._id}`).emit("ambulance:tracking", payload);
      }

      if (emergency?.assignedHospital?._id) {
        io.to(`hospital:${emergency.assignedHospital._id}`).emit(
          "ambulance:tracking",
          payload,
        );
      }
    }

    res.json({
      success: true,
      data: {
        ambulance,
        route: routeResult
          ? {
              distanceKm: routeResult.route?.distance ?? null,
              etaMinutes: routeResult.route?.duration ?? null,
              path: routeResult.path,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get completed emergency history for a driver
 * @route   GET /api/driver/history
 */
const getDriverHistory = async (req, res, next) => {
  try {
    const requestedAmbulanceId = req.query?.ambulanceId;
    const assignedAmbulanceId =
      req.user?.assignedAmbulance?._id || req.user?.assignedAmbulance;

    const ambulanceId = requestedAmbulanceId || assignedAmbulanceId;
    if (!ambulanceId) {
      throw new ApiError(400, "No ambulance found for this driver account");
    }

    const history = await Emergency.find({
      assignedAmbulance: ambulanceId,
      status: { $in: ["resolved", "cancelled"] },
    })
      .sort({ updatedAt: -1 })
      .populate("assignedHospital", "name phone address")
      .select(
        "type status severity triageResult patientName patientPhone description createdAt updatedAt assignedHospital",
      )
      .lean();

    res.json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Serve lightweight keyboard-based simulator UI
 * @route   GET /api/driver/simulator
 */
const serveSimulator = async (_req, res, next) => {
  try {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ResQNet Ambulance GPS Simulator</title>
  <style>
    body { font-family: Segoe UI, sans-serif; background: #0b1220; color: #e2e8f0; margin: 0; padding: 24px; }
    .card { max-width: 760px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; }
    input, button { font: inherit; padding: 10px 12px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; }
    button { cursor: pointer; background: #1d4ed8; border-color: #1e40af; }
    .row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
    .hint { color: #93c5fd; font-size: 13px; }
    .ok { color: #86efac; }
    .err { color: #fca5a5; }
    pre { background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; overflow: auto; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Ambulance GPS Simulator (Arrow Keys)</h2>
    <p class="hint">Login as driver/hospital/admin, then use arrow keys to nudge vehicle updates in real time.</p>
    <div class="row">
      <input id="email" placeholder="Email" />
      <input id="password" placeholder="Password" type="password" />
      <button id="loginBtn">Login</button>
    </div>
    <div class="row">
      <input id="ambulanceId" placeholder="Ambulance ID (optional if driver assigned)" style="min-width:360px" />
      <input id="stepMeters" placeholder="Step meters" value="35" style="width:120px" />
    </div>
    <p id="status" class="hint">Not logged in</p>
    <pre id="log">Awaiting input...</pre>
  </div>
  <script>
    const logEl = document.getElementById('log');
    const statusEl = document.getElementById('status');
    let token = null;
    let active = false;

    const log = (payload) => {
      logEl.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    };

    document.getElementById('loginBtn').addEventListener('click', async () => {
      try {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');

        token = data.data.token;
        active = true;
        statusEl.className = 'ok';
        statusEl.textContent = 'Logged in. Use arrow keys to move ambulance.';
        log({ login: 'ok', user: data.data.user });
      } catch (err) {
        statusEl.className = 'err';
        statusEl.textContent = err.message;
      }
    });

    window.addEventListener('keydown', async (e) => {
      if (!active || !token) return;

      const map = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };
      const direction = map[e.key];
      if (!direction) return;
      e.preventDefault();

      try {
        const ambulanceId = document.getElementById('ambulanceId').value.trim();
        const stepMeters = Number(document.getElementById('stepMeters').value || 35);

        const res = await fetch('/api/driver/manual-move', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({ direction, ambulanceId: ambulanceId || undefined, stepMeters }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Move failed');
        log(data.data);
      } catch (err) {
        statusEl.className = 'err';
        statusEl.textContent = err.message;
      }
    });
  </script>
</body>
</html>`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle ambulance online/offline status
 * @route   PUT /api/driver/ambulance/toggle-status
 * @access  Private (Driver)
 */
const toggleAmbulanceStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find ambulance assigned to this driver
    const ambulance = await Ambulance.findOne({ assignedDriver: userId });
    if (!ambulance) {
      return next(new ApiError(404, "No ambulance assigned to this driver"));
    }

    // Toggle the isActive status (online/offline)
    ambulance.isActive = !ambulance.isActive;

    // If going offline, update status to offline
    if (!ambulance.isActive) {
      ambulance.status = "offline";
    } else {
      // If going online, set to available if offline
      if (ambulance.status === "offline") {
        ambulance.status = "available";
      }
    }

    await ambulance.save();

    res.status(200).json({
      success: true,
      message: `Ambulance is now ${ambulance.isActive ? "online" : "offline"}`,
      ambulance: {
        _id: ambulance._id,
        vehicleNumber: ambulance.vehicleNumber,
        status: ambulance.status,
        isActive: ambulance.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDriverStatus,
  acceptDispatch,
  rejectDispatch,
  updateDriverStatus,
  simulateMove,
  manualMove,
  getDriverHistory,
  serveSimulator,
  toggleAmbulanceStatus,
};
