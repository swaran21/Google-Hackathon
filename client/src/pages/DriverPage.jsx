import { useState, useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import api from "../services/api";
import socket from "../services/socket";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../context/AuthContext";
import { showToast } from "../components/Toast";
import { useTheme } from "../context/ThemeContext";
import DispatchControlModal from "../components/common/DispatchControlModal";
import {
  Navigation,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  MapPin,
  Activity,
  Shield,
  Radio,
  Loader2,
  Truck,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

const createMarkerIcon = (emoji, color, glowing = false) =>
  L.divIcon({
    html: `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:#0a0a0f;border-radius:10px;border:2px solid ${color};box-shadow:0 0 ${glowing ? "14px" : "8px"} ${color}50;font-size:16px;">${emoji}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
const ambIcon = createMarkerIcon("🚑", "#ef4444", true);
const emIcon = createMarkerIcon("🆘", "#f97316", true);
const hospIcon = createMarkerIcon("🏥", "#3b82f6");

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function DriverPage() {
  const { user } = useAuth();
  const [driverData, setDriverData] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeView, setActiveView] = useState("live");
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simPhase, setSimPhase] = useState(null);
  const [showDispatchPanel, setShowDispatchPanel] = useState(false);
  const [gpsStreaming, setGpsStreaming] = useState(false);
  const [gpsPermission, setGpsPermission] = useState("unknown");
  const [togglingStatus, setTogglingStatus] = useState(false);
  const simRef = useRef(null);
  const gpsWatchRef = useRef(null);
  const lastGpsEmitRef = useRef(0);
  const { isDark } = useTheme();

  // Auto-detect driver's own ambulance from their user profile
  const myAmbulanceId =
    user?.assignedAmbulance?._id || user?.assignedAmbulance || null;

  // Fetch driver status on mount — auto-load their own ambulance
  useEffect(() => {
    if (!myAmbulanceId) {
      setLoading(false);
      return;
    }
    fetchDriverStatus(myAmbulanceId);
    fetchDriverHistory();
  }, [myAmbulanceId]);

  const fetchDriverHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get("/driver/history");
      setHistory(res.data.data || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchDriverStatus = async (ambId) => {
    try {
      setLoading(true);
      const res = await api.get(`/driver/status?ambulanceId=${ambId}`);
      setDriverData(res.data.data);
    } catch {
      showToast("Telemetry sync failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (endpoint, payload, message, type = "success") => {
    try {
      await api.post(`/driver/${endpoint}`, payload);
      showToast(message, type);
      fetchDriverStatus(myAmbulanceId);
    } catch (err) {
      showToast(err.response?.data?.message || "Action failed", "error");
    }
  };

  const startSimulation = () => {
    setSimulating(true);
    showToast("GPS Stream Active: Unit in motion", "info");
    simRef.current = setInterval(async () => {
      try {
        const res = await api.post("/driver/simulate-move", {
          ambulanceId: myAmbulanceId,
        });
        const { arrived, phase, arrivalLabel } = res.data.data;
        setSimPhase(phase || "to_patient");
        fetchDriverStatus(myAmbulanceId);
        if (arrived) {
          clearInterval(simRef.current);
          setSimulating(false);
          if (arrivalLabel === "patient") {
            showToast(
              "Arrival Confirmed: Unit at patient scene. Ready for Phase 2.",
              "success",
            );
          } else if (arrivalLabel === "hospital") {
            showToast(
              "Mission Complete: Patient delivered to hospital.",
              "success",
            );
            setSimPhase(null);
          }
        }
      } catch {
        stopSimulation();
      }
    }, 5000);
  };
  const stopSimulation = () => {
    clearInterval(simRef.current);
    setSimulating(false);
    showToast("GPS Stream Paused", "warning");
  };

  const stopLiveGps = () => {
    if (gpsWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    setGpsStreaming(false);
    socket.emit("driver:locationUpdate", {
      ambulanceId: myAmbulanceId,
      status: "offline",
    });
    showToast("Live GPS stopped", "warning");
  };

  const startLiveGps = () => {
    if (!myAmbulanceId) return;
    if (!navigator.geolocation) {
      setGpsPermission("unsupported");
      showToast("Geolocation not supported on this device", "error");
      return;
    }

    if (gpsStreaming) return;

    const minIntervalMs = 6000;
    setGpsPermission("requesting");

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsPermission("granted");

        const now = Date.now();
        if (now - lastGpsEmitRef.current < minIntervalMs) return;
        lastGpsEmitRef.current = now;

        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;

        socket.emit("driver:locationUpdate", {
          ambulanceId: myAmbulanceId,
          latitude,
          longitude,
          status: amb?.status || "en_route",
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: new Date().toISOString(),
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsPermission("denied");
          showToast(
            "Location permission denied. Enable GPS permission.",
            "error",
          );
        } else {
          setGpsPermission("error");
          showToast("Unable to read live GPS location", "error");
        }
        stopLiveGps();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      },
    );

    setGpsStreaming(true);
    showToast("Live GPS started (updates every ~6 seconds)", "success");
  };

  const toggleAmbulanceStatus = async () => {
    try {
      setTogglingStatus(true);
      const res = await api.put("/driver/ambulance/toggle-status", {});
      showToast(res.data.message, "success");
      fetchDriverStatus(myAmbulanceId);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to toggle status",
        "error",
      );
    } finally {
      setTogglingStatus(false);
    }
  };

  useEffect(() => {
    return () => {
      clearInterval(simRef.current);
      if (gpsWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, []);

  // Live socket updates for THIS ambulance only
  useSocket(socket, "ambulance:location-update", (data) => {
    if (data.ambulanceId !== myAmbulanceId) return; // Ignore other ambulances
    setDriverData((prev) =>
      prev
        ? {
            ...prev,
            ambulance: {
              ...prev.ambulance,
              location: data.location,
              status: data.status,
            },
            route: Array.isArray(data.routePath)
              ? {
                  ...(prev.route || {}),
                  phase: data.phase || prev.route?.phase || null,
                  distanceKm: Number.isFinite(data.routeDistanceKm)
                    ? data.routeDistanceKm
                    : (prev.route?.distanceKm ?? null),
                  etaMinutes: Number.isFinite(data.routeEtaMinutes)
                    ? data.routeEtaMinutes
                    : (prev.route?.etaMinutes ?? null),
                  path: data.routePath,
                }
              : prev.route,
          }
        : prev,
    );
  });

  const amb = driverData?.ambulance;
  const em = driverData?.emergency;
  const activeRoute = driverData?.route;

  const isPhase2 = amb?.status === "at_scene" && em?.assignedHospital;

  const coords = useMemo(() => {
    const hasCoords = (item) =>
      Array.isArray(item?.location?.coordinates) &&
      item.location.coordinates.length === 2;

    return {
      amb: hasCoords(amb)
        ? [amb.location.coordinates[1], amb.location.coordinates[0]]
        : null,
      em: hasCoords(em)
        ? [em.location.coordinates[1], em.location.coordinates[0]]
        : null,
      hosp: hasCoords(em?.assignedHospital)
        ? [
            em.assignedHospital.location.coordinates[1],
            em.assignedHospital.location.coordinates[0],
          ]
        : null,
    };
  }, [amb, em]);

  const routeLine = useMemo(() => {
    if (!coords.amb) return null;

    if (Array.isArray(activeRoute?.path) && activeRoute.path.length > 1) {
      return {
        positions: activeRoute.path,
        color: activeRoute.phase === "to_hospital" ? "#3b82f6" : "#ef4444",
        label:
          activeRoute.phase === "to_hospital" ? "To Hospital" : "To Patient",
      };
    }

    if (isPhase2 && coords.hosp) {
      return {
        positions: [coords.amb, coords.hosp],
        color: "#3b82f6",
        label: "To Hospital",
      };
    }
    if (coords.em && !isPhase2) {
      return {
        positions: [coords.amb, coords.em],
        color: "#ef4444",
        label: "To Patient",
      };
    }
    return null;
  }, [coords, isPhase2, activeRoute]);

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const actionBtn = (onClick, bg, color, icon, label, extra = {}) => (
    <button
      onClick={onClick}
      className="cursor-pointer"
      style={{
        padding: "12px 28px",
        borderRadius: "14px",
        border: "none",
        background: bg,
        color,
        fontSize: "11px",
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.2s",
        fontFamily: "var(--font-family)",
        ...extra,
      }}
    >
      {icon} {label}
    </button>
  );

  const phaseInfo = useMemo(() => {
    if (!em || !amb) return null;
    if (amb.status === "dispatched")
      return {
        label: "AWAITING ACCEPT",
        color: "#facc15",
        bg: "rgba(250,204,21,0.1)",
      };
    if (amb.status === "en_route")
      return {
        label: "PHASE 1: EN ROUTE TO PATIENT",
        color: "#ef4444",
        bg: "rgba(239,68,68,0.1)",
      };
    if (amb.status === "at_scene" && em.assignedHospital)
      return {
        label: "PHASE 2: TRANSPORTING TO HOSPITAL",
        color: "#3b82f6",
        bg: "rgba(59,130,246,0.1)",
      };
    if (amb.status === "at_scene")
      return {
        label: "AT SCENE",
        color: "#a855f7",
        bg: "rgba(168,85,247,0.1)",
      };
    return null;
  }, [amb, em]);

  // No ambulance assigned to this driver account
  if (!myAmbulanceId) {
    return (
      <div
        className="page-enter"
        style={{
          minHeight: "100vh",
          padding: "80px 24px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="glass-card"
          style={{
            padding: "40px",
            borderRadius: "24px",
            textAlign: "center",
            maxWidth: "420px",
          }}
        >
          <Navigation
            size={40}
            style={{ color: "#ef4444", marginBottom: "16px" }}
          />
          <h2
            style={{
              fontWeight: 900,
              fontSize: "1.25rem",
              marginBottom: "8px",
            }}
          >
            No Ambulance Assigned
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            Your account is not linked to any ambulance unit. Contact your admin
            to get assigned.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !driverData) {
    return (
      <div
        className="page-enter"
        style={{
          minHeight: "100vh",
          padding: "80px 24px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2
          size={32}
          style={{ color: "#ef4444", animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  return (
    <div
      className="page-enter"
      style={{ minHeight: "100vh", padding: "80px 24px 24px" }}
    >
      <div
        style={{
          maxWidth: "1600px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "20px",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <Radio
                size={14}
                style={{
                  color: "#ef4444",
                  animation: "pulse-glow 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  color: "var(--text-muted)",
                }}
              >
                Field Simulation Protocol
              </span>
            </div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 900,
                letterSpacing: "-0.03em",
              }}
            >
              Driver <span style={{ color: "#dc2626" }}>Terminal</span>
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Unit identifier badge */}
            <div
              className="glass-card"
              style={{
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                borderRadius: "14px",
              }}
            >
              <Navigation size={14} style={{ color: "#ef4444" }} />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--text-primary)",
                  fontFamily: "monospace",
                }}
              >
                {amb?.vehicleNumber || "..."}
              </span>
            </div>
            {phaseInfo && (
              <div
                style={{
                  padding: "8px 16px",
                  borderRadius: "14px",
                  background: phaseInfo.bg,
                  border: `1px solid ${phaseInfo.color}30`,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: phaseInfo.color,
                    boxShadow: `0 0 8px ${phaseInfo.color}`,
                    animation: "pulse-glow 2s ease-in-out infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: phaseInfo.color,
                  }}
                >
                  {phaseInfo.label}
                </span>
              </div>
            )}
            <div
              className="glass-card"
              style={{
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                borderRadius: "14px",
              }}
            >
              <Activity size={16} style={{ color: "#22c55e" }} />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--text-secondary)",
                }}
              >
                {gpsStreaming ? "GPS LIVE" : "Online"}
              </span>
            </div>
            <button
              onClick={toggleAmbulanceStatus}
              disabled={togglingStatus || !amb}
              className="cursor-pointer"
              style={{
                padding: "8px 16px",
                borderRadius: "14px",
                border: "1px solid var(--border-glass)",
                background: amb?.isActive
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(239,68,68,0.12)",
                color: amb?.isActive ? "#22c55e" : "#ef4444",
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontFamily: "var(--font-family)",
                opacity: togglingStatus ? 0.6 : 1,
                transition: "all 0.2s ease",
              }}
            >
              {togglingStatus ? (
                <>
                  <Loader2
                    size={14}
                    style={{
                      display: "inline",
                      marginRight: "6px",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  SWITCHING...
                </>
              ) : (
                <>{amb?.isActive ? "🟢 ONLINE" : "🔴 OFFLINE"}</>
              )}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "14px",
          }}
        >
          {[
            { key: "live", label: "Live Navigation" },
            { key: "history", label: "Case History" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className="cursor-pointer"
              style={{
                borderRadius: "10px",
                border: "1px solid var(--border-glass)",
                background:
                  activeView === tab.key
                    ? "rgba(220,38,38,0.18)"
                    : "var(--bg-glass)",
                color:
                  activeView === tab.key ? "#fecaca" : "var(--text-secondary)",
                padding: "9px 14px",
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontFamily: "var(--font-family)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeView === "live" ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              flex: 1,
              minHeight: "500px",
            }}
          >
            <div
              style={{
                position: "relative",
                flex: 1,
                borderRadius: "28px",
                overflow: "hidden",
                border: "1px solid var(--border-glass)",
                minHeight: "400px",
                background: isDark ? "#0f172a" : "#f8fafc",
              }}
            >
              <MapContainer
                center={coords.amb || [17.385, 78.4867]}
                zoom={14}
                zoomControl={false}
                style={{
                  height: "100%",
                  width: "100%",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
              >
                <TileLayer url={tileUrl} attribution="&copy; ResQNet AI" />
                {coords.amb && <RecenterMap center={coords.amb} />}

                {/* Only 3 markers ever: own ambulance, patient, hospital */}
                {coords.amb && <Marker position={coords.amb} icon={ambIcon} />}
                {coords.em && !isPhase2 && (
                  <Marker position={coords.em} icon={emIcon} />
                )}
                {coords.hosp && (
                  <Marker position={coords.hosp} icon={hospIcon} />
                )}

                {/* Phase-aware route polyline */}
                {routeLine && (
                  <Polyline
                    positions={routeLine.positions}
                    pathOptions={{
                      color: routeLine.color,
                      weight: 3,
                      dashArray: "10, 10",
                      opacity: 0.6,
                    }}
                  />
                )}
              </MapContainer>

              {/* GPS coordinates overlay */}
              {coords.amb && (
                <div
                  style={{
                    position: "absolute",
                    top: "20px",
                    left: "20px",
                    zIndex: 1000,
                    background: isDark
                      ? "rgba(10,10,15,0.85)"
                      : "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid var(--border-glass)",
                    padding: "12px 16px",
                    borderRadius: "14px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      marginBottom: "4px",
                    }}
                  >
                    Satellite Lock
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#ef4444",
                        boxShadow: "0 0 8px #ef4444",
                        animation: "pulse-glow 2s ease-in-out infinite",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "12px",
                        fontFamily: "monospace",
                        fontWeight: 700,
                      }}
                    >
                      {coords.amb[0].toFixed(5)}, {coords.amb[1].toFixed(5)}
                    </span>
                  </div>
                </div>
              )}

              {/* Phase indicator on map */}
              {phaseInfo && (
                <div
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    zIndex: 1000,
                    background: isDark
                      ? "rgba(10,10,15,0.85)"
                      : "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(20px)",
                    border: `1px solid ${phaseInfo.color}30`,
                    padding: "10px 14px",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Truck size={14} style={{ color: phaseInfo.color }} />
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: phaseInfo.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {isPhase2 ? "→ Hospital" : "→ Patient"}
                  </span>
                </div>
              )}

              {/* Map legend */}
              <div
                style={{
                  position: "absolute",
                  bottom: "16px",
                  left: "16px",
                  zIndex: 1000,
                  background: isDark
                    ? "rgba(10,10,15,0.88)"
                    : "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid var(--border-glass)",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                {coords.amb ? (
                  <>
                    <span>🚑 You</span>
                    {coords.em && !isPhase2 && (
                      <>
                        <span>•</span>
                        <span>🆘 Patient</span>
                      </>
                    )}
                    {coords.hosp && (
                      <>
                        <span>•</span>
                        <span>🏥 Hospital</span>
                      </>
                    )}
                  </>
                ) : (
                  <span style={{ color: "#ef4444" }}>
                    ⚠️ GPS Signal Offline
                  </span>
                )}
              </div>
            </div>

            {/* Action control panel */}
            <div
              className="glass-card"
              style={{ padding: "28px", borderRadius: "24px" }}
            >
              {amb ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "24px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "20px",
                    }}
                  >
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "18px",
                        background: "var(--bg-glass)",
                        border: "1px solid var(--border-glass)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ef4444",
                      }}
                    >
                      <Navigation size={28} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.35rem", fontWeight: 900 }}>
                        {amb.vehicleNumber}
                      </h3>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.15em",
                        }}
                      >
                        {amb.driverName} •{" "}
                        {amb.equipmentLevel?.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    {em &&
                      actionBtn(
                        () => setShowDispatchPanel(true),
                        "rgba(37,99,235,0.12)",
                        "#93c5fd",
                        <Truck size={16} />,
                        "OPEN CHAT & CALL",
                        { border: "1px solid rgba(37,99,235,0.35)" },
                      )}
                    {actionBtn(
                      gpsStreaming ? stopLiveGps : startLiveGps,
                      gpsStreaming
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(245,158,11,0.14)",
                      gpsStreaming ? "#86efac" : "#fcd34d",
                      gpsStreaming ? <Pause size={16} /> : <Play size={16} />,
                      gpsStreaming ? "STOP LIVE GPS" : "START LIVE GPS",
                      {
                        border: gpsStreaming
                          ? "1px solid rgba(34,197,94,0.35)"
                          : "1px solid rgba(245,158,11,0.35)",
                      },
                    )}
                    {amb.status === "dispatched" && (
                      <>
                        {actionBtn(
                          () =>
                            handleAction(
                              "accept",
                              { ambulanceId: amb._id },
                              "Mission Accepted",
                            ),
                          "#16a34a",
                          "#fff",
                          <CheckCircle2 size={16} />,
                          "ACCEPT DISPATCH",
                        )}
                        {actionBtn(
                          () =>
                            handleAction(
                              "reject",
                              { ambulanceId: amb._id },
                              "Mission Rejected",
                              "warning",
                            ),
                          "var(--bg-glass)",
                          "var(--text-secondary)",
                          <XCircle size={16} />,
                          "REJECT",
                          { border: "1px solid var(--border-glass)" },
                        )}
                      </>
                    )}
                    {amb.status === "en_route" && (
                      <>
                        {actionBtn(
                          simulating ? stopSimulation : startSimulation,
                          simulating ? "rgba(234,179,8,0.12)" : "#2563eb",
                          simulating ? "#eab308" : "#fff",
                          simulating ? <Pause size={16} /> : <Play size={16} />,
                          simulating ? "PAUSE GPS" : "NAVIGATE TO PATIENT",
                          simulating
                            ? { border: "1px solid rgba(234,179,8,0.3)" }
                            : {},
                        )}
                        {actionBtn(
                          () =>
                            handleAction(
                              "update-status",
                              { ambulanceId: amb._id, status: "at_scene" },
                              "Unit At Scene — Patient Picked Up",
                            ),
                          "var(--bg-glass)",
                          "var(--text-primary)",
                          <MapPin size={16} />,
                          "MARK PATIENT PICKED UP",
                          { border: "1px solid var(--border-glass)" },
                        )}
                      </>
                    )}
                    {amb.status === "at_scene" && em?.assignedHospital && (
                      <>
                        {actionBtn(
                          simulating ? stopSimulation : startSimulation,
                          simulating ? "rgba(234,179,8,0.12)" : "#3b82f6",
                          simulating ? "#eab308" : "#fff",
                          simulating ? <Pause size={16} /> : <Play size={16} />,
                          simulating ? "PAUSE GPS" : "NAVIGATE TO HOSPITAL",
                          simulating
                            ? { border: "1px solid rgba(234,179,8,0.3)" }
                            : {},
                        )}
                        {actionBtn(
                          () =>
                            handleAction(
                              "update-status",
                              { ambulanceId: amb._id, status: "available" },
                              "Emergency Resolved — Patient Delivered",
                            ),
                          "#16a34a",
                          "#fff",
                          <Shield size={16} />,
                          "COMPLETE MISSION",
                        )}
                      </>
                    )}
                    {amb.status === "at_scene" &&
                      !em?.assignedHospital &&
                      actionBtn(
                        () =>
                          handleAction(
                            "update-status",
                            { ambulanceId: amb._id, status: "available" },
                            "Emergency Resolved",
                          ),
                        "#16a34a",
                        "#fff",
                        <Shield size={16} />,
                        "COMPLETE MISSION & RETURN",
                      )}
                    {!em && amb.status === "available" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "12px 24px",
                          borderRadius: "9999px",
                          background: "var(--bg-glass)",
                          fontSize: "10px",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.15em",
                          color: "var(--text-muted)",
                        }}
                      >
                        <Loader2
                          size={14}
                          style={{
                            color: "#ef4444",
                            animation: "spin 1s linear infinite",
                          }}
                        />{" "}
                        Monitoring Emergency Frequencies...
                      </div>
                    )}
                    {gpsPermission === "denied" && (
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          color: "#fca5a5",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        GPS permission denied on this browser
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    height: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    fontSize: "12px",
                    letterSpacing: "0.15em",
                  }}
                >
                  Loading unit telemetry...
                </div>
              )}
            </div>

            {em && (
              <div
                className="glass-card"
                style={{ padding: "18px", borderRadius: "18px" }}
              >
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                  }}
                >
                  Patient Details
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "10px",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "11px",
                        color: "var(--text-muted)",
                      }}
                    >
                      Name
                    </p>
                    <p style={{ margin: "4px 0 0", fontWeight: 800 }}>
                      {em.patientName || "-"}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "11px",
                        color: "var(--text-muted)",
                      }}
                    >
                      Phone
                    </p>
                    <p style={{ margin: "4px 0 0", fontWeight: 800 }}>
                      {em.patientPhone || "-"}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "11px",
                        color: "var(--text-muted)",
                      }}
                    >
                      Type
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontWeight: 800,
                        textTransform: "capitalize",
                      }}
                    >
                      {em.type || "-"}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "11px",
                        color: "var(--text-muted)",
                      }}
                    >
                      Severity
                    </p>
                    <p style={{ margin: "4px 0 0", fontWeight: 800 }}>
                      {em.severity || "-"}/5
                    </p>
                  </div>
                </div>
                <p
                  style={{
                    margin: "12px 0 0",
                    color: "var(--text-secondary)",
                    fontSize: "13px",
                  }}
                >
                  {em.description ||
                    "No additional description provided by user."}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            className="glass-card"
            style={{ padding: "18px", borderRadius: "18px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <p style={{ margin: 0, fontWeight: 900, fontSize: "1rem" }}>
                Completed Cases
              </p>
              <button
                onClick={fetchDriverHistory}
                className="cursor-pointer"
                style={{
                  borderRadius: "10px",
                  border: "1px solid var(--border-glass)",
                  background: "var(--bg-glass)",
                  color: "var(--text-secondary)",
                  padding: "8px 12px",
                  fontWeight: 700,
                }}
              >
                Refresh
              </button>
            </div>

            {historyLoading ? (
              <p style={{ margin: 0, color: "var(--text-muted)" }}>
                Loading history...
              </p>
            ) : history.length === 0 ? (
              <p style={{ margin: 0, color: "var(--text-muted)" }}>
                No completed cases yet.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {history.map((entry) => (
                  <div
                    key={entry._id}
                    style={{
                      border: "1px solid var(--border-glass)",
                      borderRadius: "12px",
                      padding: "12px",
                      background: "var(--bg-glass)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <p style={{ margin: 0, fontWeight: 800 }}>
                        {entry.patientName || "Unknown"}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                        }}
                      >
                        {entry.status} • Severity {entry.severity || "-"}/5
                      </p>
                    </div>
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {entry.description || "No description"}
                    </p>
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: "12px",
                        color: "var(--text-muted)",
                      }}
                    >
                      Hospital: {entry.assignedHospital?.name || "N/A"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <DispatchControlModal
        isOpen={showDispatchPanel}
        emergencyId={em?._id || null}
        emergencyChatSeed={em?.chatThread || []}
        ambulance={amb || null}
        hospitalPhone={em?.assignedHospital?.phone || ""}
        patientPhone={em?.patientPhone || ""}
        onClose={() => setShowDispatchPanel(false)}
        title="Driver Dispatch Console"
      />
    </div>
  );
}
