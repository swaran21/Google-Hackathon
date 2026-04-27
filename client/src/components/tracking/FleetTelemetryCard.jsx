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
        bg: "var(--bg-card)",
        color: "#22c55e",
        label: "AVAILABLE",
      };
    case "dispatched":
      return {
        bg: "var(--bg-card)",
        color: "#3b82f6",
        label: "DISPATCHED",
      };
    case "en_route":
      return {
        bg: "var(--bg-card)",
        color: "#f59e0b",
        label: "EN ROUTE",
      };
    case "at_scene":
      return {
        bg: "var(--bg-card)",
        color: "#fb923c",
        label: "AT SCENE",
      };
    case "returning":
      return {
        bg: "var(--bg-card)",
        color: "#a855f7",
        label: "RETURNING",
      };
    case "offline":
      return {
        bg: "var(--bg-card)",
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
        className="neu-inner"
        style={{
          padding: "20px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
          borderRadius: "20px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px" }}
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
              gap: "8px" }}
          >
            <Navigation size={14} /> Fleet Telemetry
          </h3>
          <span
            className="neu-inner"
            style={{
              padding: "4px 12px",
              borderRadius: "8px",
              fontSize: "10px",
              fontFamily: "monospace",
              color: "var(--color-secondary)",
              fontWeight: 800 }}
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
            paddingRight: "4px" }}
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
                textAlign: "center" }}
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
                  className="neu-card neu-card-hover"
                  onClick={
                    isAssignedToUser
                      ? () => onOpenDispatchPanel(amb._id)
                      : undefined
                  }
                  style={{
                    padding: "14px",
                    borderRadius: "14px",
                    cursor: isAssignedToUser ? "pointer" : "default",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "10px" }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 900,
                          fontFamily: "monospace" }}
                      >
                        {amb.vehicleNumber}
                      </p>
                      <p
                        style={{
                          fontSize: "10px",
                          color: "var(--text-muted)",
                          fontWeight: 500 }}
                      >
                        {amb.driverName.toUpperCase()}
                      </p>
                    </div>
                    <div
                      className="neu-inner"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        color: statusInfo.color,
                        fontSize: "12px",
                        fontWeight: "bold" }}
                    >
                      {statusIcon}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                    <span
                      className="neu-inner"
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: "6px",
                        color: statusInfo.color,
                        textTransform: "uppercase" }}
                    >
                      {statusInfo.label}
                    </span>
                    <span
                      className="neu-inner"
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: "6px",
                        color: "var(--text-secondary)",
                        textTransform: "uppercase" }}
                    >
                      {amb.equipmentLevel?.replace("_", " ")}
                    </span>
                    {!amb.isActive && (
                      <span
                        className="neu-inner"
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          padding: "4px 8px",
                          borderRadius: "6px",
                          color: "#6b7280" }}
                      >
                        OFFLINE
                      </span>
                    )}
                    {isAssignedToUser && (
                      <span
                        className="neu-inner"
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          padding: "4px 8px",
                          borderRadius: "6px",
                          color: "var(--color-secondary)",
                          textTransform: "uppercase" }}
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
                        color: "var(--color-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em" }}
                    >
                      Tap to open dispatch
                    </p>
                  )}
                </div>
              );
            }))}
        </div>

        <div
          style={{
            padding: "18px 0 0",
            marginTop: "auto",
            borderTop: "1px solid var(--shadow-dark)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            fontSize: "10px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-muted)" }}
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
                gap: "8px" }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: item.color }}
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
