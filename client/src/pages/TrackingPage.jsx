import { useMemo, useState } from "react";
import DispatchControlModal from "../components/common/DispatchControlModal";
import FleetTelemetryCard from "../components/tracking/FleetTelemetryCard";
import TrackingMapCard from "../components/tracking/TrackingMapCard";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import useTrackingAmbulances from "../hooks/useTrackingAmbulances";
import { cancelEmergencyRequest } from "../services/api";

export default function TrackingPage() {
  const [filter, setFilter] = useState("all");
  const [showDispatchPanel, setShowDispatchPanel] = useState(false);
  const [cancellingDispatch, setCancellingDispatch] = useState(false);

  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  const isUserViewer = isAuthenticated && user?.role === "user";

  const {
    ambulances,
    hospitals,
    activeEmergency,
    assignedAmbulanceId,
    loading,
    refreshTrackingData,
  } = useTrackingAmbulances({ isUserViewer });

  const dispatchedAmbulance = useMemo(() => {
    if (!assignedAmbulanceId) return null;
    return (
      ambulances.find((amb) => amb._id?.toString() === assignedAmbulanceId) ||
      null
    );
  }, [ambulances, assignedAmbulanceId]);

  const assignedHospital = activeEmergency?.assignedHospital || null;

  const filteredAmbulances = useMemo(() => {
    if (filter === "all") return ambulances;
    return ambulances.filter((ambulance) => ambulance.status === filter);
  }, [ambulances, filter]);

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const openDispatchPanel = (ambulanceId) => {
    if (!isUserViewer) return;
    if (!assignedAmbulanceId || ambulanceId !== assignedAmbulanceId) return;
    setShowDispatchPanel(true);
  };

  const handleCancelDispatch = async () => {
    if (!isUserViewer || !activeEmergency?._id) return;

    try {
      setCancellingDispatch(true);
      await cancelEmergencyRequest(activeEmergency._id);
      await refreshTrackingData();
      setShowDispatchPanel(false);
    } catch (error) {
      console.error("Unable to cancel dispatch:", error);
    } finally {
      setCancellingDispatch(false);
    }
  };

  if (loading) {
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
  }

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
            {["all", "available", "dispatched"].map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
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
                  background: filter === value ? "#dc2626" : "transparent",
                  color: filter === value ? "#fff" : "var(--text-muted)",
                  boxShadow:
                    filter === value
                      ? "0 4px 16px rgba(220,38,38,0.25)"
                      : "none",
                }}
              >
                {value}
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
          <TrackingMapCard
            filteredAmbulances={filteredAmbulances}
            hospitals={hospitals}
            tileUrl={tileUrl}
            isDark={isDark}
            assignedAmbulanceId={assignedAmbulanceId}
            isUserViewer={isUserViewer}
            onOpenDispatchPanel={openDispatchPanel}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              overflow: "hidden",
            }}
          >
            <FleetTelemetryCard
              filteredAmbulances={filteredAmbulances}
              assignedAmbulanceId={assignedAmbulanceId}
              onOpenDispatchPanel={openDispatchPanel}
            />
          </div>
        </div>

        <DispatchControlModal
          isOpen={showDispatchPanel && !!dispatchedAmbulance}
          ambulance={dispatchedAmbulance}
          hospitalPhone={assignedHospital?.phone}
          onClose={() => setShowDispatchPanel(false)}
          onCancel={handleCancelDispatch}
          cancelDisabled={cancellingDispatch}
          cancelLabel={
            cancellingDispatch
              ? "Cancelling..."
              : "Cancel Ambulance + Hospital Request"
          }
        />
      </div>
    </div>
  );
}
