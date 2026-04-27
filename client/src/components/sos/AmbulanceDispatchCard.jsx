import {
  ShieldAlert,
  Activity,
  Navigation,
  Clock,
  Zap,
  Phone,
  User,
  Wifi,
  WifiOff,
  Stethoscope,
} from "lucide-react";

const getStatusConfig = (status) => {
  switch (status) {
    case "available":
      return {
        bg: "var(--bg-card)",
        color: "#22c55e",
        borderColor: "var(--bg-card)",
        label: "AVAILABLE",
        icon: <Activity size={12} />,
        pulse: false,
        description: "Ready for dispatch",
      };
    case "dispatched":
      return {
        bg: "var(--bg-card)",
        color: "#3b82f6",
        borderColor: "var(--bg-card)",
        label: "DISPATCHED",
        icon: <Navigation size={12} />,
        pulse: true,
        description: "Assigned to emergency",
      };
    case "en_route":
      return {
        bg: "var(--bg-card)",
        color: "#f59e0b",
        borderColor: "var(--bg-card)",
        label: "EN ROUTE",
        icon: <Zap size={12} />,
        pulse: true,
        description: "Moving to patient location",
      };
    case "at_scene":
      return {
        bg: "var(--bg-card)",
        color: "#fb923c",
        borderColor: "var(--bg-card)",
        label: "AT SCENE",
        icon: <Stethoscope size={12} />,
        pulse: true,
        description: "Providing emergency care",
      };
    case "returning":
      return {
        bg: "var(--bg-card)",
        color: "#a855f7",
        borderColor: "var(--bg-card)",
        label: "RETURNING",
        icon: <Navigation size={12} style={{ transform: "rotate(180deg)" }} />,
        pulse: false,
        description: "Returning to base",
      };
    case "offline":
      return {
        bg: "var(--bg-card)",
        color: "#6b7280",
        borderColor: "var(--bg-card)",
        label: "OFFLINE",
        icon: <WifiOff size={12} />,
        pulse: false,
        description: "Unit currently offline",
      };
    default:
      return {
        bg: "var(--bg-badge)",
        color: "var(--text-secondary)",
        borderColor: "transparent",
        label: status?.toUpperCase() || "UNKNOWN",
        icon: <ShieldAlert size={12} />,
        pulse: false,
        description: "Status unknown",
      };
  }
};

const getEquipmentConfig = (level) => {
  switch (level) {
    case "basic":
      return {
        color: "#64748b",
        bg: "var(--bg-card)",
        borderColor: "var(--bg-card)",
        label: "BASIC LIFE SUPPORT",
      };
    case "advanced":
      return {
        color: "#06b6d4",
        bg: "var(--bg-card)",
        borderColor: "var(--bg-card)",
        label: "ADVANCED LIFE SUPPORT",
      };
    case "critical_care":
      return {
        color: "#ef4444",
        bg: "var(--bg-card)",
        borderColor: "var(--bg-card)",
        label: "CRITICAL CARE UNIT",
      };
    default:
      return {
        color: "var(--text-muted)",
        bg: "var(--bg-badge)",
        borderColor: "transparent",
        label: "UNKNOWN",
      };
  }
};

export default function AmbulanceDispatchCard({
  ambulance,
  requiresHospitalSelection,
  onOpenDispatch,
}) {
  if (!ambulance) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px",
          background: "var(--bg-card)",
          borderRadius: "14px",
          color: "#f97316",
          border: "1px solid var(--bg-card)" }}
      >
        <ShieldAlert size={20} />
        <p style={{ fontSize: "12px", fontWeight: 700 }}>
          {requiresHospitalSelection
            ? "Choose a hospital to continue dispatch."
            : "Queueing for available fleet..."}
        </p>
      </div>
    );
  }

  const statusConfig = getStatusConfig(ambulance.status);
  const equipmentConfig = getEquipmentConfig(ambulance.equipmentLevel);

  const isActive = ["dispatched", "en_route", "at_scene"].includes(
    ambulance.status,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <button
        onClick={onOpenDispatch}
        className="neu-button"
        style={{
          width: "100%",
          border: `1px solid ${statusConfig.borderColor}`,
          borderRadius: "14px",
          background: "var(--bg-card)",
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          transition: "all 0.2s ease",
          position: "relative",
          overflow: "hidden" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-secondary)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--bg-card)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {/* Status Pulse Indicator */}
        {statusConfig.pulse && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: statusConfig.color,
              boxShadow: `0 0 8px ${statusConfig.color}`,
              animation: "pulse-glow 2s ease-in-out infinite" }}
          />
        )}

        {/* Header - Fleet Unit & Vehicle Number */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingBottom: "10px",
            borderBottom: "1px solid transparent" }}
        >
          <span
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              fontWeight: 700,
              textTransform: "uppercase" }}
          >
            Fleet Unit
          </span>
          <span
            style={{
              fontSize: "1.25rem",
              fontFamily: "monospace",
              fontWeight: 900 }}
          >
            {ambulance.vehicleNumber}
          </span>
        </div>

        {/* Status Badge Row */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            alignItems: "center" }}
        >
          {/* Status Badge */}
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              padding: "5px 10px",
              borderRadius: "8px",
              background: statusConfig.bg,
              color: statusConfig.color,
              border: `1px solid ${statusConfig.borderColor}`,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              gap: "4px" }}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </span>

          {/* Equipment Level Badge */}
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              padding: "5px 10px",
              borderRadius: "8px",
              background: equipmentConfig.bg,
              color: equipmentConfig.color,
              border: `1px solid ${equipmentConfig.borderColor}`,
              textTransform: "uppercase",
              letterSpacing: "0.08em" }}
          >
            {equipmentConfig.label}
          </span>

          {/* Offline Badge */}
          {!ambulance.isActive && (
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                padding: "5px 10px",
                borderRadius: "8px",
                background: "var(--bg-card)",
                color: "#6b7280",
                border: "1px solid var(--bg-card)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "flex",
                alignItems: "center",
                gap: "4px" }}
            >
              <WifiOff size={10} />
              OFFLINE
            </span>
          )}

          {/* Active Indicator */}
          {isActive && (
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                padding: "5px 10px",
                borderRadius: "8px",
                background: "var(--bg-card)",
                color: "#ef4444",
                border: "1px solid var(--bg-card)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "flex",
                alignItems: "center",
                gap: "4px" }}
            >
              <Wifi size={10} />
              LIVE
            </span>
          )}
        </div>

        {/* Status Description */}
        <p
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            fontStyle: "italic" }}
        >
          {statusConfig.description}
        </p>

        {/* Driver Info */}
        <div
          className="neu-inner" style={{ display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 10px",
             borderRadius: "14px", padding: "6px" }}
        >
          <User size={14} style={{ color: "var(--text-muted)" }} />
          <p style={{ fontSize: "12px", fontWeight: 700 }}>
            {ambulance.driverName}
          </p>
          {ambulance.driverPhone && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: "10px",
                fontFamily: "monospace",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "4px" }}
            >
              <Phone size={10} />
              {ambulance.driverPhone}
            </span>
          )}
        </div>

        {/* ETA & Distance */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px" }}
        >
          <div
            style={{
              padding: "14px",
              background: statusConfig.bg,
              borderRadius: "14px",
              textAlign: "center",
              border: `1px solid ${statusConfig.borderColor}`,
              transition: "all 0.2s ease" }}
          >
            <p
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: statusConfig.color,
                textTransform: "uppercase",
                marginBottom: "4px",
                letterSpacing: "0.08em" }}
            >
              ETA
            </p>
            <p
              style={{
                fontSize: "1.5rem",
                fontWeight: 900,
                color: statusConfig.color }}
            >
              {ambulance.eta || "--"}m
            </p>
          </div>
          <div
            style={{
              padding: "14px",
              background: "var(--bg-card)",
              borderRadius: "14px",
              textAlign: "center",
              border: "1px solid transparent" }}
          >
            <p
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                marginBottom: "4px",
                letterSpacing: "0.08em" }}
            >
              Distance
            </p>
            <p style={{ fontSize: "1.5rem", fontWeight: 900 }}>
              {ambulance.distance || "--"}km
            </p>
          </div>
        </div>

        {/* Action Prompt */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "8px",
            borderRadius: "10px",
            background: "var(--bg-card)",
            border: "1px solid var(--bg-card)" }}
        >
          <Clock size={12} style={{ color: "#93c5fd" }} />
          <p
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#93c5fd",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              textAlign: "center" }}
          >
            Tap for Chat / Call / Cancel
          </p>
        </div>
      </button>
    </div>
  );
}
