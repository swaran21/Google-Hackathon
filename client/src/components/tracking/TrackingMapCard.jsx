import { useEffect, useMemo } from "react";
import { Activity, MessageSquare, Shield, User } from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
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

function FitBounds({ markers }) {
  const map = useMap();

  useEffect(() => {
    if (!markers.length) return;

    const bounds = L.latLngBounds(markers.map(({ lat, lng }) => [lat, lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  }, [markers, map]);

  return null;
}

export default function TrackingMapCard({
  filteredAmbulances,
  hospitals,
  tileUrl,
  isDark,
  assignedAmbulanceId,
  isUserViewer,
  onOpenDispatchPanel,
}) {
  const allMarkers = useMemo(() => {
    const ambulanceMarkers = filteredAmbulances
      .filter((amb) => amb?.location?.coordinates?.length === 2)
      .map((amb) => ({
        lat: amb.location.coordinates[1],
        lng: amb.location.coordinates[0],
      }));

    const hospitalMarkers = hospitals
      .filter((hosp) => hosp?.location?.coordinates?.length === 2)
      .map((hosp) => ({
        lat: hosp.location.coordinates[1],
        lng: hosp.location.coordinates[0],
      }));

    return [...ambulanceMarkers, ...hospitalMarkers];
  }, [filteredAmbulances, hospitals]);

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
    </div>
  );
}
