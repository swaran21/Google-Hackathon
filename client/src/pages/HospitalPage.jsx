import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bed,
  Building2,
  Check,
  ClipboardList,
  Clock3,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  Stethoscope,
  User,
  X,
  MapPin,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import DispatchControlModal from "../components/common/DispatchControlModal";
import { showToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useSocket } from "../hooks/useSocket";
import {
  addMyHospitalTreatment,
  decideHospitalBedRequest,
  getMyHospitalDashboard,
  releaseHospitalBedRequest,
  removeMyHospitalTreatment,
  updateMyHospitalBeds,
  updateMyHospitalProfile,
} from "../services/api";
import socket from "../services/socket";

const STATUS_LABELS = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  released: "Released",
};

const STATUS_COLORS = {
  pending: {
    color: "#facc15",
    bg: "rgba(250,204,21,0.12)",
    border: "rgba(250,204,21,0.25)",
  },
  accepted: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.25)",
  },
  rejected: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
  },
  released: {
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.12)",
    border: "rgba(96,165,250,0.25)",
  },
};

const EMERGENCY_LABELS = {
  accident: "Accident",
  cardiac: "Cardiac",
  fire: "Fire",
  flood: "Flood",
  breathing: "Breathing",
  stroke: "Stroke",
  other: "Other",
};

const getHospitalId = (assignedHospital) => {
  if (!assignedHospital) return null;
  return typeof assignedHospital === "string"
    ? assignedHospital
    : assignedHospital._id;
};

const splitCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "-";
  return `INR ${amount.toLocaleString("en-IN")}`;
};

export default function HospitalPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const hospitalId = useMemo(
    () => getHospitalId(user?.assignedHospital),
    [user],
  );

  const [hospital, setHospital] = useState(null);
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({
    pending: 0,
    accepted: 0,
    released: 0,
    rejected: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showDispatchPanel, setShowDispatchPanel] = useState(false);
  const [actingRequestId, setActingRequestId] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");

  const [profileDraft, setProfileDraft] = useState({
    name: "",
    address: "",
    phone: "",
    totalBeds: "",
    availableBeds: "",
    icuTotal: "",
    icuAvailable: "",
    specialtiesText: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [newTreatment, setNewTreatment] = useState({
    name: "",
    emergencyTypes: "other",
    averageCost: "",
    notes: "",
  });
  const [addingTreatment, setAddingTreatment] = useState(false);

  const refreshDashboard = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await getMyHospitalDashboard();
      const data = res.data?.data || {};
      const nextHospital = data.hospital || null;
      const nextRequests = data.requests || [];

      setHospital(nextHospital);
      setRequests(nextRequests);
      setSummary(
        data.summary || {
          pending: 0,
          accepted: 0,
          released: 0,
          rejected: 0,
          total: nextRequests.length,
        },
      );

      setSelectedRequestId((prev) => {
        if (!nextRequests.length) return null;
        if (prev && nextRequests.some((entry) => entry._id === prev))
          return prev;
        return nextRequests[0]._id;
      });
    } catch (error) {
      showToast(
        error.response?.data?.message || "Failed to load hospital dashboard",
        "error",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refreshDashboard();
    const interval = setInterval(refreshDashboard, 12000);
    return () => clearInterval(interval);
  }, [refreshDashboard]);

  useEffect(() => {
    if (!hospitalId) return;
    socket.emit("hospital:join", { hospitalId });
    return () => {
      socket.emit("hospital:leave", { hospitalId });
    };
  }, [hospitalId]);

  useEffect(() => {
    if (!hospital) return;
    setProfileDraft({
      name: hospital.name || "",
      address: hospital.address || "",
      phone: hospital.phone || "",
      totalBeds: String(hospital.totalBeds ?? ""),
      availableBeds: String(hospital.availableBeds ?? ""),
      icuTotal: String(hospital.icuTotal ?? ""),
      icuAvailable: String(hospital.icuAvailable ?? ""),
      specialtiesText: Array.isArray(hospital.specialties)
        ? hospital.specialties.join(", ")
        : "",
    });
  }, [hospital]);

  useSocket(socket, "hospital:bed-request", (payload) => {
    if (
      !hospitalId ||
      payload?.hospitalId?.toString() !== hospitalId.toString()
    ) {
      return;
    }

    refreshDashboard();
    showToast("New patient bed request received", "success");
  });

  useSocket(socket, "hospital:request-update", (payload) => {
    if (
      !hospitalId ||
      payload?.hospitalId?.toString() !== hospitalId.toString()
    ) {
      return;
    }

    refreshDashboard();
  });

  // Live ambulance location updates for tracking mini-map
  useSocket(socket, "ambulance:tracking", (payload) => {
    if (!payload?.ambulanceId || !payload?.location) return;
    setRequests((prev) =>
      prev.map((req) => {
        if (req.assignedAmbulance?._id?.toString() !== payload.ambulanceId?.toString()) return req;
        return {
          ...req,
          assignedAmbulance: { ...req.assignedAmbulance, location: payload.location },
          status: payload.status || req.status,
        };
      })
    );
  });

  useSocket(socket, "hospital:beds-update", (payload) => {
    if (
      !hospitalId ||
      payload?.hospitalId?.toString() !== hospitalId.toString()
    ) {
      return;
    }

    setHospital((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        availableBeds: payload.availableBeds,
        totalBeds: payload.totalBeds,
        icuAvailable: payload.icuAvailable,
        icuTotal: payload.icuTotal,
      };
    });
  });

  const selectedRequest = useMemo(
    () => requests.find((entry) => entry._id === selectedRequestId) || null,
    [requests, selectedRequestId],
  );

  const handleDecision = async (emergencyId, decision) => {
    try {
      setActingRequestId(emergencyId);
      await decideHospitalBedRequest(emergencyId, decision, decisionNote);
      setDecisionNote("");
      await refreshDashboard();
      showToast(
        decision === "accepted"
          ? "Bed request accepted"
          : "Bed request rejected",
        "success",
      );
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to process request",
        "error",
      );
    } finally {
      setActingRequestId(null);
    }
  };

  const handleRelease = async (emergencyId) => {
    try {
      setActingRequestId(emergencyId);
      await releaseHospitalBedRequest(emergencyId, {});
      await refreshDashboard();
      showToast("Beds released for this patient", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to release beds",
        "error",
      );
    } finally {
      setActingRequestId(null);
    }
  };

  const handleQuickBedAdjust = async (field, delta) => {
    if (!hospital) return;

    const max =
      field === "availableBeds" ? hospital.totalBeds : hospital.icuTotal;
    const current = Number(hospital[field] || 0);
    const next = Math.max(0, Math.min(max, current + delta));

    try {
      await updateMyHospitalBeds({ [field]: next });
      setHospital((prev) => (prev ? { ...prev, [field]: next } : prev));
      setProfileDraft((prev) => ({ ...prev, [field]: String(next) }));
    } catch (error) {
      showToast(error.response?.data?.message || "Bed update failed", "error");
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();

    const payload = {
      name: profileDraft.name,
      address: profileDraft.address,
      phone: profileDraft.phone,
      totalBeds: Number(profileDraft.totalBeds),
      availableBeds: Number(profileDraft.availableBeds),
      icuTotal: Number(profileDraft.icuTotal),
      icuAvailable: Number(profileDraft.icuAvailable),
      specialties: splitCsv(profileDraft.specialtiesText),
    };

    if (payload.availableBeds > payload.totalBeds) {
      showToast("Available beds cannot exceed total beds", "error");
      return;
    }

    if (payload.icuAvailable > payload.icuTotal) {
      showToast("Available ICU beds cannot exceed ICU total", "error");
      return;
    }

    try {
      setSavingProfile(true);
      await updateMyHospitalProfile(payload);
      await refreshDashboard();
      showToast("Hospital profile updated", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Profile update failed",
        "error",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddTreatment = async () => {
    const avgCost = Number(newTreatment.averageCost);

    if (!newTreatment.name.trim()) {
      showToast("Treatment name is required", "error");
      return;
    }

    if (!Number.isFinite(avgCost) || avgCost <= 0) {
      showToast("Average cost must be a positive number", "error");
      return;
    }

    try {
      setAddingTreatment(true);
      await addMyHospitalTreatment({
        name: newTreatment.name.trim(),
        emergencyTypes: splitCsv(newTreatment.emergencyTypes),
        costMin: avgCost,
        costMax: avgCost,
        currency: "INR",
        notes: newTreatment.notes.trim(),
      });

      setNewTreatment({
        name: "",
        emergencyTypes: "other",
        averageCost: "",
        notes: "",
      });
      await refreshDashboard();
      showToast("Treatment added", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to add treatment",
        "error",
      );
    } finally {
      setAddingTreatment(false);
    }
  };

  const handleRemoveTreatment = async (treatmentId) => {
    try {
      await removeMyHospitalTreatment(treatmentId);
      await refreshDashboard();
      showToast("Treatment removed", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to remove treatment",
        "error",
      );
    }
  };

  if (loading) {
    return (
      <div
        className="page-enter"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        <Loader2
          size={34}
          style={{ color: "#22c55e", animation: "spin 1s linear infinite" }}
        />
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          Loading Hospital Command Center
        </span>
      </div>
    );
  }

  return (
    <div
      className="page-enter"
      style={{ minHeight: "100vh", padding: "84px 20px 24px" }}
    >
      <div
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          className="glass-card"
          style={{
            padding: "18px 20px",
            borderRadius: "18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#22c55e",
                fontWeight: 800,
                marginBottom: "5px",
              }}
            >
              Hospital Admin Console
            </p>
            <h1
              style={{
                fontSize: "1.6rem",
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              {hospital?.name || "My Hospital"}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>
              {hospital?.address || "Address not set"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <MetricCard
              icon={<Bed size={14} />}
              label="Beds"
              value={`${hospital?.availableBeds ?? 0}/${hospital?.totalBeds ?? 0}`}
            />
            <MetricCard
              icon={<Stethoscope size={14} />}
              label="ICU"
              value={`${hospital?.icuAvailable ?? 0}/${hospital?.icuTotal ?? 0}`}
            />
            <MetricCard
              icon={<Clock3 size={14} />}
              label="Pending"
              value={summary.pending}
            />
            <MetricCard
              icon={<Check size={14} />}
              label="Accepted"
              value={summary.accepted}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(460px, 1.4fr) minmax(360px, 1fr)",
            gap: "16px",
            alignItems: "start",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div
              className="glass-card"
              style={{ padding: "18px", borderRadius: "18px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <h2
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "1rem",
                    fontWeight: 800,
                  }}
                >
                  <ClipboardList size={16} /> Patient Bed Requests
                </h2>
                <button
                  onClick={refreshDashboard}
                  className="cursor-pointer"
                  style={{
                    border: "1px solid var(--border-glass)",
                    borderRadius: "10px",
                    padding: "6px 10px",
                    background: "var(--bg-glass)",
                    color: "var(--text-secondary)",
                    fontWeight: 700,
                    fontSize: "12px",
                    opacity: refreshing ? 0.6 : 1,
                  }}
                >
                  {refreshing ? "Syncing..." : "Refresh"}
                </button>
              </div>

              <input
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                placeholder="Optional note for acceptance/rejection"
                style={{
                  width: "100%",
                  borderRadius: "10px",
                  border: "1px solid var(--border-glass)",
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                  padding: "10px 12px",
                  marginBottom: "12px",
                  fontFamily: "var(--font-family)",
                }}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  maxHeight: "360px",
                  overflowY: "auto",
                }}
              >
                {requests.length === 0 && (
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.88rem",
                      margin: 0,
                    }}
                  >
                    No patient requests for this hospital right now.
                  </p>
                )}

                {requests.map((request) => {
                  const status = request?.hospitalRequest?.status || "pending";
                  const statusStyle =
                    STATUS_COLORS[status] || STATUS_COLORS.pending;
                  const active = selectedRequestId === request._id;
                  const busy = actingRequestId === request._id;

                  return (
                    <div
                      key={request._id}
                      style={{
                        border: active
                          ? "1px solid rgba(96,165,250,0.45)"
                          : "1px solid var(--border-glass)",
                        borderRadius: "12px",
                        padding: "12px",
                        background: active
                          ? "rgba(96,165,250,0.08)"
                          : "var(--bg-glass)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontWeight: 800,
                              fontSize: "0.92rem",
                            }}
                          >
                            {request.patientName}
                          </p>
                          <p
                            style={{
                              margin: "4px 0 0",
                              fontSize: "12px",
                              color: "var(--text-muted)",
                            }}
                          >
                            {EMERGENCY_LABELS[request.type] || request.type} •
                            Severity {request.severity}
                          </p>
                        </div>

                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "999px",
                            fontSize: "10px",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: statusStyle.color,
                            background: statusStyle.bg,
                            border: `1px solid ${statusStyle.border}`,
                          }}
                        >
                          {STATUS_LABELS[status] || status}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() => setSelectedRequestId(request._id)}
                          className="cursor-pointer"
                          style={actionButtonStyle("neutral")}
                        >
                          View Case
                        </button>

                        {status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                handleDecision(request._id, "accepted")
                              }
                              disabled={busy}
                              className="cursor-pointer"
                              style={actionButtonStyle("success", busy)}
                            >
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                handleDecision(request._id, "rejected")
                              }
                              disabled={busy}
                              className="cursor-pointer"
                              style={actionButtonStyle("danger", busy)}
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {(status === "accepted" || status === "released") && (
                          <button
                            onClick={() => handleRelease(request._id)}
                            disabled={busy}
                            className="cursor-pointer"
                            style={actionButtonStyle("warning", busy)}
                          >
                            Release Beds
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="glass-card"
              style={{ padding: "18px", borderRadius: "18px" }}
            >
              <h3
                style={{
                  marginTop: 0,
                  fontWeight: 800,
                  fontSize: "1rem",
                  marginBottom: "12px",
                }}
              >
                Selected Case Details
              </h3>

              {!selectedRequest && (
                <p style={{ color: "var(--text-muted)", margin: 0 }}>
                  Select a patient request to view complete details.
                </p>
              )}

              {selectedRequest && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    <InfoTile
                      label="Patient"
                      value={selectedRequest.patientName}
                      icon={<User size={14} />}
                    />
                    <InfoTile
                      label="Phone"
                      value={selectedRequest.patientPhone || "-"}
                      icon={<Phone size={14} />}
                    />
                    <InfoTile
                      label="Required Bed"
                      value={
                        selectedRequest.hospitalRequest?.requiredBedType ||
                        "general"
                      }
                      icon={<Bed size={14} />}
                    />
                    <InfoTile
                      label="Ambulance Booking"
                      value={
                        selectedRequest.ambulanceBooking?.status || "not_ready"
                      }
                      icon={<Activity size={14} />}
                    />
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid var(--border-glass)",
                      paddingTop: "12px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 6px",
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        fontWeight: 700,
                      }}
                    >
                      Assigned Ambulance
                    </p>
                    {selectedRequest.assignedAmbulance ? (
                      <p style={{ margin: 0, fontWeight: 700 }}>
                        {selectedRequest.assignedAmbulance.vehicleNumber} •{" "}
                        {selectedRequest.assignedAmbulance.driverName}
                      </p>
                    ) : (
                      <p style={{ margin: 0, color: "var(--text-muted)" }}>
                        No ambulance assigned yet.
                      </p>
                    )}
                  </div>

                  <div
                    style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
                  >
                    <a
                      href={`tel:${selectedRequest.patientPhone || ""}`}
                      style={{ textDecoration: "none" }}
                    >
                      <button
                        className="cursor-pointer"
                        style={actionButtonStyle("warning")}
                      >
                        Call Patient
                      </button>
                    </a>
                    <button
                      onClick={() => setShowDispatchPanel(true)}
                      className="cursor-pointer"
                      style={actionButtonStyle("neutral")}
                    >
                      <MessageCircle size={14} /> Chat + Call Panel
                    </button>
                  </div>

                  {/* Live Tracking Mini Map */}
                  {selectedRequest.assignedAmbulance?.location && (
                    <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: "14px" }}>
                      <p style={{ margin: "0 0 10px", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Activity size={12} style={{ color: "#ef4444" }} /> Live Ambulance Tracking
                      </p>
                      <HospitalTrackingMap
                        ambulance={selectedRequest.assignedAmbulance}
                        emergency={selectedRequest}
                        hospital={hospital}
                        isDark={isDark}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div
              className="glass-card"
              style={{ padding: "18px", borderRadius: "18px" }}
            >
              <h3
                style={{
                  marginTop: 0,
                  fontWeight: 800,
                  fontSize: "1rem",
                  marginBottom: "12px",
                }}
              >
                Bed Controls
              </h3>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <button
                  onClick={() => handleQuickBedAdjust("availableBeds", -1)}
                  className="cursor-pointer"
                  style={actionButtonStyle("danger")}
                >
                  Admit (Bed -1)
                </button>
                <button
                  onClick={() => handleQuickBedAdjust("availableBeds", 1)}
                  className="cursor-pointer"
                  style={actionButtonStyle("success")}
                >
                  Release (Bed +1)
                </button>
                <button
                  onClick={() => handleQuickBedAdjust("icuAvailable", -1)}
                  className="cursor-pointer"
                  style={actionButtonStyle("danger")}
                >
                  ICU Admit
                </button>
                <button
                  onClick={() => handleQuickBedAdjust("icuAvailable", 1)}
                  className="cursor-pointer"
                  style={actionButtonStyle("success")}
                >
                  ICU Release
                </button>
              </div>

              <form
                onSubmit={handleProfileSave}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <FieldRow
                  label="Hospital Name"
                  value={profileDraft.name}
                  onChange={(value) =>
                    setProfileDraft((prev) => ({ ...prev, name: value }))
                  }
                />
                <FieldRow
                  label="Address"
                  value={profileDraft.address}
                  onChange={(value) =>
                    setProfileDraft((prev) => ({ ...prev, address: value }))
                  }
                />
                <FieldRow
                  label="Phone"
                  value={profileDraft.phone}
                  onChange={(value) =>
                    setProfileDraft((prev) => ({ ...prev, phone: value }))
                  }
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <FieldRow
                    label="Total Beds"
                    value={profileDraft.totalBeds}
                    type="number"
                    onChange={(value) =>
                      setProfileDraft((prev) => ({ ...prev, totalBeds: value }))
                    }
                  />
                  <FieldRow
                    label="Available Beds"
                    value={profileDraft.availableBeds}
                    type="number"
                    onChange={(value) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        availableBeds: value,
                      }))
                    }
                  />
                  <FieldRow
                    label="ICU Total"
                    value={profileDraft.icuTotal}
                    type="number"
                    onChange={(value) =>
                      setProfileDraft((prev) => ({ ...prev, icuTotal: value }))
                    }
                  />
                  <FieldRow
                    label="ICU Available"
                    value={profileDraft.icuAvailable}
                    type="number"
                    onChange={(value) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        icuAvailable: value,
                      }))
                    }
                  />
                </div>

                <FieldRow
                  label="Specialties (comma separated)"
                  value={profileDraft.specialtiesText}
                  onChange={(value) =>
                    setProfileDraft((prev) => ({
                      ...prev,
                      specialtiesText: value,
                    }))
                  }
                />

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="cursor-pointer"
                  style={actionButtonStyle("neutral", savingProfile)}
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
              </form>
            </div>

            <div
              className="glass-card"
              style={{ padding: "18px", borderRadius: "18px" }}
            >
              <h3
                style={{
                  marginTop: 0,
                  fontWeight: 800,
                  fontSize: "1rem",
                  marginBottom: "12px",
                }}
              >
                Treatments and Average Cost
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginBottom: "12px",
                  maxHeight: "220px",
                  overflowY: "auto",
                }}
              >
                {(hospital?.treatments || []).map((treatment) => (
                  <div
                    key={treatment._id}
                    style={{
                      border: "1px solid var(--border-glass)",
                      borderRadius: "10px",
                      padding: "10px",
                      background: "var(--bg-glass)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <p style={{ margin: 0, fontWeight: 700 }}>
                          {treatment.name}
                        </p>
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: "12px",
                            color: "var(--text-muted)",
                          }}
                        >
                          Types:{" "}
                          {(treatment.emergencyTypes || []).join(", ") ||
                            "other"}
                        </p>
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: "12px",
                            color: "#86efac",
                            fontWeight: 700,
                          }}
                        >
                          Avg Cost:{" "}
                          {formatCurrency(
                            Math.round(
                              (Number(treatment.costMin || 0) +
                                Number(treatment.costMax || 0)) /
                                2,
                            ),
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveTreatment(treatment._id)}
                        className="cursor-pointer"
                        style={actionButtonStyle("danger")}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {(hospital?.treatments || []).length === 0 && (
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text-muted)",
                      fontSize: "0.88rem",
                    }}
                  >
                    No treatments configured yet.
                  </p>
                )}
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <FieldRow
                  label="Treatment Name"
                  value={newTreatment.name}
                  onChange={(value) =>
                    setNewTreatment((prev) => ({ ...prev, name: value }))
                  }
                />
                <FieldRow
                  label="Emergency Types (comma separated)"
                  value={newTreatment.emergencyTypes}
                  onChange={(value) =>
                    setNewTreatment((prev) => ({
                      ...prev,
                      emergencyTypes: value,
                    }))
                  }
                />
                <FieldRow
                  label="Average Cost (INR)"
                  type="number"
                  value={newTreatment.averageCost}
                  onChange={(value) =>
                    setNewTreatment((prev) => ({ ...prev, averageCost: value }))
                  }
                />
                <FieldRow
                  label="Notes"
                  value={newTreatment.notes}
                  onChange={(value) =>
                    setNewTreatment((prev) => ({ ...prev, notes: value }))
                  }
                />

                <button
                  onClick={handleAddTreatment}
                  disabled={addingTreatment}
                  className="cursor-pointer"
                  style={actionButtonStyle("success", addingTreatment)}
                >
                  <Plus size={14} />{" "}
                  {addingTreatment ? "Adding..." : "Add Treatment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DispatchControlModal
        isOpen={showDispatchPanel && !!selectedRequest}
        title="Patient Case Communication"
        emergencyId={selectedRequest?._id}
        emergencyChatSeed={selectedRequest?.chatThread || []}
        ambulance={selectedRequest?.assignedAmbulance || null}
        patientPhone={selectedRequest?.patientPhone}
        onClose={() => setShowDispatchPanel(false)}
      />
    </div>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <div
      style={{
        minWidth: "110px",
        background: "var(--bg-glass)",
        border: "1px solid var(--border-glass)",
        borderRadius: "12px",
        padding: "10px 12px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--text-muted)",
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {icon} {label}
      </p>
      <p style={{ margin: "6px 0 0", fontWeight: 800, fontSize: "0.95rem" }}>
        {value}
      </p>
    </div>
  );
}

function FieldRow({ label, value, onChange, type = "text" }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <span
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-muted)",
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          borderRadius: "10px",
          border: "1px solid var(--border-glass)",
          background: "var(--bg-input)",
          color: "var(--text-primary)",
          padding: "9px 11px",
          fontFamily: "var(--font-family)",
        }}
      />
    </label>
  );
}

function InfoTile({ label, value, icon }) {
  return (
    <div
      style={{
        border: "1px solid var(--border-glass)",
        borderRadius: "10px",
        background: "var(--bg-glass)",
        padding: "10px 12px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--text-muted)",
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {icon} {label}
      </p>
      <p style={{ margin: "5px 0 0", fontSize: "0.9rem", fontWeight: 700 }}>
        {value}
      </p>
    </div>
  );
}

function actionButtonStyle(kind, disabled = false) {
  const base = {
    borderRadius: "10px",
    border: "1px solid var(--border-glass)",
    background: "var(--bg-glass)",
    color: "var(--text-secondary)",
    padding: "7px 10px",
    fontWeight: 700,
    fontSize: "12px",
    fontFamily: "var(--font-family)",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    opacity: disabled ? 0.6 : 1,
  };

  if (kind === "success") {
    return {
      ...base,
      border: "1px solid rgba(34,197,94,0.35)",
      background: "rgba(34,197,94,0.15)",
      color: "#86efac",
    };
  }

  if (kind === "danger") {
    return {
      ...base,
      border: "1px solid rgba(239,68,68,0.35)",
      background: "rgba(239,68,68,0.14)",
      color: "#fca5a5",
    };
  }

  if (kind === "warning") {
    return {
      ...base,
      border: "1px solid rgba(245,158,11,0.35)",
      background: "rgba(245,158,11,0.14)",
      color: "#fcd34d",
    };
  }

  return base;
}

/* ---- Live tracking mini-map for Hospital ---- */

const createMiniIcon = (emoji, color) => L.divIcon({
  html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:#0a0a0f;border-radius:8px;border:2px solid ${color};box-shadow:0 0 10px ${color}50;font-size:13px;">${emoji}</div>`,
  className: '', iconSize: [28, 28], iconAnchor: [14, 14],
});
const miniAmbIcon = createMiniIcon('🚑', '#ef4444');
const miniPatientIcon = createMiniIcon('🆘', '#f97316');
const miniHospIcon = createMiniIcon('🏥', '#3b82f6');

function HospitalTrackingMap({ ambulance, emergency, hospital, isDark }) {
  if (!ambulance?.location?.coordinates) return null;

  const ambCoords = ambulance.location.coordinates;
  const ambPos = [ambCoords[1], ambCoords[0]];

  const emCoords = emergency?.location?.coordinates;
  const emPos = emCoords ? [emCoords[1], emCoords[0]] : null;

  const hospCoords = hospital?.location?.coordinates;
  const hospPos = hospCoords ? [hospCoords[1], hospCoords[0]] : null;

  const isPhase2 = emergency?.status === 'at_scene' && hospPos;

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return (
    <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-glass)', height: '220px' }}>
      <MapContainer center={ambPos} zoom={13} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url={tileUrl} attribution="&copy; ResQNet AI" />
        <Marker position={ambPos} icon={miniAmbIcon} />
        {emPos && !isPhase2 && <Marker position={emPos} icon={miniPatientIcon} />}
        {hospPos && <Marker position={hospPos} icon={miniHospIcon} />}
        {isPhase2 && hospPos ? (
          <Polyline positions={[ambPos, hospPos]} pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '8, 6', opacity: 0.7 }} />
        ) : emPos ? (
          <Polyline positions={[ambPos, emPos]} pathOptions={{ color: '#ef4444', weight: 3, dashArray: '8, 6', opacity: 0.7 }} />
        ) : null}
      </MapContainer>
    </div>
  );
}
