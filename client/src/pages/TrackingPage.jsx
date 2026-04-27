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
    activeRoute,
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

  const mapFocusPoint = useMemo(() => {
    const emergencyCoords = activeEmergency?.location?.coordinates;
    if (Array.isArray(emergencyCoords) && emergencyCoords.length === 2) {
      return {
        lat: emergencyCoords[1],
        lng: emergencyCoords[0],
      };
    }

    const assignedCoords = dispatchedAmbulance?.location?.coordinates;
    if (Array.isArray(assignedCoords) && assignedCoords.length === 2) {
      return {
        lat: assignedCoords[1],
        lng: assignedCoords[0],
      };
    }

    return null;
  }, [activeEmergency, dispatchedAmbulance]);

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const etaMinutes = Number.isFinite(activeRoute?.etaMinutes)
    ? Math.max(1, Math.round(activeRoute.etaMinutes))
    : null;
  const routeDistanceKm = Number.isFinite(activeRoute?.distanceKm)
    ? Number(activeRoute.distanceKm).toFixed(1)
    : null;
  const userCareTips = activeEmergency?.triageResult?.roleGuidance?.userSteps || [];

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
          gap: "16px" }}
      >
        <div className="spinner"></div>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            color: "var(--text-muted)" }}
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
        flexDirection: "column" }}
    >
      <div
        style={{
          maxWidth: "1600px",
          margin: "0 auto",
          width: "100%",
          flex: 1,
          display: "flex",
          flexDirection: "column" }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "20px",
            gap: "16px" }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px" }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--color-success)",
                  boxShadow: "0 0 8px var(--color-success)",
                  animation: "pulse-glow 2s ease-in-out infinite" }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "var(--color-success)" }}
              >
                Live Network Active
              </span>
            </div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                letterSpacing: "-0.02em" }}
            >
              Geospatial{" "}
              <span style={{ color: "#dc2626", fontStyle: "italic" }}>
                Tracking
              </span>
            </h1>
          </div>
          {/* Filter tabs: hidden for focused user view */}
          {(!isUserViewer || !activeEmergency) && (
            <div
              className="neu-inner"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "4px",
                borderRadius: "16px",
                gap: "4px"
              }}
            >
              {["all", "available", "dispatched"].map((value) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={filter === value ? "neu-button neu-pressed" : "neu-button"}
                  style={{
                    padding: "8px 24px",
                    borderRadius: "12px",
                    fontSize: "10px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    fontFamily: "monospace",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: filter === value 
                      ? (value === 'available' ? 'var(--color-success)' : value === 'dispatched' ? 'var(--color-info)' : 'var(--color-danger)')
                      : "var(--text-muted)",
                    boxShadow: filter === value ? "none" : undefined,
                    background: filter === value ? "rgba(0,0,0,0.02)" : "transparent"
                  }}
                >
                  {filter === value && (
                    <div style={{ 
                      width: "6px", 
                      height: "6px", 
                      borderRadius: "50%", 
                      background: value === 'available' ? 'var(--color-success)' : value === 'dispatched' ? 'var(--color-info)' : 'var(--color-danger)',
                      boxShadow: `0 0 8px ${value === 'available' ? 'var(--color-success)' : value === 'dispatched' ? 'var(--color-info)' : 'var(--color-danger)'}`
                    }} />
                  )}
                  {value}
                </button>
              ))}
            </div>
          )}
        </div>

        {isUserViewer && (
          <div
            className="neu-card"
            style={{
              padding: "16px 18px",
              borderRadius: "16px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap" }}
          >
            <div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--text-muted)",
                  marginBottom: "6px" }}
              >
                User Visibility Mode
              </p>
              <p style={{ fontSize: "0.875rem", fontWeight: 700 }}>
                Privacy Mode: Displaying only your assigned medical assets.
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
                    textTransform: "uppercase" }}
                >
                  Active SOS {activeEmergency._id?.slice(-6)}
                </span>
                <span
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                >
                  Status: {activeEmergency.status}
                </span>
                {etaMinutes !== null && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#22c55e",
                      textTransform: "uppercase" }}
                  >
                    ETA: {etaMinutes} min
                    {routeDistanceKm ? ` • ${routeDistanceKm} km` : ""}
                  </span>
                )}
                {activeEmergency.status === "en_route" && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#ef4444",
                      textTransform: "uppercase" }}
                  >
                    🚑 Ambulance heading to you
                  </span>
                )}
                {activeEmergency.status === "at_scene" && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "var(--color-info)",
                      textTransform: "uppercase" }}
                  >
                    🏥 En route to hospital
                  </span>
                )}
                {userCareTips.length > 0 && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-secondary)",
                      maxWidth: "340px" }}
                  >
                    Care guidance: {userCareTips.slice(0, 2).join(" • ")}
                  </span>
                )}
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
            gridTemplateColumns:
              isUserViewer && activeEmergency ? "1fr" : "1fr 320px",
            gap: "20px",
            minHeight: 0,
            marginBottom: "16px" }}
        >
          <TrackingMapCard
            filteredAmbulances={filteredAmbulances}
            hospitals={hospitals}
            tileUrl={tileUrl}
            isDark={isDark}
            assignedAmbulanceId={assignedAmbulanceId}
            isUserViewer={isUserViewer}
            focusPoint={mapFocusPoint}
            onOpenDispatchPanel={openDispatchPanel}
            activeEmergency={activeEmergency}
            assignedHospital={assignedHospital}
            activeRoute={activeRoute}
          />

          {/* Fleet sidebar: hidden for focused user view */}
          {(!isUserViewer || !activeEmergency) && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                overflow: "hidden" }}
            >
              <FleetTelemetryCard
                filteredAmbulances={filteredAmbulances}
                assignedAmbulanceId={assignedAmbulanceId}
                onOpenDispatchPanel={openDispatchPanel}
              />
            </div>
          )}
        </div>

        <DispatchControlModal
          isOpen={showDispatchPanel && !!dispatchedAmbulance}
          emergencyId={activeEmergency?._id}
          emergencyChatSeed={activeEmergency?.chatThread || []}
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
