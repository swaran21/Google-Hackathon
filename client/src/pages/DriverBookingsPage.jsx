import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, Activity, MapPin, Truck, Building2, User, Phone, Navigation } from "lucide-react";
import { getDriverEmergencies, getDriverHistory } from "../services/api";
import { useAuth } from "../context/AuthContext";

const EMERGENCY_LABELS = {
  accident: "Road Accident",
  cardiac: "Cardiac Arrest",
  fire: "Fire Emergency",
  flood: "Disaster/Flood",
  breathing: "Breathing Issue",
  stroke: "Stroke/Neuro",
  other: "Other Emergency",
};

const STATUS_COLORS = {
  pending: { color: "#facc15", bg: "var(--bg-card)", border: "var(--bg-card)", label: "Pending" },
  dispatched: { color: "#60a5fa", bg: "var(--bg-card)", border: "var(--bg-card)", label: "Dispatched" },
  en_route: { color: "#3b82f6", bg: "var(--bg-card)", border: "var(--bg-card)", label: "En Route" },
  at_scene: { color: "#a855f7", bg: "var(--bg-card)", border: "var(--bg-card)", label: "At Scene" },
  completed: { color: "#22c55e", bg: "var(--bg-card)", border: "var(--bg-card)", label: "Completed" },
  cancelled: { color: "#ef4444", bg: "var(--bg-card)", border: "var(--bg-card)", label: "Cancelled" },
};

export default function DriverBookingsPage() {
  const { user } = useAuth();
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDriverEmergencies();
  }, []);

  const fetchDriverEmergencies = async () => {
    try {
      setLoading(true);
      const [assignedRes, historyRes] = await Promise.all([
        getDriverEmergencies(),
        getDriverHistory(),
      ]);

      const assignedList = assignedRes.data?.data || [];
      const historyList = historyRes.data?.data || [];

      const mergedById = new Map();
      [...assignedList, ...historyList].forEach((item) => {
        if (item?._id) mergedById.set(String(item._id), item);
      });

      const merged = Array.from(mergedById.values()).sort(
        (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt),
      );

      setEmergencies(merged);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load your driving history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const ongoing = emergencies.filter(e => ["pending", "dispatched", "en_route", "at_scene"].includes(e.status));
  const completed = emergencies.filter(e => ["completed", "resolved"].includes(e.status));
  const cancelled = emergencies.filter(e => e.status === "cancelled");

  if (loading) {
    return (
      <div className="page-enter" style={{ minHeight: "100vh", padding: "100px 20px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <Activity size={32} style={{ color: "#3b82f6", animation: "pulse 2s infinite" }} />
          <span style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading Your Dispatches...</span>
        </div>
      </div>
    );
  }

  const renderEmergencyCard = (em) => {
    const statusInfo = STATUS_COLORS[em.status] || STATUS_COLORS.pending;
    
    return (
      <div key={em._id} className="neu-card" style={{ padding: "20px", borderRadius: "20px", display: "flex", flexDirection: "column", gap: "16px", transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", background: "var(--bg-card)", border: "1px solid transparent", color: "var(--text-muted)" }}>
                ID: {em._id.slice(-8)}
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
                {new Date(em.createdAt).toLocaleString()}
              </span>
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: "4px 0" }}>
              {EMERGENCY_LABELS[em.type] || em.type}
              <span style={{ background: "var(--bg-card)", color: "#ef4444", padding: "2px 8px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 900 }}>SEV {em.severity}</span>
            </h3>
          </div>
          <span style={{ padding: "6px 14px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", background: statusInfo.bg, border: `1px solid ${statusInfo.border}`, color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", background: "var(--bg-card)", padding: "16px", borderRadius: "16px", border: "1px solid transparent" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div className="neu-inner" style={{  padding: "8px", borderRadius: "10px", color: "#3b82f6"  }}><User size={18} /></div>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>Patient: {em.patientName}</p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}><Phone size={12} /> {em.patientPhone || "N/A"}</p>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div className="neu-inner" style={{  padding: "8px", borderRadius: "10px", color: "#22c55e"  }}><Building2 size={18} /></div>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{em.assignedHospital ? em.assignedHospital.name : "No Hospital"}</p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}><BedStatus status={em.hospitalRequest?.status} /></p>
            </div>
          </div>
        </div>
        
        {["pending", "dispatched", "en_route", "at_scene"].includes(em.status) && (
          <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid transparent", paddingTop: "16px", marginTop: "4px" }}>
            <Link to="/driver" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "#3b82f6", color: "#fff", textDecoration: "none", borderRadius: "12px", fontWeight: 800, transition: "all 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")} onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}>
              <Navigation size={18} /> Resume Mission
            </Link>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-enter" style={{ minHeight: "100vh", padding: "84px 20px 40px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        
        <div style={{ marginBottom: "32px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "var(--bg-card)", border: "1px solid var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}>
            <Truck size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "4px" }}>Driver Dispatches</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>View your complete mission history and active assignments</p>
          </div>
        </div>

        {error ? (
          <div className="neu-card" style={{ padding: "20px", borderRadius: "16px", border: "1px solid var(--bg-card)", background: "var(--bg-card)", color: "#fca5a5", fontWeight: 600 }}>{error}</div>
        ) : emergencies.length === 0 ? (
          <div className="neu-card" style={{ padding: "60px 20px", textAlign: "center", borderRadius: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--bg-card)", border: "1px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}><Truck size={32} /></div>
            <p style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-secondary)" }}>You have no dispatch history yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            
            {/* Ongoing Section */}
            {ongoing.length > 0 && (
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "#60a5fa", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}><Activity size={18} /> Active Missions ({ongoing.length})</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {ongoing.map(renderEmergencyCard)}
                </div>
              </div>
            )}

            {/* Completed Section */}
            {completed.length > 0 && (
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "#22c55e", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}><CheckCircle2 size={18} /> Completed Missions ({completed.length})</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {completed.map(renderEmergencyCard)}
                </div>
              </div>
            )}

            {/* Cancelled Section */}
            {cancelled.length > 0 && (
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "#ef4444", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}><XCircle size={18} /> Cancelled Requests ({cancelled.length})</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {cancelled.map(renderEmergencyCard)}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

const BedStatus = ({ status }) => {
  if (status === "accepted") return <span style={{ color: "#22c55e" }}>Bed Confirmed</span>;
  if (status === "rejected") return <span style={{ color: "#ef4444" }}>Bed Rejected</span>;
  if (status === "pending") return <span style={{ color: "#facc15" }}>Awaiting Bed</span>;
  return <span>Hospital Notified</span>;
};
