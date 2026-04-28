import {
  Activity,
  Navigation,
  AlertCircle,
  Shield,
  Zap,
  MapPin,
  Ambulance,
} from "lucide-react";

const getStatusTheme = (status) => {
  switch (status) {
    case "available":
      return { color: "var(--color-success)", label: "AVAIL", icon: "✓" };
    case "dispatched":
      return { color: "var(--color-info)", label: "DISP", icon: "→" };
    case "en_route":
      return { color: "#b45309", label: "ROUTE", icon: "🚑" };
    case "at_scene":
      return { color: "#fb923c", label: "SCENE", icon: "⚠" };
    case "returning":
      return { color: "#a855f7", label: "RET", icon: "↩" };
    case "offline":
      return { color: "#6b7280", label: "OFF", icon: "✕" };
    default:
      return { color: "var(--text-secondary)", label: status.toUpperCase().slice(0, 5), icon: "•" };
  }
};

export default function FleetTelemetryCard({
  filteredAmbulances,
  assignedAmbulanceId,
  onOpenDispatchPanel,
}) {
  return (
    <div
      className="neu-card"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        borderRadius: "24px",
        background: "var(--bg-card)",
      }}
    >
      {/* Console Header */}
      <div
        style={{
          padding: "20px",
          borderBottom: "1px solid var(--shadow-dark)",
          background: "rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3
            style={{
              fontSize: "12px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <Activity size={16} className="text-red-500" />
            System Fleet
          </h3>
          <div
            className="neu-inner"
            style={{
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "10px",
              fontWeight: 800,
              color: "var(--color-success)",
              fontFamily: "monospace",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-success)", boxShadow: "0 0 6px var(--color-success)" }} />
            LIVE
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          {[
            { label: "TOTAL", val: filteredAmbulances.length, color: "var(--text-primary)" },
            { label: "READY", val: filteredAmbulances.filter(a => a.status === 'available').length, color: "var(--color-success)" },
            { label: "ACTIVE", val: filteredAmbulances.filter(a => a.status !== 'available' && a.status !== 'offline').length, color: "var(--color-info)" },
          ].map(stat => (
            <div key={stat.label} className="neu-inner" style={{ padding: "8px", borderRadius: "12px", textAlign: "center" }}>
              <p style={{ fontSize: "8px", fontWeight: 800, color: "var(--text-muted)", marginBottom: "2px" }}>{stat.label}</p>
              <p style={{ fontSize: "14px", fontWeight: 900, color: stat.color, fontFamily: "monospace" }}>{stat.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Machined List Container */}
      <div
        className="neu-inner"
        style={{
          flex: 1,
          margin: "12px",
          borderRadius: "16px",
          overflowY: "auto",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}
      >
        {filteredAmbulances.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <AlertCircle size={24} style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: "11px", fontWeight: 700 }}>NO UNITS MATCH FILTER</p>
          </div>
        ) : (
          filteredAmbulances.map((amb) => {
            const isAssigned = assignedAmbulanceId && amb._id === assignedAmbulanceId;
            const theme = getStatusTheme(amb.status);

            return (
              <div
                key={amb._id}
                onClick={isAssigned ? () => onOpenDispatchPanel(amb._id) : undefined}
                className={isAssigned ? "neu-card" : "neu-button"}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: isAssigned ? "pointer" : "default",
                  transition: "all 0.2s ease",
                  borderLeft: `4px solid ${theme.color}`,
                  position: "relative",
                  boxShadow: isAssigned ? undefined : "none", // Flat inside inner by default unless selected
                  background: isAssigned ? "var(--bg-card)" : "transparent",
                }}
              >
                {/* Status Indicator */}
                <div
                  className="neu-inner"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    color: theme.color,
                    flexShrink: 0
                  }}
                >
                  {theme.icon}
                </div>

                {/* Info Section */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <p style={{ fontSize: "12px", fontWeight: 900, fontFamily: "monospace", color: "var(--text-primary)" }}>
                      {amb.vehicleNumber}
                    </p>
                    <span style={{ fontSize: "8px", fontWeight: 800, color: theme.color, letterSpacing: "0.05em" }}>
                      {theme.label}
                    </span>
                  </div>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {amb.driverName.toUpperCase()}
                  </p>
                </div>

                {/* Right Action/Indicator */}
                {isAssigned && (
                  <div style={{ 
                    width: "8px", 
                    height: "8px", 
                    borderRadius: "50%", 
                    background: "#ef4444", 
                    boxShadow: "0 0 10px #ef4444",
                    animation: "pulse-glow 2s infinite" 
                  }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Console Footer / Legend */}
      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid var(--shadow-dark)",
          background: "rgba(0,0,0,0.02)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div style={{ display: "flex", gap: "12px" }}>
          {[
            { color: "var(--color-success)", label: "RDY" },
            { color: "var(--color-danger)", label: "ACT" },
            { color: "var(--color-info)", label: "HSP" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: l.color }} />
              <span style={{ fontSize: "8px", fontWeight: 800, color: "var(--text-muted)" }}>{l.label}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: "8px", fontWeight: 800, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
          <Zap size={10} /> TELEMETRY ACTIVE
        </div>
      </div>
    </div>
  );
}
