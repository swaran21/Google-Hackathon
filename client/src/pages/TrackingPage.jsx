import { useState, useEffect, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import {
  getAllAmbulances,
  getAllHospitals,
  getUserVisibleAmbulances,
  cancelEmergencyRequest,
} from "../services/api";
import socket from "../services/socket";
import { useSocket } from "../hooks/useSocket";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import {
  Activity,
  Navigation,
  Shield,
  User,
  MessageSquare,
  PhoneCall,
  Send,
  X,
  XCircle,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

const createIcon = (emoji, size = 32, glowing = false) =>
  L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:#0a0a0f;border-radius:10px;border:2px solid ${glowing ? "#ef4444" : "#22c55e"};box-shadow:0 0 ${glowing ? "12px rgba(239,68,68,0.4)" : "8px rgba(34,197,94,0.3)"};font-size:16px;position:relative;">${emoji}${glowing ? '<div style="position:absolute;inset:-4px;border-radius:14px;border:2px solid rgba(239,68,68,0.3);animation:pulse-ring 2s ease-out infinite;"></div>' : ""}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const hospitalIcon = L.divIcon({
  html: '<div style="width:32px;height:32px;border-radius:50%;background:#2563eb;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(37,99,235,0.4);font-size:14px;">🏥</div>',
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function FitBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
    }
  }, [markers, map]);
  return null;
}

export default function TrackingPage() {
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const isUserViewer = isAuthenticated && user?.role === "user";
  const assignedAmbulanceId =
    activeEmergency?.assignedAmbulance?._id?.toString();
  const [showDispatchPanel, setShowDispatchPanel] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([]);

  const dispatchedAmbulance = useMemo(() => {
    if (!assignedAmbulanceId) return null;
    return (
      ambulances.find((amb) => amb._id?.toString() === assignedAmbulanceId) ||
      null
    );
  }, [ambulances, assignedAmbulanceId]);

  const assignedHospital = activeEmergency?.assignedHospital || null;

  const fetchData = useCallback(async () => {
    try {
      const hospitalPromise = getAllHospitals();

      if (isUserViewer) {
        const [ambRes, hospRes] = await Promise.all([
          getUserVisibleAmbulances(),
          hospitalPromise,
        ]);
        setAmbulances(ambRes.data.data?.ambulances || []);
        setActiveEmergency(ambRes.data.data?.activeEmergency || null);
        setHospitals(hospRes.data.data);
        return;
      }

      const [ambRes, hospRes] = await Promise.all([
        getAllAmbulances(),
        hospitalPromise,
      ]);
      setAmbulances(ambRes.data.data);
      setHospitals(hospRes.data.data);
      setActiveEmergency(null);
    } catch (err) {
      console.error("Telemetry Error:", err);
    }
  }, [isUserViewer]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      await fetchData();
      if (mounted) setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [fetchData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchData();
    }, 15000);

    return () => clearInterval(intervalId);
  }, [fetchData]);

  useEffect(() => {
    if (!showDispatchPanel || !dispatchedAmbulance) {
      setChatLog([]);
      return;
    }

    setChatLog([
      {
        id: `system-${dispatchedAmbulance._id}`,
        from: "system",
        text: `${dispatchedAmbulance.driverName || "Driver"} connected. You can chat, call, or cancel from here.`,
      },
    ]);
  }, [showDispatchPanel, dispatchedAmbulance]);

  useEffect(() => {
    if (!assignedAmbulanceId) {
      setShowDispatchPanel(false);
    }
  }, [assignedAmbulanceId]);

  const openDispatchPanel = useCallback(
    (ambulanceId) => {
      if (!isUserViewer || !assignedAmbulanceId) return;
      if (ambulanceId?.toString() !== assignedAmbulanceId) return;
      setShowDispatchPanel(true);
    },
    [assignedAmbulanceId, isUserViewer],
  );

  const handleSendChat = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;

    const ts = Date.now();
    setChatLog((prev) => [...prev, { id: `user-${ts}`, from: "user", text }]);
    setChatInput("");

    window.setTimeout(() => {
      setChatLog((prev) => [
        ...prev,
        {
          id: `driver-${Date.now()}`,
          from: "system",
          text: "Driver acknowledged. Ambulance is en route.",
        },
      ]);
    }, 400);
  }, [chatInput]);

  const handleCancelDispatch = useCallback(async () => {
    if (!activeEmergency?._id) return;

    try {
      await cancelEmergencyRequest(activeEmergency._id);
      setShowDispatchPanel(false);
      await fetchData();
    } catch (err) {
      console.error("Cancel dispatch failed:", err);
    }
  }, [activeEmergency, fetchData]);

  const isVisibleForUser = useCallback(
    (ambulanceId, status) => {
      if (!isUserViewer) return true;
      if (status === "available") return true;
      return (
        assignedAmbulanceId && ambulanceId?.toString() === assignedAmbulanceId
      );
    },
    [assignedAmbulanceId, isUserViewer],
  );

  const handleLocationUpdate = useCallback(
    (data) => {
      setAmbulances((prev) => {
        if (!isVisibleForUser(data.ambulanceId, data.status)) {
          return prev.filter((amb) => amb._id !== data.ambulanceId);
        }

        return prev.map((amb) =>
          amb._id === data.ambulanceId
            ? { ...amb, location: data.location, status: data.status }
            : amb,
        );
      });
    },
    [isVisibleForUser],
  );

  const handleStatusChange = useCallback(
    (data) => {
      setAmbulances((prev) => {
        if (!isVisibleForUser(data.ambulanceId, data.status)) {
          return prev.filter((amb) => amb._id !== data.ambulanceId);
        }

        return prev.map((amb) =>
          amb._id === data.ambulanceId ? { ...amb, status: data.status } : amb,
        );
      });
    },
    [isVisibleForUser],
  );

  useSocket(socket, "ambulance:location-update", handleLocationUpdate);
  useSocket(socket, "ambulance:status-change", handleStatusChange);

  const filteredAmbulances = useMemo(
    () =>
      ambulances.filter((amb) => {
        if (filter === "available") return amb.status === "available";
        if (filter === "dispatched") return amb.status !== "available";
        return true;
      }),
    [ambulances, filter],
  );
  const allMarkers = useMemo(
    () => [
      ...filteredAmbulances.map((a) => ({
        lat: a.location.coordinates[1],
        lng: a.location.coordinates[0],
      })),
      ...hospitals.map((h) => ({
        lat: h.location.coordinates[1],
        lng: h.location.coordinates[0],
      })),
    ],
    [filteredAmbulances, hospitals],
  );

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  if (loading)
    return (
      <div
        className="page-enter"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        <div className="spinner"></div>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            color: "var(--text-muted)",
          }}
        >
          Syncing Satellite Data
        </span>
      </div>
    );

  return (
    <div
      className="page-enter"
      style={{
        minHeight: "100vh",
        padding: "80px 16px 16px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          maxWidth: "1600px",
          margin: "0 auto",
          width: "100%",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
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
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 8px #22c55e",
                  animation: "pulse-glow 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "#22c55e",
                }}
              >
                Live Network Active
              </span>
            </div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              Geospatial{" "}
              <span style={{ color: "#dc2626", fontStyle: "italic" }}>
                Tracking
              </span>
            </h1>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "4px",
              background: "var(--bg-glass)",
              borderRadius: "14px",
              border: "1px solid var(--border-glass)",
            }}
          >
            {["all", "available", "dispatched"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="cursor-pointer"
                style={{
                  padding: "8px 20px",
                  borderRadius: "10px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  transition: "all 0.2s",
                  fontFamily: "var(--font-family)",
                  background: filter === f ? "#dc2626" : "transparent",
                  color: filter === f ? "#fff" : "var(--text-muted)",
                  boxShadow:
                    filter === f ? "0 4px 16px rgba(220,38,38,0.25)" : "none",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {isUserViewer && (
          <div
            className="glass-card"
            style={{
              padding: "16px 18px",
              borderRadius: "16px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                User Visibility Mode
              </p>
              <p style={{ fontSize: "0.875rem", fontWeight: 700 }}>
                Showing all available ambulances and only your dispatched
                ambulance.
              </p>
            </div>
            {activeEmergency ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#ef4444",
                    textTransform: "uppercase",
                  }}
                >
                  Active SOS {activeEmergency._id?.slice(-6)}
                </span>
                <span
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                >
                  Status: {activeEmergency.status}
                </span>
              </div>
            ) : (
              <span
                style={{ fontSize: "12px", color: "var(--text-secondary)" }}
              >
                No active SOS linked to your account.
              </span>
            )}
          </div>
        )}

        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: "20px",
            minHeight: 0,
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              position: "relative",
              borderRadius: "28px",
              overflow: "hidden",
              border: "1px solid var(--border-glass)",
              minHeight: "65vh",
            }}
          >
            <MapContainer
              center={[17.385, 78.4867]}
              zoom={12}
              zoomControl={false}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url={tileUrl} attribution="&copy; ResQNet AI" />
              <FitBounds markers={allMarkers} />
              {filteredAmbulances.map((amb) => (
                <Marker
                  key={amb._id}
                  position={[
                    amb.location.coordinates[1],
                    amb.location.coordinates[0],
                  ]}
                  icon={
                    amb.status === "available"
                      ? createIcon("🚑", 32, false)
                      : createIcon("🚨", 36, true)
                  }
                >
                  <Popup>
                    <div
                      style={{
                        padding: "4px",
                        minWidth: "200px",
                        fontFamily: "var(--font-family)",
                      }}
                    >
                      {assignedAmbulanceId &&
                        amb._id === assignedAmbulanceId && (
                          <div
                            style={{
                              marginBottom: "8px",
                              fontSize: "9px",
                              fontWeight: 800,
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                              color: "#ef4444",
                            }}
                          >
                            Linked To Your SOS
                          </div>
                        )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 900,
                            fontSize: "0.875rem",
                            color: "#1e293b",
                          }}
                        >
                          {amb.vehicleNumber}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 10px",
                            borderRadius: "9999px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            background:
                              amb.status === "available"
                                ? "#dcfce7"
                                : "#fee2e2",
                            color:
                              amb.status === "available"
                                ? "#166534"
                                : "#991b1b",
                          }}
                        >
                          {amb.status}
                        </span>
                      </div>
                      <div
                        style={{
                          borderTop: "1px solid #f1f5f9",
                          paddingTop: "8px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "12px",
                            color: "#64748b",
                          }}
                        >
                          <User size={12} /> {amb.driverName}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "12px",
                            color: "#64748b",
                          }}
                        >
                          <Shield size={12} />{" "}
                          {amb.equipmentLevel?.replace("_", " ")}
                        </div>

                        {isUserViewer && amb._id === assignedAmbulanceId && (
                          <button
                            onClick={() => openDispatchPanel(amb._id)}
                            className="cursor-pointer"
                            style={{
                              marginTop: "8px",
                              border: "none",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              background: "#1d4ed8",
                              color: "#fff",
                              fontSize: "11px",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                              fontFamily: "var(--font-family)",
                            }}
                          >
                            <MessageSquare size={12} /> Dispatch Interface
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
              {hospitals.map((hosp) => (
                <Marker
                  key={hosp._id}
                  position={[
                    hosp.location.coordinates[1],
                    hosp.location.coordinates[0],
                  ]}
                  icon={hospitalIcon}
                >
                  <Popup>
                    <div
                      style={{
                        padding: "4px",
                        minWidth: "200px",
                        fontFamily: "var(--font-family)",
                      }}
                    >
                      <h4
                        style={{
                          fontWeight: 700,
                          color: "#1e293b",
                          borderBottom: "1px solid #f1f5f9",
                          paddingBottom: "6px",
                          marginBottom: "8px",
                        }}
                      >
                        🏥 {hosp.name}
                      </h4>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            background: "#eff6ff",
                            padding: "8px",
                            borderRadius: "10px",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "10px",
                              textTransform: "uppercase",
                              color: "#2563eb",
                              fontWeight: 700,
                            }}
                          >
                            Beds
                          </p>
                          <p
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: 900,
                              color: "#1e3a5f",
                            }}
                          >
                            {hosp.availableBeds}/{hosp.totalBeds}
                          </p>
                        </div>
                        <div
                          style={{
                            background: "#fef2f2",
                            padding: "8px",
                            borderRadius: "10px",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "10px",
                              textTransform: "uppercase",
                              color: "#dc2626",
                              fontWeight: 700,
                            }}
                          >
                            ICU
                          </p>
                          <p
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: 900,
                              color: "#7f1d1d",
                            }}
                          >
                            {hosp.icuAvailable}/{hosp.icuTotal}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
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
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--text-secondary)",
              }}
            >
              <Activity size={14} style={{ color: "#ef4444" }} /> Fleet Health:{" "}
              <span style={{ color: "var(--text-primary)" }}>Optimal</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              overflow: "hidden",
            }}
          >
            <div
              className="glass-card"
              style={{
                padding: "20px",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                overflow: "hidden",
                borderRadius: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h3
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Navigation size={14} /> Fleet Telemetry
                </h3>
                <span
                  style={{
                    background: "var(--bg-badge)",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontFamily: "monospace",
                    color: "var(--text-secondary)",
                  }}
                >
                  {filteredAmbulances.length} UNITS
                </span>
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  paddingRight: "4px",
                }}
              >
                {filteredAmbulances.map((amb) => {
                  const isAssignedToUser =
                    assignedAmbulanceId && amb._id === assignedAmbulanceId;

                  return (
                    <div
                      key={amb._id}
                      className="glass-card glass-card-hover"
                      onClick={
                        isAssignedToUser
                          ? () => openDispatchPanel(amb._id)
                          : undefined
                      }
                      style={{
                        padding: "14px",
                        borderRadius: "14px",
                        background: "var(--bg-glass)",
                        cursor: isAssignedToUser ? "pointer" : "default",
                        border: isAssignedToUser
                          ? "1px solid rgba(37,99,235,0.35)"
                          : "1px solid var(--border-glass)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "10px",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: 900,
                              fontFamily: "monospace",
                            }}
                          >
                            {amb.vehicleNumber}
                          </p>
                          <p
                            style={{
                              fontSize: "10px",
                              color: "var(--text-muted)",
                              fontWeight: 500,
                            }}
                          >
                            DRIVER: {amb.driverName.toUpperCase()}
                          </p>
                        </div>
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background:
                              amb.status === "available"
                                ? "#22c55e"
                                : "#ef4444",
                            boxShadow: `0 0 8px ${amb.status === "available" ? "#22c55e" : "#ef4444"}`,
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            padding: "4px 8px",
                            borderRadius: "6px",
                            background: "var(--bg-badge)",
                            color: "var(--text-secondary)",
                            textTransform: "uppercase",
                          }}
                        >
                          {amb.equipmentLevel?.replace("_", " ")}
                        </span>
                        {amb.status !== "available" && (
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 700,
                              padding: "4px 8px",
                              borderRadius: "6px",
                              background: "rgba(239,68,68,0.1)",
                              color: "#ef4444",
                              animation: "pulse-glow 2s ease-in-out infinite",
                            }}
                          >
                            ON MISSION
                          </span>
                        )}
                        {isAssignedToUser && (
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 700,
                              padding: "4px 8px",
                              borderRadius: "6px",
                              background: "rgba(37,99,235,0.12)",
                              color: "#3b82f6",
                              textTransform: "uppercase",
                            }}
                          >
                            Your Dispatch
                          </span>
                        )}
                      </div>

                      {isAssignedToUser && (
                        <p
                          style={{
                            marginTop: "8px",
                            fontSize: "10px",
                            fontWeight: 800,
                            color: "#93c5fd",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                          }}
                        >
                          Tap to open chat/call/cancel
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div
              className="glass-card"
              style={{ padding: "18px", borderRadius: "20px" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--text-muted)",
                }}
              >
                {[
                  { color: "#22c55e", label: "Available" },
                  { color: "#ef4444", label: "Dispatched" },
                  { color: "#2563eb", label: "Hospital" },
                ].map((item) => (
                  <div
                    key={item.label}
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
                        background: item.color,
                      }}
                    />
                    {item.label}
                  </div>
                ))}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Activity size={10} /> Real-Time
                </div>
              </div>
            </div>
          </div>
        </div>

        {showDispatchPanel && dispatchedAmbulance && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              zIndex: 70,
            }}
          >
            <div
              className="glass-card"
              style={{
                width: "100%",
                maxWidth: "560px",
                borderRadius: "24px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                maxHeight: "82vh",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 900 }}>
                    Dispatch Interface
                  </h3>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                    }}
                  >
                    Unit {dispatchedAmbulance.vehicleNumber} •{" "}
                    {dispatchedAmbulance.driverName}
                  </p>
                </div>
                <button
                  onClick={() => setShowDispatchPanel(false)}
                  className="cursor-pointer"
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "9999px",
                    border: "1px solid var(--border-glass)",
                    background: "var(--bg-glass)",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {dispatchedAmbulance.driverPhone && (
                  <a
                    href={`tel:${dispatchedAmbulance.driverPhone}`}
                    style={{ textDecoration: "none" }}
                  >
                    <button
                      className="cursor-pointer"
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(34,197,94,0.4)",
                        background: "rgba(34,197,94,0.12)",
                        color: "#86efac",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontFamily: "var(--font-family)",
                      }}
                    >
                      <PhoneCall size={14} /> Call Ambulance
                    </button>
                  </a>
                )}
                {assignedHospital?.phone && (
                  <a
                    href={`tel:${assignedHospital.phone}`}
                    style={{ textDecoration: "none" }}
                  >
                    <button
                      className="cursor-pointer"
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(59,130,246,0.4)",
                        background: "rgba(59,130,246,0.12)",
                        color: "#93c5fd",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontFamily: "var(--font-family)",
                      }}
                    >
                      <PhoneCall size={14} /> Call Hospital
                    </button>
                  </a>
                )}
              </div>

              <div
                style={{
                  border: "1px solid var(--border-glass)",
                  borderRadius: "14px",
                  padding: "12px",
                  background: "var(--bg-glass)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  minHeight: "200px",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    letterSpacing: "0.12em",
                  }}
                >
                  Dispatch Chat
                </div>
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {chatLog.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        alignSelf:
                          item.from === "user" ? "flex-end" : "flex-start",
                        maxWidth: "85%",
                        padding: "8px 10px",
                        borderRadius: "10px",
                        background:
                          item.from === "user"
                            ? "rgba(37,99,235,0.18)"
                            : "rgba(148,163,184,0.12)",
                        color:
                          item.from === "user"
                            ? "#bfdbfe"
                            : "var(--text-secondary)",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      {item.text}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message to dispatch crew"
                    style={{
                      flex: 1,
                      borderRadius: "10px",
                      border: "1px solid var(--border-glass)",
                      background: "var(--bg-input)",
                      color: "var(--text-primary)",
                      padding: "10px 12px",
                      fontFamily: "var(--font-family)",
                    }}
                  />
                  <button
                    onClick={handleSendChat}
                    className="cursor-pointer"
                    style={{
                      borderRadius: "10px",
                      border: "none",
                      background: "#2563eb",
                      color: "#fff",
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleCancelDispatch}
                className="cursor-pointer"
                style={{
                  borderRadius: "12px",
                  border: "1px solid rgba(239,68,68,0.4)",
                  background: "rgba(239,68,68,0.12)",
                  color: "#fca5a5",
                  padding: "12px 14px",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontFamily: "var(--font-family)",
                }}
              >
                <XCircle size={14} /> Cancel Ambulance + Hospital Request
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
