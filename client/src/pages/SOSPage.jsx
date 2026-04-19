import { useState } from "react";
import { useGeolocation } from "../hooks/useSocket";
import {
  createEmergency,
  selectHospitalForEmergency,
  cancelEmergencyRequest,
} from "../services/api";
import EmergencyForm from "../components/EmergencyForm";
import SOSResult from "../components/SOSResult";
import {
  AlertCircle,
  ChevronLeft,
  MapPin,
  Activity,
  Flame,
  Wind,
  Brain,
  Waves,
  Zap,
  Loader2,
} from "lucide-react";

const COLORS = {
  red: "#ef4444",
  rose: "#f43f5e",
  orange: "#f97316",
  blue: "#3b82f6",
  purple: "#a855f7",
  cyan: "#06b6d4",
};

const EMERGENCY_TYPES = [
  {
    value: "accident",
    label: "Road Accident",
    icon: <Zap size={28} />,
    color: "red",
  },
  {
    value: "cardiac",
    label: "Cardiac Arrest",
    icon: <Activity size={28} />,
    color: "rose",
  },
  {
    value: "fire",
    label: "Fire Emergency",
    icon: <Flame size={28} />,
    color: "orange",
  },
  {
    value: "breathing",
    label: "Breathing Issue",
    icon: <Wind size={28} />,
    color: "blue",
  },
  {
    value: "stroke",
    label: "Stroke/Neuro",
    icon: <Brain size={28} />,
    color: "purple",
  },
  {
    value: "flood",
    label: "Disaster/Flood",
    icon: <Waves size={28} />,
    color: "cyan",
  },
];

export default function SOSPage() {
  const geo = useGeolocation();
  const [step, setStep] = useState("idle");
  const [selectedType, setSelectedType] = useState(null);
  const [result, setResult] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [error, setError] = useState("");
  const [resultError, setResultError] = useState("");
  const [loadingText, setLoadingText] = useState("Querying nearest fleets...");
  const [selectingHospitalId, setSelectingHospitalId] = useState(null);
  const [cancellingEmergency, setCancellingEmergency] = useState(false);

  const handleRequestLocation = async () => {
    setLocationError("");
    const location = await geo.requestLocation();
    if (!location) {
      setLocationError(
        "Allow browser location access to continue SOS dispatch.",
      );
    }
  };

  const handleSOS = () => {
    if (!geo.hasCoordinates) {
      setLocationError(
        'Tap "Use Current Location" and allow browser access before starting SOS.',
      );
      return;
    }

    setStep("form");
    setError("");
    setResultError("");
    setLocationError("");
  };

  const handleSubmit = async (formData) => {
    if (!geo.hasCoordinates) {
      setError(
        "Current location is required. Please enable location access first.",
      );
      setStep("idle");
      return;
    }

    setStep("submitting");
    setError("");
    setResultError("");
    setLoadingText("Analyzing emergency and scanning nearby hospitals...");

    try {
      const payload = {
        ...formData,
        type: selectedType,
        latitude: geo.latitude,
        longitude: geo.longitude,
      };
      const res = await createEmergency(payload);
      setResult(res.data.data);
      setStep("result");
    } catch (err) {
      setError(
        err.response?.data?.message || "Dispatch system timeout. Retrying...",
      );
      setStep("form");
    }
  };

  const handleHospitalSelect = async (hospitalId) => {
    if (!result?.emergency?._id || !hospitalId) return;

    setSelectingHospitalId(hospitalId);
    setResultError("");
    setStep("submitting");
    setLoadingText("Assigning nearest ambulance and computing live route...");

    try {
      const res = await selectHospitalForEmergency(
        result.emergency._id,
        hospitalId,
      );
      setResult(res.data.data);
      setStep("result");
    } catch (err) {
      setResultError(
        err.response?.data?.message ||
          "Failed to assign hospital. Please try another one.",
      );
      setStep("result");
    } finally {
      setSelectingHospitalId(null);
    }
  };

  const handleCancelEmergency = async (emergencyId) => {
    if (!emergencyId) return;

    setCancellingEmergency(true);
    setResultError("");

    try {
      const res = await cancelEmergencyRequest(emergencyId);
      const cancelledEmergency = res.data.data?.emergency;

      setResult((prev) => ({
        ...(prev || {}),
        emergency: cancelledEmergency || prev?.emergency,
        ambulance: null,
        selectedHospital: null,
        requiresHospitalSelection: false,
        cancellationMessage:
          res.data.message || "Emergency request cancelled successfully.",
      }));
      setStep("result");
    } catch (err) {
      setResultError(
        err.response?.data?.message || "Unable to cancel emergency right now.",
      );
    } finally {
      setCancellingEmergency(false);
    }
  };

  const handleReset = () => {
    setStep("idle");
    setSelectedType(null);
    setResult(null);
    setLocationError("");
    setError("");
    setResultError("");
    setSelectingHospitalId(null);
    setLoadingText("Querying nearest fleets...");
    setCancellingEmergency(false);
  };

  return (
    <div
      className="page-enter"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 50% 0%, rgba(220,38,38,0.08) 0%, transparent 50%)",
        }}
      />

      {/* IDLE */}
      {step === "idle" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: "420px",
            width: "100%",
            position: "relative",
            zIndex: 10,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 16px",
                borderRadius: "9999px",
                marginBottom: "16px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#ef4444",
                fontSize: "10px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#ef4444",
                  boxShadow: "0 0 8px rgba(239,68,68,0.6)",
                  animation: "pulse-glow 2s ease-in-out infinite",
                }}
              />
              Emergency Channel Active
            </div>
            <h1
              style={{
                fontSize: "2.8rem",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                marginBottom: "12px",
              }}
            >
              Direct <span style={{ color: "#dc2626" }}>SOS</span>
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                fontWeight: 500,
                fontSize: "0.95rem",
                transition: "color 0.3s",
              }}
            >
              Initiate immediate medical dispatch and hospital triage.
            </p>
          </div>
          <div style={{ position: "relative", marginBottom: "48px" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(220,38,38,0.15)",
                filter: "blur(40px)",
                borderRadius: "50%",
                animation: "pulse-glow 3s ease-in-out infinite",
              }}
            />
            <button
              onClick={handleSOS}
              className="sos-button cursor-pointer"
              style={{
                position: "relative",
                zIndex: 10,
                width: "192px",
                height: "192px",
                borderRadius: "50%",
                border: "2px solid rgba(239,68,68,0.5)",
                background: "var(--bg-primary)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                transition: "all 0.3s",
                boxShadow: "0 0 50px rgba(220,38,38,0.35)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(135deg,#ef4444,#dc2626)";
                e.currentTarget.style.borderColor = "transparent";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg-primary)";
                e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)";
              }}
            >
              <AlertCircle
                size={48}
                style={{ color: "#ef4444", marginBottom: "8px" }}
              />
              <span
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                }}
              >
                SOS
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#ef4444",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginTop: "4px",
                }}
              >
                Tap to help
              </span>
            </button>
          </div>
          <div
            className="glass-card"
            style={{
              padding: "14px 24px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                padding: "8px",
                borderRadius: "10px",
                background: geo.loading
                  ? "rgba(234,179,8,0.1)"
                  : "rgba(34,197,94,0.1)",
              }}
            >
              <MapPin
                size={18}
                style={{ color: geo.loading ? "#eab308" : "#22c55e" }}
              />
            </div>
            <div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "var(--text-muted)",
                  transition: "color 0.3s",
                }}
              >
                Satellite Lock
              </p>
              <p
                style={{
                  fontSize: "0.875rem",
                  fontFamily: "monospace",
                  fontWeight: 700,
                  lineHeight: 1,
                  marginTop: "4px",
                }}
              >
                {geo.loading
                  ? "Fetching current location..."
                  : geo.hasCoordinates
                    ? `${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`
                    : "Location access required"}
              </p>
            </div>
          </div>
          <button
            onClick={handleRequestLocation}
            className="cursor-pointer"
            style={{
              marginTop: "16px",
              padding: "12px 18px",
              borderRadius: "14px",
              border: "1px solid rgba(59,130,246,0.35)",
              background: "rgba(59,130,246,0.1)",
              color: "#93c5fd",
              fontWeight: 800,
              fontFamily: "var(--font-family)",
              letterSpacing: "0.02em",
              opacity: geo.loading ? 0.7 : 1,
            }}
            disabled={geo.loading}
          >
            {geo.loading
              ? "Detecting Current Location..."
              : geo.hasCoordinates
                ? "Refresh Current Location"
                : "Use Current Location"}
          </button>

          {(locationError || geo.error) && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 12px",
                borderRadius: "12px",
                border: "1px solid rgba(239,68,68,0.28)",
                background: "rgba(239,68,68,0.08)",
                color: "#fecaca",
                fontSize: "12px",
                fontWeight: 700,
                maxWidth: "360px",
                textAlign: "center",
              }}
            >
              {locationError || geo.error}
            </div>
          )}
        </div>
      )}

      {/* TRIAGE */}
      {step === "form" && !selectedType && (
        <div
          style={{
            width: "100%",
            maxWidth: "700px",
            position: "relative",
            zIndex: 10,
          }}
          className="page-enter"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "32px",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  marginBottom: "6px",
                }}
              >
                Triage <span style={{ color: "#dc2626" }}>Class</span>
              </h2>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.875rem",
                  transition: "color 0.3s",
                }}
              >
                Select the nature of emergency for optimized resource
                allocation.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="cursor-pointer"
              style={{
                padding: "12px",
                borderRadius: "14px",
                background: "var(--bg-glass)",
                border: "1px solid var(--border-glass)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--bg-glass-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "var(--bg-glass)";
              }}
            >
              <ChevronLeft size={20} />
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            {EMERGENCY_TYPES.map((type) => {
              const c = COLORS[type.color] || "#ef4444";
              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className="glass-card cursor-pointer"
                  style={{
                    padding: "28px 24px",
                    textAlign: "left",
                    borderRadius: "24px",
                    background: "var(--bg-glass)",
                    transition: "all 0.3s",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${c}40`;
                    e.currentTarget.style.background = "var(--bg-glass-hover)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-glass)";
                    e.currentTarget.style.background = "var(--bg-glass)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "14px",
                      background: `${c}15`,
                      color: c,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "20px",
                    }}
                  >
                    {type.icon}
                  </div>
                  <h3
                    style={{
                      fontWeight: 700,
                      fontSize: "1.05rem",
                      marginBottom: "4px",
                    }}
                  >
                    {type.label}
                  </h3>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      color: "var(--text-muted)",
                      transition: "color 0.3s",
                    }}
                  >
                    Select Unit →
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === "form" && selectedType && (
        <div
          style={{ width: "100%", maxWidth: "520px" }}
          className="page-enter"
        >
          <EmergencyForm
            type={selectedType}
            typeInfo={EMERGENCY_TYPES.find((t) => t.value === selectedType)}
            geo={geo}
            onSubmit={handleSubmit}
            onBack={() => setSelectedType(null)}
            error={error}
          />
        </div>
      )}

      {step === "submitting" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "32px",
            position: "relative",
            zIndex: 10,
          }}
        >
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(220,38,38,0.15)",
                filter: "blur(40px)",
                borderRadius: "50%",
                animation: "pulse-glow 2s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "relative",
                width: "128px",
                height: "128px",
                borderRadius: "50%",
                border: "2px solid transparent",
                borderBottomColor: "#dc2626",
                animation: "spin 1s linear infinite",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Activity
                size={40}
                style={{
                  color: "#dc2626",
                  animation: "pulse-glow 2s ease-in-out infinite",
                }}
              />
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                marginBottom: "12px",
              }}
            >
              Calculating Optimal Response
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "12px",
                color: "var(--text-muted)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
              }}
            >
              <Loader2
                size={12}
                style={{ animation: "spin 1s linear infinite" }}
              />{" "}
              {loadingText}
            </div>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div
          style={{ width: "100%", maxWidth: "800px" }}
          className="page-enter"
        >
          <SOSResult
            result={result}
            onReset={handleReset}
            onSelectHospital={handleHospitalSelect}
            selectingHospitalId={selectingHospitalId}
            actionError={resultError}
            onCancelEmergency={handleCancelEmergency}
            cancellingEmergency={cancellingEmergency}
          />
        </div>
      )}
    </div>
  );
}
