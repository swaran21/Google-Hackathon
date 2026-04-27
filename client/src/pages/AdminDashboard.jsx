import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  getActiveEmergencies,
  getAdminAmbulances,
  getAdminHealth,
  getAdminHospitals,
  getAdminUsers,
  getDashboard,
} from "../services/api";
import socket from "../services/socket";
import { useSocket } from "../hooks/useSocket";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bed,
  BellRing,
  Building2,
  Clock3,
  Filter,
  HeartPulse,
  LayoutDashboard,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

const DEFAULT_CENTER = [17.385, 78.4867];

const EMERGENCY_ICONS = {
  accident: "🚗",
  cardiac: "❤️",
  fire: "🔥",
  flood: "🌊",
  breathing: "🫁",
  stroke: "🧠",
  other: "⚠️",
};

const ROLE_LABELS = {
  user: "User",
  driver: "Driver",
  hospital: "Hospital",
  admin: "Admin",
};

const STATUS_LABELS = {
  available: "Available",
  dispatched: "Dispatched",
  en_route: "En Route",
  at_scene: "At Scene",
  returning: "Returning",
  offline: "Offline",
};

const HEALTH_COLORS = {
  connected: "#22c55e",
  ready: "#22c55e",
  active: "#22c55e",
  simulated: "#38bdf8",
  disconnected: "#ef4444",
};

const createIcon = ({ emoji, color, borderColor, shadowColor, size = 34 }) =>
  L.divIcon({
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:9999px;
      border:2px solid ${borderColor};
      background: ${color};
      color:#fff;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:${Math.max(15, size - 14)}px;
      box-shadow:0 0 14px ${shadowColor};
      transform: translateZ(0);
    ">${emoji}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const emergencyIcon = createIcon({
  emoji: "🆘",
  color: "linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)",
  borderColor: "#fecaca",
  shadowColor: "rgba(239, 68, 68, 0.45)",
});

const ambulanceIcon = createIcon({
  emoji: "🚑",
  color: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
  borderColor: "#bfdbfe",
  shadowColor: "rgba(59, 130, 246, 0.45)",
});

const hospitalIcon = createIcon({
  emoji: "🏥",
  color: "linear-gradient(135deg, #15803d 0%, #22c55e 100%)",
  borderColor: "#bbf7d0",
  shadowColor: "rgba(34, 197, 94, 0.45)",
});

const getCoords = (record) => {
  const coordinates = record?.location?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const [lng, lat] = coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

const formatPercent = (value) =>
  `${Math.round(Math.max(0, Math.min(100, value || 0)))}%`;

const formatETA = (eta) => {
  if (!Number.isFinite(eta)) return "—";
  return `${Math.round(eta)} min`;
};

const formatTimeAgo = (value) => {
  if (!value) return "just now";
  const delta = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(delta) || delta < 0) return "just now";
  const minutes = Math.max(1, Math.round(delta / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  accent = "var(--bg-card)",
}) {
  return (
    <div
      className="neu-card"
      style={{
        padding: "22px",
        borderRadius: "20px",
        borderLeft: `3px solid ${color}`,
        boxShadow: `inset 0 1px 0 ${color}30, 0 0 30px ${color}08`,
        background: accent }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "14px" }}
      >
        <Icon size={18} style={{ color }} />
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--text-muted)" }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: "2rem",
          fontWeight: 900,
          marginBottom: "4px",
          letterSpacing: "-0.04em" }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, subtitle, icon: Icon, children, right }) {
  return (
    <div
      className="neu-card"
      style={{ padding: "22px", borderRadius: "22px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "16px" }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "6px" }}
          >
            {Icon && <Icon size={15} style={{ color: "#f97316" }} />}
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--text-muted)" }}
            >
              {title}
            </h3>
          </div>
          {subtitle && (
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                maxWidth: "58ch" }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ value, color }) {
  return (
    <div
      style={{
        height: "7px",
        borderRadius: "999px",
        overflow: "hidden",
        background: "var(--bg-card)" }}
    >
      <div
        style={{
          width: formatPercent(value),
          height: "100%",
          background: color,
          borderRadius: "999px" }}
      />
    </div>
  );
}

function StatusPill({ children, color, background }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 10px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color,
        background }}
    >
      {children}
    </span>
  );
}

function FitMarkers({ markers }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!markers.length) return;
    const bounds = L.latLngBounds(markers.map(({ lat, lng }) => [lat, lng]));
    if (!bounds.isValid()) return;
    if (fittedRef.current) return;
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    fittedRef.current = true;
  }, [markers, map]);

  return null;
}

function EmergencyRow({ emergency }) {
  const typeLabel = emergency?.type
    ? emergency.type.charAt(0).toUpperCase() + emergency.type.slice(1)
    : "Unknown";
  return (
    <div
      className="neu-card" style={{ padding: "16px 18px", borderRadius: "16px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "1.35rem" }}>
          {EMERGENCY_ICONS[emergency.type] || "⚠️"}
        </span>
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>
            {emergency.patientName}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {typeLabel} • {emergency.patientPhone}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          justifyContent: "flex-end" }}
      >
        {emergency.eta != null && (
          <StatusPill color="#60a5fa" background="var(--bg-card)">
            ETA {formatETA(emergency.eta)}
          </StatusPill>
        )}
        {emergency.assignedAmbulance && (
          <StatusPill color="#93c5fd" background="var(--bg-card)">
            🚑 {emergency.assignedAmbulance.vehicleNumber}
          </StatusPill>
        )}
        <span className={`status-badge status-${emergency.status}`}>
          {emergency.status}
        </span>
      </div>
    </div>
  );
}

function HospitalRow({ hospital }) {
  const bedPct =
    hospital.totalBeds > 0
      ? (hospital.availableBeds / hospital.totalBeds) * 100
      : 0;
  const icuPct =
    hospital.icuTotal > 0
      ? (hospital.icuAvailable / hospital.icuTotal) * 100
      : 0;
  const readiness = Math.round((bedPct + icuPct) / 2);
  return (
    <div
      className="neu-card" style={{ padding: "16px 18px", borderRadius: "16px" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          marginBottom: "12px" }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.92rem" }}>
            {hospital.name}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {hospital.address}
          </div>
        </div>
        <StatusPill color="#4ade80" background="var(--bg-card)">
          {formatPercent(readiness)} ready
        </StatusPill>
      </div>
      <div style={{ display: "grid", gap: "10px" }}>
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              marginBottom: "5px" }}
          >
            <span style={{ color: "var(--text-muted)" }}>Beds</span>
            <span style={{ color: "var(--text-secondary)" }}>
              {hospital.availableBeds}/{hospital.totalBeds}
            </span>
          </div>
          <ProgressBar
            value={bedPct}
            color="linear-gradient(90deg, #22c55e 0%, #4ade80 100%)"
          />
        </div>
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              marginBottom: "5px" }}
          >
            <span style={{ color: "var(--text-muted)" }}>ICU</span>
            <span style={{ color: "var(--text-secondary)" }}>
              {hospital.icuAvailable}/{hospital.icuTotal}
            </span>
          </div>
          <ProgressBar
            value={icuPct}
            color="linear-gradient(90deg, #f97316 0%, #fb923c 100%)"
          />
        </div>
      </div>
    </div>
  );
}

function HealthRow({ label, value, tone }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        padding: "12px 0",
        borderBottom: "1px solid var(--bg-card)" }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{label}</div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          Live system indicator
        </div>
      </div>
      <StatusPill color={tone} background={`${tone}18`}>
        {value}
      </StatusPill>
    </div>
  );
}

function SystemHealthCard({ health }) {
  if (!health) {
    return (
      <div
        className="neu-card"
        style={{
          padding: "20px",
          borderRadius: "18px",
          color: "var(--text-muted)" }}
      >
        Loading system health...
      </div>
    );
  }

  return (
    <div
      className="neu-card" style={{ padding: "20px", borderRadius: "18px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px" }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--text-muted)" }}
          >
            System Health
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              marginTop: "4px" }}
          >
            Core services and runtime status
          </div>
        </div>
        <ShieldCheck size={18} style={{ color: "#22c55e" }} />
      </div>
      <div style={{ display: "grid", gap: "2px" }}>
        <HealthRow
          label="Database"
          value={health.database}
          tone={HEALTH_COLORS[health.database] || "#60a5fa"}
        />
        <HealthRow
          label="Socket room"
          value={health.socketio}
          tone={HEALTH_COLORS[health.socketio] || "#60a5fa"}
        />
        <HealthRow
          label="Triage"
          value={health.triage}
          tone={HEALTH_COLORS[health.triage] || "#60a5fa"}
        />
        <HealthRow
          label="Routing"
          value={health.routing}
          tone={HEALTH_COLORS[health.routing] || "#60a5fa"}
        />
        <HealthRow
          label="Notifications"
          value={health.notifications}
          tone={HEALTH_COLORS[health.notifications] || "#38bdf8"}
        />
      </div>
      <div
        style={{
          marginTop: "14px",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "10px" }}
      >
        <div
          className="neu-card" style={{ padding: "14px", borderRadius: "14px" }}
        >
          <div
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              marginBottom: "5px" }}
          >
            Uptime
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
            {Math.round((health.uptimeSeconds || 0) / 60)}m
          </div>
        </div>
        <div
          className="neu-card" style={{ padding: "14px", borderRadius: "14px" }}
        >
          <div
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              marginBottom: "5px" }}
          >
            Notifications
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
            {formatNumber(health.notificationFeedSize || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmergencyMapCard({ emergencies, ambulances, hospitals }) {
  const markers = useMemo(() => {
    const nextMarkers = [];

    emergencies.forEach((emergency) => {
      const coords = getCoords(emergency);
      if (!coords) return;
      nextMarkers.push({
        ...coords,
        key: `emergency-${emergency._id}`,
        icon: emergencyIcon,
        label: `${emergency.patientName} • ${emergency.type}`,
        popup: emergency,
        kind: "emergency",
      });
    });

    ambulances.forEach((ambulance) => {
      const coords = getCoords(ambulance);
      if (!coords) return;
      nextMarkers.push({
        ...coords,
        key: `ambulance-${ambulance._id}`,
        icon: ambulanceIcon,
        label: `${ambulance.vehicleNumber} • ${ambulance.status}`,
        popup: ambulance,
        kind: "ambulance",
      });
    });

    hospitals.forEach((hospital) => {
      const coords = getCoords(hospital);
      if (!coords) return;
      nextMarkers.push({
        ...coords,
        key: `hospital-${hospital._id}`,
        icon: hospitalIcon,
        label: hospital.name,
        popup: hospital,
        kind: "hospital",
      });
    });

    return nextMarkers.slice(0, 60);
  }, [emergencies, ambulances, hospitals]);

  const center = markers[0] ? [markers[0].lat, markers[0].lng] : DEFAULT_CENTER;

  return (
    <SectionCard
      title="Real-time Emergency Map"
      subtitle="Track active emergencies, ambulance positions, and hospital coverage in one live view."
      icon={MapPin}
      right={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            justifyContent: "flex-end" }}
        >
          <StatusPill color="#60a5fa" background="var(--bg-card)">
            {emergencies.length} incidents
          </StatusPill>
          <StatusPill color="#22c55e" background="var(--bg-card)">
            {ambulances.length} ambulances
          </StatusPill>
          <StatusPill color="#f97316" background="var(--bg-card)">
            {hospitals.length} hospitals
          </StatusPill>
        </div>
      }
    >
      <div
        style={{
          height: "420px",
          position: "relative",
          overflow: "hidden",
          borderRadius: "18px" }}
      >
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitMarkers markers={markers} />
          {markers.map((marker) => (
            <Marker
              key={marker.key}
              position={[marker.lat, marker.lng]}
              icon={marker.icon}
            >
              <Popup>
                <div style={{ minWidth: "190px" }}>
                  <div style={{ fontWeight: 800, marginBottom: "4px" }}>
                    {marker.kind === "emergency" &&
                      `Emergency: ${marker.popup.patientName}`}
                    {marker.kind === "ambulance" &&
                      `Ambulance: ${marker.popup.vehicleNumber}`}
                    {marker.kind === "hospital" && marker.popup.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#475569" }}>
                    {marker.label}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <div
          style={{
            position: "absolute",
            left: "14px",
            bottom: "14px",
            display: "grid",
            gap: "6px",
            padding: "12px",
            borderRadius: "14px",
            background: "var(--bg-card)",
            backdropFilter: "blur(18px)",
            border: "1px solid var(--bg-card)" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 700 }}
          >
            <AlertCircle size={14} /> Live incident layer
          </div>
          <div style={{ fontSize: "11px", color: "var(--bg-card)" }}>
            Markers update as ambulance and status events stream in.
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [emergencies, setEmergencies] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [users, setUsers] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const loadAdminData = useCallback(async ({ initial = false } = {}) => {
    if (initial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [
        dashboardRes,
        emergenciesRes,
        ambulancesRes,
        hospitalsRes,
        usersRes,
        healthRes,
      ] = await Promise.all([
        getDashboard(),
        getActiveEmergencies(),
        getAdminAmbulances(),
        getAdminHospitals(),
        getAdminUsers(),
        getAdminHealth(),
      ]);

      setDashboard(dashboardRes.data.data);
      setEmergencies(emergenciesRes.data.data || []);
      setAmbulances(ambulancesRes.data.data || []);
      setHospitals(hospitalsRes.data.data || []);
      setUsers(usersRes.data.data || []);
      setHealth(
        healthRes.data.data || dashboardRes.data.data?.systemHealth || null,
      );
    } catch (err) {
      console.error("Failed to load admin dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData({ initial: true });
    socket.emit("admin:join");
  }, [loadAdminData]);

  const handleRefresh = useCallback(() => {
    loadAdminData({ initial: false });
  }, [loadAdminData]);

  useSocket(socket, "emergency:new", handleRefresh);
  useSocket(socket, "emergency:status-change", handleRefresh);
  useSocket(socket, "ambulance:status-change", handleRefresh);
  useSocket(socket, "ambulance:location-update", handleRefresh);

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesSearch =
        !search ||
        `${user.name} ${user.email} ${user.phone || ""}`
          .toLowerCase()
          .includes(search);
      return matchesRole && matchesSearch;
    });
  }, [users, userSearch, roleFilter]);

  const emergencyTotals = dashboard?.emergencies || {};
  const ambulanceTotals = dashboard?.ambulances || {};
  const hospitalTotals = dashboard?.hospitals?.beds || {};
  const userTotals = dashboard?.users || {};
  const operations = dashboard?.operations || {};
  const notificationFeed = dashboard?.notifications || [];

  const fleetByStatus = useMemo(() => {
    const counts = ambulances.reduce((accumulator, ambulance) => {
      accumulator[ambulance.status] = (accumulator[ambulance.status] || 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts)
      .map(([status, count]) => ({ status, count }))
      .sort((left, right) => right.count - left.count);
  }, [ambulances]);

  const emergencySeverityMix = useMemo(() => {
    const counts = dashboard?.emergencies?.bySeverity || [];
    return counts.map((item) => ({
      label: `Severity ${item._id}`,
      value: item.count,
    }));
  }, [dashboard]);

  const averageEta = useMemo(() => {
    const etaValues = emergencies
      .map((item) => Number(item.eta))
      .filter((value) => Number.isFinite(value));
    if (!etaValues.length) return null;
    return etaValues.reduce((sum, value) => sum + value, 0) / etaValues.length;
  }, [emergencies]);

  const responsePressure = useMemo(() => {
    const weighted = emergencies.reduce(
      (sum, item) => sum + (Number(item.severity) || 0),
      0,
    );
    if (!emergencies.length) return 0;
    return Math.min(
      100,
      Math.round((weighted / (emergencies.length * 5)) * 100),
    );
  }, [emergencies]);

  if (loading) {
    return (
      <div
        className="page-enter"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          gap: "16px" }}
      >
        <div className="spinner" />
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            color: "var(--text-muted)" }}
        >
          Loading Command Center
        </span>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div
        className="page-enter"
        style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}
      >
        <p style={{ color: "var(--text-muted)" }}>
          Failed to load dashboard data.
        </p>
      </div>
    );
  }

  return (
    <div
      className="page-enter"
      style={{ minHeight: "100vh", padding: "96px 20px 48px" }}
    >
      <div
        style={{ maxWidth: "1480px", margin: "0 auto", position: "relative" }}
      >
        <div
          style={{
            position: "absolute",
            inset: "-40px -20px auto",
            height: "240px",
            background:
              "radial-gradient(circle at 20% 20%, var(--bg-card), transparent 35%), radial-gradient(circle at 80% 10%, var(--bg-card), transparent 30%), radial-gradient(circle at 50% 100%, var(--bg-card), transparent 30%)",
            pointerEvents: "none",
            filter: "blur(10px)",
            zIndex: -1 }}
        />

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "16px",
            marginBottom: "22px" }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px" }}
            >
              <LayoutDashboard size={14} style={{ color: "#f97316" }} />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "var(--text-muted)" }}
              >
                Admin Command Center
              </span>
            </div>
            <h1
              style={{
                fontSize: "clamp(2rem, 3vw, 3rem)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 1.02 }}
            >
              Superior <span className="gradient-text">Control</span> for
              ResQNet
            </h1>
            <p
              style={{
                fontSize: "0.94rem",
                color: "var(--text-secondary)",
                marginTop: "8px",
                maxWidth: "70ch" }}
            >
              Live command view for incidents, fleet posture, hospital capacity,
              user directory, and platform health.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="neu-button"
            style={{
              padding: "11px 18px",
              borderRadius: "14px",
              border: "1px solid transparent",
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
              fontFamily: "var(--font-family)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-card)";
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: refreshing ? "spin 0.8s linear infinite" : "none" }}
            />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "16px",
            marginBottom: "22px" }}
        >
          <StatCard
            icon={AlertCircle}
            label="Active Emergencies"
            value={formatNumber(emergencyTotals.active)}
            sub={`${formatNumber(emergencyTotals.total)} total cases`}
            color="#ef4444"
            accent="var(--bg-card)"
          />
          <StatCard
            icon={Activity}
            label="Available Ambulances"
            value={formatNumber(ambulanceTotals.available)}
            sub={`${formatNumber(ambulanceTotals.total)} fleet size`}
            color="#3b82f6"
            accent="var(--bg-card)"
          />
          <StatCard
            icon={Bed}
            label="Beds Available"
            value={formatNumber(hospitalTotals.availableBeds)}
            sub={`${formatNumber(hospitalTotals.totalBeds)} total capacity`}
            color="#22c55e"
            accent="var(--bg-card)"
          />
          <StatCard
            icon={Building2}
            label="ICU Available"
            value={formatNumber(hospitalTotals.availableICU)}
            sub={`${formatNumber(hospitalTotals.totalICU)} total ICU`}
            color="#f97316"
            accent="var(--bg-card)"
          />
          <StatCard
            icon={Users}
            label="Registered Users"
            value={formatNumber(userTotals.total)}
            sub={`${formatNumber(filteredUsers.length)} visible in directory`}
            color="#a78bfa"
            accent="var(--bg-card)"
          />
          <StatCard
            icon={Clock3}
            label="Average ETA"
            value={formatETA(averageEta)}
            sub={averageEta ? "From active incidents" : "No ETA data yet"}
            color="#eab308"
            accent="var(--bg-card)"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.55fr) minmax(340px, 0.95fr)",
            gap: "22px",
            alignItems: "start" }}
        >
          <div style={{ display: "grid", gap: "22px" }}>
            <EmergencyMapCard
              emergencies={emergencies}
              ambulances={ambulances}
              hospitals={hospitals}
            />

            <SectionCard
              title="Response Time Analytics"
              subtitle="High-severity pressure, ETA spread, and fleet readiness at a glance."
              icon={BarChart3}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px",
                  marginBottom: "14px" }}
              >
                <div
                  className="neu-card" style={{ padding: "16px", borderRadius: "16px" }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--text-muted)",
                      marginBottom: "6px" }}
                  >
                    Pressure index
                  </div>
                  <div style={{ fontSize: "1.55rem", fontWeight: 900 }}>
                    {responsePressure}%
                  </div>
                  <ProgressBar
                    value={responsePressure}
                    color="linear-gradient(90deg, #ef4444 0%, #f97316 100%)"
                  />
                </div>
                <div
                  className="neu-card" style={{ padding: "16px", borderRadius: "16px" }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--text-muted)",
                      marginBottom: "6px" }}
                  >
                    Outstanding emergencies
                  </div>
                  <div style={{ fontSize: "1.55rem", fontWeight: 900 }}>
                    {formatNumber(emergencyTotals.active)}
                  </div>
                  <div
                    style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                  >
                    Live incidents being coordinated
                  </div>
                </div>
                <div
                  className="neu-card" style={{ padding: "16px", borderRadius: "16px" }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--text-muted)",
                      marginBottom: "6px" }}
                  >
                    Resolved today
                  </div>
                  <div style={{ fontSize: "1.55rem", fontWeight: 900 }}>
                    {formatNumber(emergencyTotals.resolved)}
                  </div>
                  <div
                    style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                  >
                    Closed incidents
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px" }}
              >
                {emergencySeverityMix.length > 0 ? (
                  emergencySeverityMix.map((item) => (
                    <div
                      key={item.label}
                      className="neu-card" style={{ padding: "14px", borderRadius: "14px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px" }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--text-secondary)" }}
                        >
                          {item.label}
                        </span>
                        <span style={{ fontWeight: 800 }}>{item.value}</span>
                      </div>
                      <ProgressBar
                        value={
                          (item.value /
                            Math.max(1, emergencyTotals.total || item.value)) *
                          100
                        }
                        color="linear-gradient(90deg, #f97316 0%, #ef4444 100%)"
                      />
                    </div>
                  ))
                ) : (
                  <div
                    className="neu-card"
                    style={{
                      padding: "14px",
                      borderRadius: "14px",
                      color: "var(--text-muted)" }}
                  >
                    No severity data yet.
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Ambulance Fleet Status"
              subtitle="Status, equipment level, and rating-aware fleet signal for the whole response layer."
              icon={Activity}
              right={
                <StatusPill color="#60a5fa" background="var(--bg-card)">
                  {ambulances.length} units
                </StatusPill>
              }
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "10px",
                  marginBottom: "14px" }}
              >
                {fleetByStatus.map((item) => (
                  <div
                    key={item.status}
                    className="neu-card" style={{ padding: "14px", borderRadius: "14px" }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: "6px" }}
                    >
                      {item.status.replace("_", " ")}
                    </div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>
                      {item.count}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "640px" }}
                >
                  <thead>
                    <tr
                      style={{
                        textAlign: "left",
                        color: "var(--text-muted)",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em" }}
                    >
                      <th style={{ padding: "10px 12px" }}>Vehicle</th>
                      <th style={{ padding: "10px 12px" }}>Status</th>
                      <th style={{ padding: "10px 12px" }}>Equipment</th>
                      <th style={{ padding: "10px 12px" }}>Rating</th>
                      <th style={{ padding: "10px 12px" }}>Activation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ambulances.slice(0, 8).map((ambulance) => (
                      <tr
                        key={ambulance._id}
                        style={{
                          borderTop: "1px solid var(--bg-card)" }}
                      >
                        <td style={{ padding: "12px" }}>
                          <div style={{ fontWeight: 800 }}>
                            {ambulance.vehicleNumber}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)" }}
                          >
                            {ambulance.driverName}
                          </div>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span
                            className={`status-badge status-${ambulance.status}`}
                          >
                            {STATUS_LABELS[ambulance.status] ||
                              ambulance.status}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "var(--text-secondary)" }}
                        >
                          {ambulance.equipmentLevel.replace("_", " ")}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "var(--text-secondary)" }}
                        >
                          {ambulance.ratingSummary?.average
                            ? `${ambulance.ratingSummary.average.toFixed(1)} / 5`
                            : "No ratings yet"}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "var(--text-secondary)" }}
                        >
                          {ambulance.isActive ? "Active" : "Inactive"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard
              title="Hospital Capacity Gauges"
              subtitle="Bed and ICU balance across the network, weighted for fast triage decisions."
              icon={Building2}
              right={
                <StatusPill color="#4ade80" background="var(--bg-card)">
                  {hospitals.length} hospitals
                </StatusPill>
              }
            >
              <div style={{ display: "grid", gap: "12px" }}>
                {hospitals.slice(0, 8).map((hospital) => (
                  <HospitalRow key={hospital._id} hospital={hospital} />
                ))}
              </div>
            </SectionCard>
          </div>

          <div
            style={{
              display: "grid",
              gap: "22px",
              position: "sticky",
              top: "92px",
              alignSelf: "start" }}
          >
            <SystemHealthCard health={health || dashboard.systemHealth} />

            <SectionCard
              title="User Management"
              subtitle="Search the active user directory and see role distribution at a glance."
              icon={Users}
              right={
                <StatusPill color="#c084fc" background="var(--bg-card)">
                  {filteredUsers.length} visible
                </StatusPill>
              }
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "8px",
                  marginBottom: "12px" }}
              >
                {(dashboard.users?.byRole || []).map((item) => (
                  <div
                    key={item._id}
                    className="neu-card" style={{ padding: "10px 12px", borderRadius: "12px" }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "4px" }}
                    >
                      {ROLE_LABELS[item._id] || item._id}
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900 }}>
                      {item.count}
                    </div>
                  </div>
                ))}
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      setRoleFilter(roleFilter === role ? "all" : role)
                    }
                    style={{
                      padding: "9px 10px",
                      borderRadius: "12px",
                      border:
                        roleFilter === role
                          ? "1px solid var(--bg-card)"
                          : "1px solid transparent",
                      background:
                        roleFilter === role
                          ? "var(--bg-card)"
                          : "var(--bg-card)",
                      color: "var(--text-secondary)",
                      fontSize: "12px",
                      fontWeight: 700 }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                style={{ display: "flex", gap: "10px", marginBottom: "14px" }}
              >
                <div style={{ position: "relative", flex: 1 }}>
                  <Search
                    size={14}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)" }}
                  />
                  <input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Search name, email, or phone"
                    style={{
                      width: "100%",
                      padding: "11px 12px 11px 36px",
                      borderRadius: "12px",
                      border: "1px solid transparent",
                      background: "var(--bg-card)",
                      color: "var(--text-primary)",
                      outline: "none",
                      fontFamily: "var(--font-family)" }}
                  />
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "0 12px",
                    borderRadius: "12px",
                    border: "1px solid transparent",
                    background: "var(--bg-card)",
                    color: "var(--text-muted)" }}
                >
                  <Filter size={14} />
                </div>
              </div>
              <div
                style={{
                  maxHeight: "340px",
                  overflowY: "auto",
                  borderRadius: "14px" }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr
                      style={{
                        textAlign: "left",
                        color: "var(--text-muted)",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em" }}
                    >
                      <th style={{ padding: "10px 0" }}>Name</th>
                      <th style={{ padding: "10px 0" }}>Role</th>
                      <th style={{ padding: "10px 0" }}>Linked Asset</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.slice(0, 10).map((user) => (
                      <tr
                        key={user._id}
                        style={{
                          borderTop: "1px solid var(--bg-card)" }}
                      >
                        <td style={{ padding: "12px 0" }}>
                          <div style={{ fontWeight: 800 }}>{user.name}</div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)" }}
                          >
                            {user.email}
                          </div>
                        </td>
                        <td style={{ padding: "12px 0" }}>
                          <StatusPill
                            color="#c084fc"
                            background="var(--bg-card)"
                          >
                            {ROLE_LABELS[user.role] || user.role}
                          </StatusPill>
                        </td>
                        <td
                          style={{
                            padding: "12px 0",
                            color: "var(--text-secondary)",
                            fontSize: "12px" }}
                        >
                          {user.role === "driver" && user.assignedAmbulance
                            ? user.assignedAmbulance.vehicleNumber
                            : null}
                          {user.role === "hospital" && user.assignedHospital
                            ? user.assignedHospital.name
                            : null}
                          {user.role === "user" ? "Public account" : null}
                          {user.role === "admin" ? "Platform admin" : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard
              title="Notifications"
              subtitle="Recent dispatch messages and simulated notification events."
              icon={BellRing}
              right={
                <StatusPill color="#60a5fa" background="var(--bg-card)">
                  {notificationFeed.length} recent
                </StatusPill>
              }
            >
              <div
                style={{
                  display: "grid",
                  gap: "10px",
                  maxHeight: "320px",
                  overflowY: "auto" }}
              >
                {notificationFeed.length > 0 ? (
                  notificationFeed.slice(0, 8).map((notification) => (
                    <div
                      key={notification.id}
                      className="neu-card" style={{ padding: "14px", borderRadius: "14px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "10px",
                          marginBottom: "8px" }}
                      >
                        <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>
                          {notification.type.toUpperCase()}
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)" }}
                        >
                          {formatTimeAgo(notification.timestamp)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          lineHeight: 1.5 }}
                      >
                        {notification.message}
                      </div>
                      <div
                        style={{
                          marginTop: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "10px",
                          fontSize: "11px",
                          color: "var(--text-muted)" }}
                      >
                        <span>{notification.provider}</span>
                        <span>{notification.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className="neu-card"
                    style={{
                      padding: "16px",
                      borderRadius: "14px",
                      color: "var(--text-muted)" }}
                  >
                    Notification log will appear here once dispatch activity
                    begins.
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Operational Snapshot"
              subtitle="Backlog, status distribution, and real-time emergency mix."
              icon={TrendingUp}
            >
              <div style={{ display: "grid", gap: "10px" }}>
                <div
                  className="neu-card" style={{ padding: "16px", borderRadius: "14px" }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--text-muted)",
                      marginBottom: "6px" }}
                  >
                    Backlog
                  </div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>
                    {formatNumber(operations.backlog || emergencies.length)}
                  </div>
                  <div
                    style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                  >
                    Active items awaiting resolution
                  </div>
                </div>
                <div
                  className="neu-card" style={{ padding: "16px", borderRadius: "14px" }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--text-muted)",
                      marginBottom: "10px" }}
                  >
                    Emergency statuses
                  </div>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {(operations.emergencyStatuses || [])
                      .slice(0, 5)
                      .map((item) => (
                        <div
                          key={item._id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "10px",
                            fontSize: "12px" }}
                        >
                          <span style={{ color: "var(--text-secondary)" }}>
                            {item._id}
                          </span>
                          <strong>{item.count}</strong>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
            gap: "22px",
            marginTop: "22px" }}
        >
          <SectionCard
            title="Recent Emergencies"
            subtitle="The latest patient-facing incidents and their current dispatch posture."
            icon={HeartPulse}
            right={
              <StatusPill color="#ef4444" background="var(--bg-card)">
                {emergencies.length} active
              </StatusPill>
            }
          >
            <div style={{ display: "grid", gap: "10px" }}>
              {dashboard.recentEmergencies?.length > 0 ? (
                dashboard.recentEmergencies.map((emergency) => (
                  <EmergencyRow key={emergency._id} emergency={emergency} />
                ))
              ) : (
                <div
                  className="neu-card"
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    borderRadius: "16px" }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>
                    ✅
                  </div>
                  <p
                    style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}
                  >
                    No emergencies recorded yet
                  </p>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Hospital Capacity"
            subtitle="Capacity-aware routing view for the entire care network."
            icon={Building2}
            right={
              <StatusPill color="#22c55e" background="var(--bg-card)">
                {hospitalTotals.availableBeds} beds open
              </StatusPill>
            }
          >
            <div style={{ display: "grid", gap: "10px" }}>
              {hospitals.length > 0 ? (
                hospitals
                  .slice(0, 10)
                  .map((hospital) => (
                    <HospitalRow key={hospital._id} hospital={hospital} />
                  ))
              ) : (
                <div
                  className="neu-card"
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    borderRadius: "16px",
                    color: "var(--text-muted)" }}
                >
                  No hospital data available.
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
