import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, MessageSquare, Shield, User } from "lucide-react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const createIcon = (emoji, size, pulse = false) => {
  return L.divIcon({
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size - 8}px;
      ${pulse ? "animation: pulse-glow 2s infinite;" : ""}
    ">${emoji}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const hospitalIcon = L.divIcon({
  html: `<div style="
    width: 30px;
    height: 30px;
    background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(37,99,235,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
  ">H</div>`,
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const emergencyIcon = L.divIcon({
  html: `<div style="
    width: 32px;
    height: 32px;
    background: #0a0a0f;
    border: 2px solid #f97316;
    border-radius: 10px;
    box-shadow: 0 0 14px rgba(249,115,22,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    animation: pulse-glow 2s ease-in-out infinite;
  ">🆘</div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const assignedHospitalIcon = L.divIcon({
  html: `<div style="
    width: 34px;
    height: 34px;
    background: #0a0a0f;
    border: 2px solid #3b82f6;
    border-radius: 10px;
    box-shadow: 0 0 14px rgba(59,130,246,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    animation: pulse-glow 2s ease-in-out infinite;
  ">🏥</div>`,
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function FitBounds({ markers }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (hasCenteredRef.current) return;
    if (!markers.length) return;

    const bounds = L.latLngBounds(markers.map(({ lat, lng }) => [lat, lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    hasCenteredRef.current = true;
  }, [markers, map]);

  return null;
}

function FocusController({ focusPoint }) {
  const map = useMap();
  const lastFocusRef = useRef(null);

  useEffect(() => {
    if (!focusPoint) return;

    const nextKey = `${focusPoint.lat.toFixed(5)},${focusPoint.lng.toFixed(5)}`;
    if (lastFocusRef.current === nextKey) return;

    const nextZoom = Math.max(map.getZoom(), 13);
    map.setView([focusPoint.lat, focusPoint.lng], nextZoom, {
      animate: true,
      duration: 0.8,
    });
    lastFocusRef.current = nextKey;
  }, [focusPoint, map]);

  return null;
}

function ViewportTracker({ onViewportChange }) {
  const map = useMapEvents({
    zoomend() {
      onViewportChange(map.getZoom(), map.getBounds());
    },
    moveend() {
      onViewportChange(map.getZoom(), map.getBounds());
    },
  });

  useEffect(() => {
    onViewportChange(map.getZoom(), map.getBounds());
  }, [map, onViewportChange]);

  return null;
}

const hasValidCoords = (item) =>
  Array.isArray(item?.location?.coordinates) &&
  item.location.coordinates.length === 2;

const isInsideBounds = (item, bounds) => {
  if (!hasValidCoords(item)) return false;
  if (!bounds) return true;

  const [lng, lat] = item.location.coordinates;
  return bounds.contains(L.latLng(lat, lng));
};

const getDensityByZoom = (zoomLevel) => {
  if (zoomLevel >= 14) {
    return {
      maxAmbulances: Infinity,
      maxHospitals: Infinity,
      showHospitals: true,
    };
  }

  if (zoomLevel >= 12) {
    return { maxAmbulances: 45, maxHospitals: 30, showHospitals: true };
  }

  if (zoomLevel >= 10) {
    return { maxAmbulances: 24, maxHospitals: 16, showHospitals: true };
  }

  return { maxAmbulances: 12, maxHospitals: 6, showHospitals: false };
};

export default function TrackingMapCard({
  filteredAmbulances,
  hospitals,
  tileUrl,
  isDark,
  assignedAmbulanceId,
  isUserViewer,
  focusPoint,
  onOpenDispatchPanel,
  activeEmergency,
  assignedHospital,
}) {
  const [zoomLevel, setZoomLevel] = useState(12);
  const [mapBounds, setMapBounds] = useState(null);

  const handleViewportChange = useCallback((nextZoom, bounds) => {
    setZoomLevel(nextZoom);
    setMapBounds(bounds);
  }, []);

  const allMarkers = useMemo(() => {
    const ambulanceMarkers = filteredAmbulances
      .filter(hasValidCoords)
      .map((amb) => ({
        lat: amb.location.coordinates[1],
        lng: amb.location.coordinates[0],
      }));

    const hospitalMarkers = hospitals.filter(hasValidCoords).map((hosp) => ({
      lat: hosp.location.coordinates[1],
      lng: hosp.location.coordinates[0],
    }));

    return [...ambulanceMarkers, ...hospitalMarkers];
  }, [filteredAmbulances, hospitals]);

  const mapDensity = useMemo(() => getDensityByZoom(zoomLevel), [zoomLevel]);

  const visibleAmbulances = useMemo(() => {
    const sorted = [...filteredAmbulances]
      .filter(hasValidCoords)
      .sort((a, b) => {
        const aPriority = a._id?.toString() === assignedAmbulanceId ? 1 : 0;
        const bPriority = b._id?.toString() === assignedAmbulanceId ? 1 : 0;
        return bPriority - aPriority;
      });

    const inBounds = sorted.filter((item) => isInsideBounds(item, mapBounds));
    const scoped = inBounds.length > 0 ? inBounds : sorted;

    if (!Number.isFinite(mapDensity.maxAmbulances)) return scoped;
    return scoped.slice(0, mapDensity.maxAmbulances);
  }, [
    filteredAmbulances,
    assignedAmbulanceId,
    mapBounds,
    mapDensity.maxAmbulances,
  ]);

  const visibleHospitals = useMemo(() => {
    if (isUserViewer) {
      // User should only ever see their assigned hospital
      if (!assignedHospital || !hasValidCoords(assignedHospital)) return [];
      return [assignedHospital];
    }

    if (!mapDensity.showHospitals) return [];

    const scoped = hospitals
      .filter(hasValidCoords)
      .filter((item) => isInsideBounds(item, mapBounds));

    const fallback =
      scoped.length > 0 ? scoped : hospitals.filter(hasValidCoords);

    if (!Number.isFinite(mapDensity.maxHospitals)) return fallback;
    return fallback.slice(0, mapDensity.maxHospitals);
  }, [hospitals, mapBounds, mapDensity.maxHospitals, mapDensity.showHospitals, isUserViewer, assignedHospital]);

  return (
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
        center={
          focusPoint ? [focusPoint.lat, focusPoint.lng] : [17.385, 78.4867]
        }
        zoom={12}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url={tileUrl} attribution="&copy; ResQNet AI" />
        <FitBounds markers={allMarkers} />
        <FocusController focusPoint={focusPoint} />
        <ViewportTracker onViewportChange={handleViewportChange} />

        {/* Phase-aware route polyline for user's active emergency */}
        {isUserViewer && activeEmergency && assignedAmbulanceId && (() => {
          const dispAmb = filteredAmbulances.find(a => a._id?.toString() === assignedAmbulanceId);
          if (!dispAmb || !hasValidCoords(dispAmb)) return null;

          const ambPos = [dispAmb.location.coordinates[1], dispAmb.location.coordinates[0]];
          const emCoords = activeEmergency.location?.coordinates;
          const emPos = emCoords ? [emCoords[1], emCoords[0]] : null;
          const hospCoords = assignedHospital?.location?.coordinates;
          const hospPos = hospCoords ? [hospCoords[1], hospCoords[0]] : null;
          const status = activeEmergency.status;

          const isPhase2 = status === 'at_scene' && hospPos;

          return (
            <>
              {/* SOS marker for patient location (Phase 1 only) */}
              {emPos && !isPhase2 && (
                <Marker position={emPos} icon={emergencyIcon}>
                  <Popup>
                    <div style={{ padding: '4px', fontFamily: 'var(--font-family)' }}>
                      <span style={{ fontWeight: 800, color: '#f97316' }}>Your SOS Location</span>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Assigned hospital highlighted marker */}
              {hospPos && (
                <Marker position={hospPos} icon={assignedHospitalIcon}>
                  <Popup>
                    <div style={{ padding: '4px', fontFamily: 'var(--font-family)' }}>
                      <span style={{ fontWeight: 800, color: '#3b82f6' }}>Destination: {assignedHospital?.name}</span>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Ambulance marker */}
              <Marker
                position={ambPos}
                icon={createIcon(status === "at_scene" ? "🚨" : "🚑", 36, true)}
              >
                <Popup>
                  <div style={{ padding: '4px', fontFamily: 'var(--font-family)' }}>
                    <span style={{ fontWeight: 800, color: '#ef4444' }}>
                      {dispAmb.vehicleNumber} • {status === "at_scene" ? "Transporting" : "En Route"}
                    </span>
                  </div>
                </Popup>
              </Marker>

              {/* Phase-aware route polyline */}
              {isPhase2 && hospPos ? (
                <Polyline
                  positions={[ambPos, hospPos]}
                  pathOptions={{ color: '#3b82f6', weight: 4, dashArray: '12, 8', opacity: 0.7 }}
                />
              ) : emPos ? (
                <Polyline
                  positions={[ambPos, emPos]}
                  pathOptions={{ color: '#ef4444', weight: 4, dashArray: '12, 8', opacity: 0.7 }}
                />
              ) : null}
            </>
          );
        })()}

        {/* Generic ambulance markers — hidden for focused user view */}
        {(!isUserViewer || !activeEmergency) && visibleAmbulances.map((amb) => (
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
                {assignedAmbulanceId && amb._id === assignedAmbulanceId && (
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
                        amb.status === "available" ? "#dcfce7" : "#fee2e2",
                      color: amb.status === "available" ? "#166534" : "#991b1b",
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
                    <Shield size={12} /> {amb.equipmentLevel?.replace("_", " ")}
                  </div>

                  {isUserViewer && amb._id === assignedAmbulanceId && (
                    <button
                      onClick={() => onOpenDispatchPanel(amb._id)}
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

        {/* Generic hospital markers — hidden for focused user view */}
        {(!isUserViewer || !activeEmergency) && visibleHospitals.map((hosp) => (
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

      {/* HUD Overlays */}
      {isUserViewer && activeEmergency ? (
        <>
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "20px",
              zIndex: 1000,
              background: isDark ? "rgba(10,10,15,0.85)" : "rgba(255,255,255,0.9)",
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
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', animation: 'pulse-glow 2s ease-in-out infinite' }} />
            <span style={{ color: "var(--text-primary)" }}>Emergency Active</span>
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              left: "16px",
              zIndex: 1000,
              background: isDark ? "rgba(10,10,15,0.88)" : "rgba(255,255,255,0.9)",
              backdropFilter: "blur(16px)",
              border: "1px solid var(--border-glass)",
              padding: "10px 12px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>🚑 Ambulance</span>
            <span>•</span>
            <span>🏥 {assignedHospital?.name || 'Hospital'}</span>
            <span>•</span>
            <span>🆘 Your Location</span>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "20px",
              zIndex: 1000,
              background: isDark ? "rgba(10,10,15,0.85)" : "rgba(255,255,255,0.9)",
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
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              left: "16px",
              zIndex: 1000,
              background: isDark ? "rgba(10,10,15,0.88)" : "rgba(255,255,255,0.9)",
              backdropFilter: "blur(16px)",
              border: "1px solid var(--border-glass)",
              padding: "10px 12px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>Zoom {zoomLevel.toFixed(1)}</span>
            <span>
              Showing {visibleAmbulances.length} ambulances
              {mapDensity.showHospitals
                ? ` • ${visibleHospitals.length} hospitals`
                : ""}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
