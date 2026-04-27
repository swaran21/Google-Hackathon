import { useEffect, useState } from "react";
import { getMyEmergencies, cancelEmergencyRequest } from "../services/api";
import {
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  MapPin,
  Truck,
  Building,
} from "lucide-react";
import FeedbackForm from "../components/FeedbackForm";

export default function BookingsPage() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [ratingEmergency, setRatingEmergency] = useState(null);

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const fetchEmergencies = async () => {
    try {
      setLoading(true);
      const res = await getMyEmergencies();
      setEmergencies(res.data.data || []);
    } catch (err) {
      setError("Failed to load your emergency bookings.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (
      !window.confirm("Are you sure you want to cancel this emergency request?")
    )
      return;

    try {
      setCancellingId(id);
      await cancelEmergencyRequest(id);
      // Refresh the list
      await fetchEmergencies();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel emergency.");
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
      case "dispatched":
      case "en_route":
      case "at_scene":
        return <Activity size={20} color="#3b82f6" />;
      case "resolved":
        return <CheckCircle size={20} color="#22c55e" />;
      case "cancelled":
        return <XCircle size={20} color="#ef4444" />;
      default:
        return <Clock size={20} color="#a8a29e" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
      case "dispatched":
      case "en_route":
      case "at_scene":
        return "rgba(59, 130, 246, 0.1)"; // blue
      case "resolved":
        return "rgba(34, 197, 94, 0.1)"; // green
      case "cancelled":
        return "rgba(239, 68, 68, 0.1)"; // red
      default:
        return "var(--bg-card)";
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case "pending":
      case "dispatched":
      case "en_route":
      case "at_scene":
        return "var(--color-info)";
      case "resolved":
        return "var(--color-success)";
      case "cancelled":
        return "var(--color-danger)";
      default:
        return "var(--text-primary)";
    }
  };

  const renderStars = (value) => {
    const rating = Number(value || 0);
    if (!Number.isFinite(rating) || rating <= 0) return "No ratings";
    return `${"★".repeat(Math.round(rating))}${"☆".repeat(5 - Math.round(rating))} (${rating.toFixed(2)})`;
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh" }}
      >
        <div
          style={{
            animation: "spin 1s linear infinite",
            width: "40px",
            height: "40px",
            border: "3px solid transparent",
            borderTopColor: "#ef4444",
            borderRadius: "50%" }}
        />
      </div>
    );
  }

  return (
    <>
      <div
        className="page-enter"
        style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 24px" }}
      >
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "3rem",
              fontWeight: 900,
              letterSpacing: "-0.05em",
              marginBottom: "8px" }}
          >
            Mission <span style={{ color: "var(--color-danger)" }}>History</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
            Track and manage your SOS emergency requests and ambulance bookings.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "16px",
              background: "var(--bg-card)",
              border: "1px solid var(--bg-card)",
              borderRadius: "12px",
              color: "#f87171",
              marginBottom: "24px" }}
          >
            {error}
          </div>
        )}

        {emergencies.length === 0 && !error ? (
          <div
            className="neu-card"
            style={{
              padding: "48px",
              textAlign: "center",
              borderRadius: "24px" }}
          >
            <AlertCircle
              size={48}
              style={{
                color: "var(--text-muted)",
                margin: "0 auto 16px",
                opacity: 0.5 }}
            />
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                marginBottom: "8px" }}
            >
              No Bookings Found
            </h3>
            <p style={{ color: "var(--text-muted)" }}>
              You haven't made any emergency requests yet.
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {emergencies.map((em) => (
              <div
                key={em._id}
                className="neu-card"
                style={{
                  borderRadius: "20px",
                  overflow: "hidden",
                  border: "1px solid transparent" }}
              >
                <div
                  style={{
                    padding: "20px 24px",
                    background: getStatusColor(em.status),
                    borderBottom: "1px solid transparent",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px" }}
                  >
                    {getStatusIcon(em.status)}
                    <div>
                      <h3
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 800,
                          textTransform: "capitalize",
                          color: getStatusTextColor(em.status) }}
                      >
                        {em.type.replace("_", " ")} Emergency
                      </h3>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                          fontWeight: 500 }}
                      >
                        {new Date(em.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "6px 14px",
                      background: "var(--bg-primary)",
                      borderRadius: "999px",
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: getStatusTextColor(em.status),
                      border: `1px solid ${getStatusTextColor(em.status)}40` }}
                  >
                    {em.status.replace("_", " ")}
                  </div>
                </div>

                <div
                  style={{
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px" }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(250px, 1fr))",
                      gap: "20px" }}
                  >
                    <div>
                      <h4
                        style={{
                          fontSize: "0.85rem",
                          textTransform: "uppercase",
                          color: "var(--text-muted)",
                          fontWeight: 800,
                          marginBottom: "8px",
                          letterSpacing: "0.05em" }}
                      >
                        Patient Details
                      </h4>
                      <p style={{ fontWeight: 600 }}>{em.patientName}</p>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "4px" }}
                      >
                        <Phone size={14} /> {em.patientPhone}
                      </p>
                    </div>
                    <div>
                      <h4
                        style={{
                          fontSize: "0.85rem",
                          textTransform: "uppercase",
                          color: "var(--text-muted)",
                          fontWeight: 800,
                          marginBottom: "8px",
                          letterSpacing: "0.05em" }}
                      >
                        Location
                      </h4>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-secondary)",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "6px",
                          marginTop: "4px" }}
                      >
                        <MapPin
                          size={16}
                          style={{ flexShrink: 0, marginTop: "2px" }}
                        />
                        {em.location?.coordinates[1].toFixed(5)},{" "}
                        {em.location?.coordinates[0].toFixed(5)}
                      </p>
                    </div>
                  </div>

                  {(em.assignedHospital || em.assignedAmbulance) && (
                    <div
                      style={{
                        padding: "16px",
                        background: "var(--bg-secondary)",
                        borderRadius: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px" }}
                    >
                      {em.assignedHospital && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px" }}
                        >
                          <div
                            className="neu-inner" style={{  padding: "8px", borderRadius: "10px", color: "#3b82f6" }}
                          >
                            <Building size={20} />
                          </div>
                          <div>
                            <p style={{ fontWeight: 700 }}>
                              {em.assignedHospital.name}
                            </p>
                            <p
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--text-muted)" }}
                            >
                              Bed Request:{" "}
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: "var(--text-primary)" }}
                              >
                                {em.hospitalRequest?.status}
                              </span>
                            </p>
                            <p
                              style={{
                                fontSize: "0.8rem",
                                color: "#f59e0b",
                                marginTop: "4px",
                                fontWeight: 700 }}
                            >
                              Hospital Rating:{" "}
                              {renderStars(
                                em.assignedHospital?.ratingSummary?.average,
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      {em.assignedAmbulance && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px" }}
                        >
                          <div
                            className="neu-inner" style={{  padding: "8px", borderRadius: "10px", color: "#ef4444" }}
                          >
                            <Truck size={20} />
                          </div>
                          <div>
                            <p style={{ fontWeight: 700 }}>
                              {em.assignedAmbulance.vehicleNumber}
                            </p>
                            <p
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--text-muted)" }}
                            >
                              Ambulance:{" "}
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: "var(--text-primary)" }}
                              >
                                {em.ambulanceBooking?.status}
                              </span>
                              {em.eta &&
                                ` • ETA: ${Math.round(em.eta / 60)} mins`}
                            </p>
                            <p
                              style={{
                                fontSize: "0.8rem",
                                color: "#f59e0b",
                                marginTop: "4px",
                                fontWeight: 700 }}
                            >
                              Driver Rating:{" "}
                              {renderStars(
                                em.assignedAmbulance?.ratingSummary?.average,
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {em.status === "resolved" &&
                    em.assignedAmbulance &&
                    em.assignedHospital && (
                      <div
                        className="neu-inner"
                        style={{
                          padding: "20px",
                          borderRadius: "16px",
                          background: "rgba(0,0,0,0.02)" }}
                      >
                        {em.feedback?.isSubmitted ? (
                          <>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                              <CheckCircle size={18} color="var(--color-success)" />
                              <p style={{ margin: 0, fontWeight: 900, color: "var(--color-success)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                                Mission Debriefing Complete
                              </p>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "12px" }}>
                              <div className="neu-card" style={{ padding: "8px 12px", borderRadius: "10px", fontSize: "12px", fontWeight: 700 }}>
                                Driver: <span style={{ color: "#f59e0b" }}>{renderStars(em.feedback?.driverRating)}</span>
                              </div>
                              <div className="neu-card" style={{ padding: "8px 12px", borderRadius: "10px", fontSize: "12px", fontWeight: 700 }}>
                                Hospital: <span style={{ color: "#f59e0b" }}>{renderStars(em.feedback?.hospitalRating)}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: 900, color: "var(--text-primary)", fontSize: "14px" }}>
                                Service Cycle Complete
                              </p>
                              <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "12px", fontWeight: 600 }}>
                                Please finalize the mission debriefing by rating the service providers.
                              </p>
                            </div>
                            <button
                              onClick={() => setRatingEmergency(em)}
                              className="neu-button"
                              style={{
                                padding: "12px 24px",
                                borderRadius: "12px",
                                background: "var(--color-success)",
                                color: "#fff",
                                fontWeight: 900,
                                fontSize: "12px",
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                border: "none",
                                boxShadow: "0 6px 16px rgba(16, 185, 129, 0.3)" }}
                            >
                              Finalize Report
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                  {/* Actions */}
                  {["pending", "dispatched", "en_route", "at_scene"].includes(
                    em.status,
                  ) && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "12px",
                        borderTop: "1px solid transparent",
                        paddingTop: "16px",
                        marginTop: "4px" }}
                    >
                      {em.hospitalRequest?.status === "accepted" &&
                        !em.assignedAmbulance && (
                          <button
                            onClick={() => (window.location.href = "/sos")}
                            style={{
                              padding: "10px 20px",
                              background: "#22c55e",
                              color: "#052e16",
                              border: "none",
                              borderRadius: "12px",
                              fontWeight: 800,
                              cursor: "pointer",
                              transition: "all 0.2s" }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.opacity = "0.9")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.opacity = "1")
                            }
                          >
                            Book Ambulance Now
                          </button>
                        )}

                      <button
                        onClick={() => handleCancel(em._id)}
                        disabled={cancellingId === em._id}
                        style={{
                          padding: "10px 20px",
                          background: "var(--bg-card)",
                          color: "#ef4444",
                          border: "1px solid var(--bg-card)",
                          borderRadius: "12px",
                          fontWeight: 700,
                          cursor:
                            cancellingId === em._id ? "not-allowed" : "pointer",
                          opacity: cancellingId === em._id ? 0.7 : 1,
                          transition: "all 0.2s" }}
                        onMouseEnter={(e) =>
                          !cancellingId &&
                          (e.currentTarget.style.background =
                            "var(--bg-card)")
                        }
                        onMouseLeave={(e) =>
                          !cancellingId &&
                          (e.currentTarget.style.background =
                            "var(--bg-card)")
                        }
                      >
                        {cancellingId === em._id
                          ? "Cancelling..."
                          : "Cancel Request"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {ratingEmergency?._id && (
        <FeedbackForm
          emergencyId={ratingEmergency._id}
          onSubmitSuccess={async () => {
            setRatingEmergency(null);
            await fetchEmergencies();
          }}
          onCancel={() => setRatingEmergency(null)}
        />
      )}
    </>
  );
}
