import { Activity, Navigation } from "lucide-react";

export default function FleetTelemetryCard({
  filteredAmbulances,
  assignedAmbulanceId,
  onOpenDispatchPanel,
}) {
  return (
    <>
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
                    ? () => onOpenDispatchPanel(amb._id)
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
                        amb.status === "available" ? "#22c55e" : "#ef4444",
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={10} /> Real-Time
          </div>
        </div>
      </div>
    </>
  );
}
