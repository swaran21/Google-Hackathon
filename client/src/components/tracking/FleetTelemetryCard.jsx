import {
  Activity,
  Navigation,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";

const getStatusColor = (status) => {
  switch (status) {
    case "available":
      return {
        bg: "rgba(34,197,94,0.12)",
        color: "#22c55e",
        label: "AVAILABLE",
      };
    case "dispatched":
      return {
        bg: "rgba(59,130,246,0.12)",
        color: "#3b82f6",
        label: "DISPATCHED",
      };
    case "en_route":
      return {
        bg: "rgba(245,158,11,0.12)",
        color: "#f59e0b",
        label: "EN ROUTE",
      };
    case "at_scene":
      return {
        bg: "rgba(251,146,60,0.12)",
        color: "#fb923c",
        label: "AT SCENE",
      };
    case "returning":
      return {
        bg: "rgba(168,85,247,0.12)",
        color: "#a855f7",
        label: "RETURNING",
      };
    case "offline":
      return {
        bg: "rgba(107,114,128,0.12)",
        color: "#6b7280",
        label: "OFFLINE",
      };
    default:
      return {
        bg: "var(--bg-badge)",
        color: "var(--text-secondary)",
        label: status.toUpperCase(),
      };
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "available":
      return "✓";
    case "dispatched":
      return "→";
    case "en_route":
      return "🚑";
    case "at_scene":
      return "⚠";
    case "returning":
      return "↩";
    case "offline":
      return "✕";
    default:
      return "•";
  }
};

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
          {filteredAmbulances.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "40px 20px",
                textAlign: "center",
              }}
            >
              <AlertCircle size={32} style={{ color: "var(--text-muted)" }} />
              <p style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>
                No ambulances in selected filter
              </p>
            </div>
          ) : (
            filteredAmbulances.map((amb) => {
              const isAssignedToUser =
                assignedAmbulanceId && amb._id === assignedAmbulanceId;
              const statusInfo = getStatusColor(amb.status);
              const statusIcon = getStatusIcon(amb.status);

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
                    transition: "all 0.2s ease",
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
                        {amb.driverName.toUpperCase()}
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: statusInfo.bg,
                        color: statusInfo.color,
                        fontSize: "14px",
                        fontWeight: "bold",
                      }}
                    >
                      {statusIcon}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: "6px",
                        background: statusInfo.bg,
                        color: statusInfo.color,
                        textTransform: "uppercase",
                      }}
                    >
                      {statusInfo.label}
                    </span>
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
                    {!amb.isActive && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          padding: "4px 8px",
                          borderRadius: "6px",
                          background: "rgba(107,114,128,0.12)",
                          color: "#6b7280",
                        }}
                      >
                        OFFLINE
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
                        ASSIGNED
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
          }))}
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
