import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Cpu,
  Navigation,
  Building2,
  MessageSquare,
  ShieldAlert,
  Map as MapIcon,
  PhoneCall,
  Send,
  X,
  XCircle,
} from "lucide-react";

const SEV = {
  1: {
    color: "#4ade80",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.2)",
    label: "LOW",
  },
  2: {
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.2)",
    label: "MODERATE",
  },
  3: {
    color: "#facc15",
    bg: "rgba(234,179,8,0.1)",
    border: "rgba(234,179,8,0.2)",
    label: "HIGH",
  },
  4: {
    color: "#fb923c",
    bg: "rgba(249,115,22,0.1)",
    border: "rgba(249,115,22,0.2)",
    label: "CRITICAL",
  },
  5: {
    color: "#fca5a5",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.2)",
    label: "EXTREME",
  },
};

export default function SOSResult({
  result,
  onReset,
  onSelectHospital,
  selectingHospitalId,
  actionError,
  onCancelEmergency,
  cancellingEmergency = false,
}) {
  const navigate = useNavigate();
  const {
    emergency,
    triage,
    ambulance,
    suggestedHospitals = [],
    notifications,
  } = result;
  const cancellationMessage = result?.cancellationMessage || "";

  const selectedHospital = result?.selectedHospital?.hospital || null;
  const recommendedHospitalEntry =
    suggestedHospitals.find((h) => h.recommended) || suggestedHospitals[0];
  const topHospital = selectedHospital || recommendedHospitalEntry?.hospital;
  const requiresHospitalSelection =
    !!result?.requiresHospitalSelection && !ambulance;
  const [showDispatchPanel, setShowDispatchPanel] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [sortField, setSortField] = useState("score");
  const [sortDirection, setSortDirection] = useState("desc");

  const sev = SEV[triage?.severity] || SEV[3];

  const renderHospitalCoordinates = (entry) => {
    const lat =
      entry?.coordinates?.latitude ??
      entry?.hospital?.location?.coordinates?.[1];
    const lng =
      entry?.coordinates?.longitude ??
      entry?.hospital?.location?.coordinates?.[0];

    if (lat === undefined || lng === undefined)
      return "Coordinates unavailable";
    return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
  };

  const formatCost = (currency, amount) => {
    if (!Number.isFinite(amount)) return "N/A";

    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currency || "INR",
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency || "INR"} ${amount}`;
    }
  };

  const sortedHospitals = useMemo(() => {
    const entries = [...suggestedHospitals];
    const directionFactor = sortDirection === "asc" ? 1 : -1;

    const getCost = (entry) => {
      if (Number.isFinite(entry?.cheapestTreatmentCost)) {
        return entry.cheapestTreatmentCost;
      }

      const mins = (entry?.matchingTreatments || [])
        .map((treatment) => Number(treatment.costMin))
        .filter((value) => Number.isFinite(value));

      if (mins.length === 0) return Number.POSITIVE_INFINITY;
      return Math.min(...mins);
    };

    entries.sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      if (sortField === "distance") {
        aValue = Number(a.distance) || 0;
        bValue = Number(b.distance) || 0;
      } else if (sortField === "cost") {
        aValue = getCost(a);
        bValue = getCost(b);
      } else {
        aValue = Number(a.score) || 0;
        bValue = Number(b.score) || 0;
      }

      if (aValue === bValue) return 0;
      return aValue > bValue ? directionFactor : -directionFactor;
    });

    return entries;
  }, [suggestedHospitals, sortDirection, sortField]);

  useEffect(() => {
    if (!ambulance) {
      setShowDispatchPanel(false);
      setChatLog([]);
      return;
    }

    setChatLog([
      {
        id: `system-${ambulance._id}`,
        from: "system",
        text: `${ambulance.driverName || "Driver"} connected. You can chat, call, or cancel this dispatch.`,
      },
    ]);
  }, [ambulance]);

  const handleSendChat = () => {
    const text = chatInput.trim();
    if (!text) return;

    const ts = Date.now();
    setChatLog((prev) => [...prev, { id: `user-${ts}`, from: "user", text }]);
    setChatInput("");

    window.setTimeout(() => {
      setChatLog((prev) => [
        ...prev,
        {
          id: `driver-${Date.now()}`,
          from: "system",
          text: "Driver acknowledged. Ambulance is proceeding on current route.",
        },
      ]);
    }, 400);
  };

  const handleCancelDispatch = async () => {
    if (!onCancelEmergency || !emergency?._id) return;
    await onCancelEmergency(emergency._id);
    setShowDispatchPanel(false);
  };

  const openDispatchControls = () => {
    if (!ambulance) return;
    setShowDispatchPanel(true);
  };

  return (
    <div
      className="page-enter"
      style={{
        width: "100%",
        maxWidth: "900px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Success Banner */}
      <div
        style={{
          textAlign: "center",
          paddingBottom: "28px",
          borderBottom: "1px solid var(--border-glass)",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            margin: "0 auto 20px",
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 40px rgba(16,185,129,0.12)",
          }}
        >
          <CheckCircle2 size={36} style={{ color: "#22c55e" }} />
        </div>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            marginBottom: "8px",
          }}
        >
          {requiresHospitalSelection
            ? "Select Receiving Hospital"
            : "Response Active"}
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontFamily: "monospace",
              fontWeight: 700,
              color: "var(--text-muted)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              transition: "color 0.3s",
            }}
          >
            Emergency ID
          </span>
          <span
            style={{
              padding: "4px 12px",
              background: "var(--bg-glass)",
              border: "1px solid var(--border-glass)",
              borderRadius: "8px",
              color: "#ef4444",
              fontFamily: "monospace",
              fontSize: "0.875rem",
              fontWeight: 900,
              textTransform: "uppercase",
            }}
          >
            {emergency._id.slice(-8)}
          </span>
        </div>
      </div>

      {actionError && (
        <div
          className="glass-card"
          style={{
            padding: "16px 20px",
            borderRadius: "18px",
            border: "1px solid rgba(239,68,68,0.35)",
            background: "rgba(239,68,68,0.08)",
            color: "#fecaca",
            fontWeight: 700,
          }}
        >
          {actionError}
        </div>
      )}

      {cancellationMessage && (
        <div
          className="glass-card"
          style={{
            padding: "16px 20px",
            borderRadius: "18px",
            border: "1px solid rgba(34,197,94,0.3)",
            background: "rgba(34,197,94,0.08)",
            color: "#bbf7d0",
            fontWeight: 700,
          }}
        >
          {cancellationMessage}
        </div>
      )}

      {ambulance && (
        <button
          onClick={openDispatchControls}
          className="glass-card cursor-pointer"
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: "18px",
            border: "1px solid rgba(37,99,235,0.35)",
            background: "rgba(37,99,235,0.08)",
            color: "#bfdbfe",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            fontFamily: "var(--font-family)",
          }}
        >
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "4px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#93c5fd",
              }}
            >
              Booked Ambulance
            </span>
            <span
              style={{
                fontSize: "0.95rem",
                fontWeight: 800,
                fontFamily: "monospace",
              }}
            >
              {ambulance.vehicleNumber}
            </span>
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Tap to Chat / Call / Cancel
          </span>
        </button>
      )}

      {requiresHospitalSelection && (
        <div
          className="glass-card"
          style={{
            padding: "24px",
            borderRadius: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "#22c55e",
              }}
            >
              Hospitals Within 5km Radius
            </h3>
            {recommendedHospitalEntry && (
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: "9999px",
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  color: "#22c55e",
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                Recommended: {recommendedHospitalEntry.hospital.name}
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--text-muted)",
              }}
            >
              Sort Hospitals
            </span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              style={{
                borderRadius: "10px",
                border: "1px solid var(--border-glass)",
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                padding: "8px 10px",
                fontSize: "12px",
                fontWeight: 700,
                fontFamily: "var(--font-family)",
              }}
            >
              <option value="score">Recommended Score</option>
              <option value="distance">Distance</option>
              <option value="cost">Treatment Cost</option>
            </select>
            <button
              onClick={() =>
                setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              className="cursor-pointer"
              style={{
                borderRadius: "10px",
                border: "1px solid var(--border-glass)",
                background: "var(--bg-glass)",
                color: "var(--text-secondary)",
                padding: "8px 12px",
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontFamily: "var(--font-family)",
              }}
            >
              {sortDirection === "asc" ? "Asc ↑" : "Desc ↓"}
            </button>
          </div>

          {sortedHospitals.length === 0 ? (
            <div
              style={{
                padding: "16px",
                borderRadius: "14px",
                background: "rgba(239,68,68,0.06)",
                color: "var(--text-secondary)",
              }}
            >
              No hospitals in 5km matched the selected emergency problem
              category. Try another emergency type or update location.
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {sortedHospitals.map((entry) => {
                const hospital = entry.hospital;
                const isSelecting = selectingHospitalId === hospital._id;
                const treatmentPreview = (entry.matchingTreatments || []).slice(
                  0,
                  3,
                );
                const lowestCost = Number.isFinite(entry.cheapestTreatmentCost)
                  ? formatCost(
                      treatmentPreview[0]?.currency || "INR",
                      entry.cheapestTreatmentCost,
                    )
                  : null;

                return (
                  <div
                    key={hospital._id}
                    style={{
                      padding: "16px",
                      borderRadius: "16px",
                      border: `1px solid ${entry.recommended ? "rgba(34,197,94,0.35)" : "var(--border-glass)"}`,
                      background: entry.recommended
                        ? "rgba(34,197,94,0.05)"
                        : "var(--bg-glass)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span style={{ fontSize: "1rem", fontWeight: 800 }}>
                            {hospital.name}
                          </span>
                          {entry.recommended && (
                            <span
                              style={{
                                fontSize: "9px",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                padding: "3px 8px",
                                borderRadius: "9999px",
                                background: "rgba(34,197,94,0.14)",
                                color: "#22c55e",
                              }}
                            >
                              Best Match
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {hospital.address}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontFamily: "monospace",
                            color: "var(--text-muted)",
                          }}
                        >
                          Lat/Lng: {renderHospitalCoordinates(entry)}
                        </span>
                        {treatmentPreview.length > 0 ? (
                          <div
                            style={{
                              marginTop: "6px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                color: "var(--text-muted)",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                              }}
                            >
                              Matching Treatments
                            </span>
                            {treatmentPreview.map((treatment) => (
                              <div
                                key={`${hospital._id}-${treatment.name}`}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: "10px",
                                  fontSize: "11px",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                <span>{treatment.name}</span>
                                <span style={{ fontWeight: 700 }}>
                                  {formatCost(
                                    treatment.currency,
                                    treatment.costMin,
                                  )}{" "}
                                  -{" "}
                                  {formatCost(
                                    treatment.currency,
                                    treatment.costMax,
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#fca5a5" }}>
                            No mapped treatment-cost package for this emergency
                            type.
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            color: "#3b82f6",
                          }}
                        >
                          {entry.distance} km
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: lowestCost ? "#22c55e" : "var(--text-muted)",
                          }}
                        >
                          {lowestCost
                            ? `From ${lowestCost}`
                            : "Cost unavailable"}
                        </span>
                        <button
                          onClick={() =>
                            onSelectHospital && onSelectHospital(hospital._id)
                          }
                          disabled={!!selectingHospitalId}
                          className="cursor-pointer"
                          style={{
                            padding: "10px 14px",
                            borderRadius: "12px",
                            border: "none",
                            background: "#2563eb",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "12px",
                            opacity: selectingHospitalId ? 0.7 : 1,
                            fontFamily: "var(--font-family)",
                          }}
                        >
                          {isSelecting ? "Assigning..." : "Select Hospital"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* AI Triage */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "32px",
          background: "var(--bg-glass)",
          border: `1px solid ${sev.border}`,
          borderRadius: "28px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "24px",
            right: "24px",
            opacity: 0.04,
            pointerEvents: "none",
          }}
        >
          <Cpu size={120} />
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  padding: "8px",
                  borderRadius: "12px",
                  background: sev.bg,
                  color: sev.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Cpu size={22} />
              </div>
              <h3
                style={{
                  fontSize: "12px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: sev.color,
                }}
              >
                AI Triage Analysis
              </h3>
            </div>
            <span
              style={{
                padding: "6px 16px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 900,
                background: sev.bg,
                border: `1px solid ${sev.border}`,
                color: sev.color,
              }}
            >
              SEVERITY LEVEL {triage?.severity} • {sev.label}
            </span>
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "1.05rem",
              lineHeight: 1.7,
              marginBottom: "24px",
              fontWeight: 500,
              fontStyle: "italic",
              transition: "color 0.3s",
            }}
          >
            "{triage?.reasoning}"
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "20px",
              paddingTop: "20px",
              borderTop: "1px solid var(--border-glass)",
            }}
          >
            {[
              {
                label: "Confidence",
                value: `${Math.round((triage?.confidence || 0) * 100)}%`,
              },
              { label: "Resource", value: triage?.responseLevel || "—" },
              {
                label: "Equipment",
                value: triage?.recommendedEquipment?.replace("_", " ") || "—",
              },
              { label: "Engine", value: triage?.aiModel || "—", small: true },
            ].map((item) => (
              <div key={item.label}>
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontSize: item.small ? "10px" : "1.1rem",
                    fontWeight: 800,
                    textTransform: "capitalize",
                    fontFamily: item.small ? "monospace" : "inherit",
                    opacity: item.small ? 0.5 : 1,
                  }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
        }}
      >
        <div
          className="glass-card"
          style={{ padding: "28px", borderRadius: "28px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                padding: "12px",
                borderRadius: "14px",
                background: "rgba(37,99,235,0.1)",
                color: "#3b82f6",
                display: "flex",
              }}
            >
              <Navigation size={22} />
            </div>
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "#3b82f6",
              }}
            >
              Unit Deployment
            </h3>
          </div>
          {ambulance ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <button
                onClick={openDispatchControls}
                className="cursor-pointer"
                style={{
                  width: "100%",
                  border: "1px solid var(--border-glass)",
                  borderRadius: "14px",
                  background: "var(--bg-glass)",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    paddingBottom: "10px",
                    borderBottom: "1px solid var(--border-glass)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    Fleet Unit
                  </span>
                  <span
                    style={{
                      fontSize: "1.25rem",
                      fontFamily: "monospace",
                      fontWeight: 900,
                    }}
                  >
                    {ambulance.vehicleNumber}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      padding: "14px",
                      background: "var(--bg-glass)",
                      borderRadius: "14px",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        marginBottom: "4px",
                      }}
                    >
                      ETA
                    </p>
                    <p
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 900,
                        color: "#22c55e",
                      }}
                    >
                      {ambulance.eta}m
                    </p>
                  </div>
                  <div
                    style={{
                      padding: "14px",
                      background: "var(--bg-glass)",
                      borderRadius: "14px",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        marginBottom: "4px",
                      }}
                    >
                      Dist
                    </p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 900 }}>
                      {ambulance.distance}km
                    </p>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#93c5fd",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    textAlign: "center",
                  }}
                >
                  Tap This Ambulance Card For Chat / Call / Cancel
                </p>
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px",
                background: "rgba(249,115,22,0.06)",
                borderRadius: "14px",
                color: "#f97316",
              }}
            >
              <ShieldAlert size={20} />
              <p style={{ fontSize: "12px", fontWeight: 700 }}>
                {requiresHospitalSelection
                  ? "Choose a hospital to continue dispatch."
                  : "Queueing for available fleet..."}
              </p>
            </div>
          )}
        </div>
        <div
          className="glass-card"
          style={{ padding: "28px", borderRadius: "28px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                padding: "12px",
                borderRadius: "14px",
                background: "rgba(34,197,94,0.1)",
                color: "#22c55e",
                display: "flex",
              }}
            >
              <Building2 size={22} />
            </div>
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "#22c55e",
              }}
            >
              Facility Triage
            </h3>
          </div>
          {topHospital ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <p
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  lineHeight: 1.3,
                }}
              >
                {topHospital.name}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    padding: "14px",
                    background: "var(--bg-glass)",
                    borderRadius: "14px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    Emergency Beds
                  </p>
                  <p
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 900,
                      color: "#22c55e",
                    }}
                  >
                    {topHospital.availableBeds}
                  </p>
                </div>
                <div
                  style={{
                    padding: "14px",
                    background: "var(--bg-glass)",
                    borderRadius: "14px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    ICU Capacity
                  </p>
                  <p
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 900,
                      color:
                        topHospital.icuAvailable > 0 ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {topHospital.icuAvailable}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>No hospital data</p>
          )}
        </div>
      </div>

      {/* Log */}
      {notifications?.length > 0 && (
        <div
          className="glass-card"
          style={{ padding: "28px", borderRadius: "28px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <MessageSquare size={18} style={{ color: "var(--text-muted)" }} />
            <h4
              style={{
                fontSize: "10px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: "var(--text-muted)",
              }}
            >
              Alert Propagation Log
            </h4>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {notifications.map((n, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "14px",
                  background: "var(--bg-glass)",
                  border: "1px solid var(--border-glass)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#22c55e",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {n.to}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "monospace",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  {n.provider} SYNC SUCCESS
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDispatchPanel && ambulance && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 60,
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "560px",
              borderRadius: "24px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              maxHeight: "82vh",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 900 }}>
                  Dispatch Interface
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginTop: "4px",
                  }}
                >
                  Unit {ambulance.vehicleNumber} • {ambulance.driverName}
                </p>
              </div>
              <button
                onClick={() => setShowDispatchPanel(false)}
                className="cursor-pointer"
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "9999px",
                  border: "1px solid var(--border-glass)",
                  background: "var(--bg-glass)",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {ambulance.driverPhone && (
                <a
                  href={`tel:${ambulance.driverPhone}`}
                  style={{ textDecoration: "none" }}
                >
                  <button
                    className="cursor-pointer"
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid rgba(34,197,94,0.4)",
                      background: "rgba(34,197,94,0.12)",
                      color: "#86efac",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontFamily: "var(--font-family)",
                    }}
                  >
                    <PhoneCall size={14} /> Call Ambulance
                  </button>
                </a>
              )}
              {topHospital?.phone && (
                <a
                  href={`tel:${topHospital.phone}`}
                  style={{ textDecoration: "none" }}
                >
                  <button
                    className="cursor-pointer"
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid rgba(59,130,246,0.4)",
                      background: "rgba(59,130,246,0.12)",
                      color: "#93c5fd",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontFamily: "var(--font-family)",
                    }}
                  >
                    <PhoneCall size={14} /> Call Hospital
                  </button>
                </a>
              )}
            </div>

            <div
              style={{
                border: "1px solid var(--border-glass)",
                borderRadius: "14px",
                padding: "12px",
                background: "var(--bg-glass)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                minHeight: "200px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  letterSpacing: "0.12em",
                }}
              >
                Dispatch Chat
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {chatLog.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      alignSelf:
                        item.from === "user" ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                      padding: "8px 10px",
                      borderRadius: "10px",
                      background:
                        item.from === "user"
                          ? "rgba(37,99,235,0.18)"
                          : "rgba(148,163,184,0.12)",
                      color:
                        item.from === "user"
                          ? "#bfdbfe"
                          : "var(--text-secondary)",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {item.text}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message to dispatch crew"
                  style={{
                    flex: 1,
                    borderRadius: "10px",
                    border: "1px solid var(--border-glass)",
                    background: "var(--bg-input)",
                    color: "var(--text-primary)",
                    padding: "10px 12px",
                    fontFamily: "var(--font-family)",
                  }}
                />
                <button
                  onClick={handleSendChat}
                  className="cursor-pointer"
                  style={{
                    borderRadius: "10px",
                    border: "none",
                    background: "#2563eb",
                    color: "#fff",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>

            <button
              onClick={handleCancelDispatch}
              disabled={cancellingEmergency}
              className="cursor-pointer"
              style={{
                borderRadius: "12px",
                border: "1px solid rgba(239,68,68,0.4)",
                background: "rgba(239,68,68,0.12)",
                color: "#fca5a5",
                padding: "12px 14px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontFamily: "var(--font-family)",
                opacity: cancellingEmergency ? 0.65 : 1,
              }}
            >
              <XCircle size={14} />{" "}
              {cancellingEmergency
                ? "Cancelling..."
                : "Cancel Ambulance + Hospital Request"}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "12px",
          paddingTop: "16px",
        }}
      >
        {ambulance && (
          <button
            onClick={() => navigate("/tracking")}
            className="cursor-pointer"
            style={{
              padding: "14px 28px",
              background: "#2563eb",
              color: "#fff",
              borderRadius: "16px",
              fontWeight: 700,
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 8px 24px rgba(37,99,235,0.25)",
              transition: "all 0.3s",
              fontFamily: "var(--font-family)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <MapIcon size={18} /> Satellite Track
          </button>
        )}
        <button
          onClick={onReset}
          className="cursor-pointer"
          style={{
            padding: "14px 28px",
            background: "transparent",
            color: "var(--text-muted)",
            borderRadius: "16px",
            fontWeight: 700,
            border: "none",
            transition: "color 0.2s",
            fontFamily: "var(--font-family)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          Dismiss Call
        </button>
      </div>
    </div>
  );
}
