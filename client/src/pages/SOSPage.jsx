import { useCallback, useEffect, useState } from "react";
import { useGeolocation, useSocket } from "../hooks/useSocket";
import {
  bookAmbulanceForEmergency,
  getEmergency,
  createEmergency,
  searchAmbulanceByVehicleNumber,
  selectHospitalForEmergency,
  cancelEmergencyRequest,
  getMyActiveEmergency,
} from "../services/api";
import EmergencyForm from "../components/EmergencyForm";
import SOSResult from "../components/SOSResult";
import FeedbackForm from "../components/FeedbackForm";
import socket from "../services/socket";
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
  blue: "#2563EB", // Updated for high contrast
  purple: "#a855f7",
  cyan: "#0891B2", // Updated for high contrast
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
  const [flowMode, setFlowMode] = useState("hospital_first");
  const [selectedType, setSelectedType] = useState(null);
  const [result, setResult] = useState(null);
  const [ambulanceSearchInput, setAmbulanceSearchInput] = useState("");
  const [searchingAmbulance, setSearchingAmbulance] = useState(false);
  const [ambulanceSearchError, setAmbulanceSearchError] = useState("");
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [selectedAmbulanceRoute, setSelectedAmbulanceRoute] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [error, setError] = useState("");
  const [resultError, setResultError] = useState("");
  const [loadingText, setLoadingText] = useState("Querying nearest fleets...");
  const [selectingHospitalId, setSelectingHospitalId] = useState(null);
  const [cancellingEmergency, setCancellingEmergency] = useState(false);
  const [bookingAmbulance, setBookingAmbulance] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const mergeEmergencyIntoResult = useCallback((emergencyData) => {
    if (!emergencyData?._id) return;

    setResult((prev) => {
      if (!prev) {
        return {
          emergency: emergencyData,
          ambulance: emergencyData.assignedAmbulance || null,
          selectedHospital: emergencyData.assignedHospital
            ? { hospital: emergencyData.assignedHospital }
            : null,
          requiresHospitalSelection:
            emergencyData.hospitalRequest?.status === "rejected" ||
            emergencyData.hospitalRequest?.status === "not_requested",
          requiresHospitalApproval:
            emergencyData.hospitalRequest?.status === "pending",
          canBookAmbulance:
            emergencyData.hospitalRequest?.status === "accepted" &&
            !emergencyData.assignedAmbulance,
          suggestedHospitals: [],
          notifications: [],
        };
      }

      const hospitalStatus = emergencyData.hospitalRequest?.status;

      return {
        ...prev,
        emergency: emergencyData,
        ambulance: emergencyData.assignedAmbulance || prev.ambulance || null,
        selectedHospital: emergencyData.assignedHospital
          ? {
              ...(prev.selectedHospital || {}),
              hospital: emergencyData.assignedHospital,
            }
          : prev.selectedHospital,
        requiresHospitalSelection:
          hospitalStatus === "rejected" || hospitalStatus === "not_requested",
        requiresHospitalApproval: hospitalStatus === "pending",
        canBookAmbulance:
          hospitalStatus === "accepted" && !emergencyData.assignedAmbulance,
      };
    });
  }, []);

  useEffect(() => {
    const fetchActive = async () => {
      try {
        const res = await getMyActiveEmergency();
        if (res.data.data) {
          mergeEmergencyIntoResult(res.data.data);
          setStep("result");
        }
      } catch (err) {
        console.error("Failed to fetch active emergency", err);
      }
    };
    fetchActive();
  }, [mergeEmergencyIntoResult]);

  const activeEmergencyId = result?.emergency?._id || null;

  useEffect(() => {
    if (!activeEmergencyId) return;

    socket.emit("emergency:join", activeEmergencyId);
    return () => {
      socket.emit("emergency:leave", activeEmergencyId);
    };
  }, [activeEmergencyId]);

  useSocket(socket, "emergency:hospital-decision", async (payload) => {
    if (!payload?.emergencyId || payload.emergencyId !== activeEmergencyId)
      return;

    try {
      const res = await getEmergency(activeEmergencyId);
      mergeEmergencyIntoResult(res.data.data);
    } catch {
      // Keep UI stable and rely on polling fallback.
    }
  });

  useSocket(socket, "emergency:ambulance-booked", async (payload) => {
    if (!payload?.emergencyId || payload.emergencyId !== activeEmergencyId)
      return;

    try {
      const res = await getEmergency(activeEmergencyId);
      mergeEmergencyIntoResult(res.data.data);
    } catch {
      // Keep UI stable and rely on polling fallback.
    }
  });

  useSocket(socket, "ambulance:location-update", (payload) => {
    if (!payload?.ambulanceId) return;

    setSelectedAmbulance((prev) => {
      if (!prev?._id) return prev;
      if (prev._id?.toString() !== payload.ambulanceId?.toString()) return prev;
      return {
        ...prev,
        location: payload.location || prev.location,
        status: payload.status || prev.status,
      };
    });

    setSelectedAmbulanceRoute((prev) => {
      if (!selectedAmbulance?._id) return prev;
      if (
        selectedAmbulance._id?.toString() !== payload.ambulanceId?.toString()
      ) {
        return prev;
      }

      return {
        ...(prev || {}),
        distanceKm: Number.isFinite(payload.routeDistanceKm)
          ? payload.routeDistanceKm
          : (prev?.distanceKm ?? null),
        etaMinutes: Number.isFinite(payload.routeEtaMinutes)
          ? payload.routeEtaMinutes
          : (prev?.etaMinutes ?? null),
        path: Array.isArray(payload.routePath) ? payload.routePath : prev?.path,
      };
    });
  });

  useEffect(() => {
    if (!activeEmergencyId) return;
    if (step !== "result") return;

    const needsPolling =
      !result?.ambulance &&
      ["pending", "accepted", "rejected", "not_requested"].includes(
        result?.emergency?.hospitalRequest?.status,
      );

    if (!needsPolling) return;

    const interval = setInterval(async () => {
      try {
        const res = await getEmergency(activeEmergencyId);
        mergeEmergencyIntoResult(res.data.data);

        // Show feedback form if emergency is resolved or cancelled and feedback not submitted yet
        if (
          ["resolved", "cancelled"].includes(res.data.data?.status) &&
          !feedbackSubmitted &&
          !showFeedbackForm
        ) {
          setShowFeedbackForm(true);
        }
      } catch {
        // Ignore intermittent polling failures.
      }
    }, 7000);

    return () => clearInterval(interval);
  }, [
    activeEmergencyId,
    step,
    result?.ambulance,
    result?.emergency?.hospitalRequest?.status,
    mergeEmergencyIntoResult,
  ]);

  useEffect(() => {
    const status = result?.emergency?.status;
    const isFeedbackSubmitted = Boolean(
      result?.emergency?.feedback?.isSubmitted,
    );

    if (
      step === "result" &&
      ["resolved", "cancelled"].includes(status) &&
      !feedbackSubmitted &&
      !isFeedbackSubmitted
    ) {
      setShowFeedbackForm(true);
    }
  }, [
    step,
    result?.emergency?.status,
    result?.emergency?.feedback?.isSubmitted,
    feedbackSubmitted,
  ]);

  const handleRequestLocation = async () => {
    setLocationError("");
    const location = await geo.requestLocation();
    if (!location) {
      setLocationError(
        "Allow browser location access to continue SOS dispatch.",
      );
    }
  };

  const handleSearchAmbulance = async () => {
    const vehicleNumber = ambulanceSearchInput.trim().toUpperCase();

    if (!vehicleNumber) {
      setAmbulanceSearchError(
        "Enter the ambulance number shared by the 108 driver.",
      );
      return;
    }

    setSearchingAmbulance(true);
    setAmbulanceSearchError("");

    try {
      const response = await searchAmbulanceByVehicleNumber(
        vehicleNumber,
        geo.hasCoordinates ? geo.latitude : undefined,
        geo.hasCoordinates ? geo.longitude : undefined,
      );

      const ambulance = response.data.data?.ambulance || null;
      const route = response.data.data?.route || null;

      if (!ambulance) {
        setAmbulanceSearchError("No active ambulance found for this number.");
        setSelectedAmbulance(null);
        setSelectedAmbulanceRoute(null);
        return;
      }

      setSelectedAmbulance(ambulance);
      setSelectedAmbulanceRoute(route);
    } catch (err) {
      setAmbulanceSearchError(
        err.response?.data?.message ||
          "Unable to locate that ambulance now. Please verify the number.",
      );
      setSelectedAmbulance(null);
      setSelectedAmbulanceRoute(null);
    } finally {
      setSearchingAmbulance(false);
    }
  };

  const handleSOS = () => {
    if (!geo.hasCoordinates) {
      setLocationError(
        'Tap "Use Current Location" and allow browser access before starting SOS.',
      );
      return;
    }

    if (flowMode === "ambulance_first" && !selectedAmbulance?._id) {
      setAmbulanceSearchError(
        "Search and select your ambulance number first before proceeding.",
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
    setLoadingText(
      flowMode === "ambulance_first"
        ? "Linking selected ambulance, analyzing emergency, and scanning hospitals..."
        : "Analyzing emergency and scanning nearby hospitals...",
    );

    try {
      const payload = {
        ...formData,
        type: selectedType,
        latitude: geo.latitude,
        longitude: geo.longitude,
        flowType: flowMode,
        selectedAmbulanceId:
          flowMode === "ambulance_first" ? selectedAmbulance?._id : undefined,
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
    setLoadingText("Sending bed request to selected hospital...");

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
          "Failed to submit hospital request. Please try another hospital.",
      );
      setStep("result");
    } finally {
      setSelectingHospitalId(null);
    }
  };

  const handleBookAmbulance = async (emergencyId) => {
    if (!emergencyId) return;

    setBookingAmbulance(true);
    setResultError("");
    setStep("submitting");
    setLoadingText("Booking nearest ambulance for approved hospital...");

    try {
      const res = await bookAmbulanceForEmergency(emergencyId);
      setResult(res.data.data);
      setStep("result");
    } catch (err) {
      setResultError(
        err.response?.data?.message ||
          "Unable to book ambulance right now. Please retry.",
      );
      setStep("result");
    } finally {
      setBookingAmbulance(false);
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
        requiresHospitalApproval: false,
        canBookAmbulance: false,
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
    setFlowMode("hospital_first");
    setAmbulanceSearchInput("");
    setSearchingAmbulance(false);
    setAmbulanceSearchError("");
    setSelectedAmbulance(null);
    setSelectedAmbulanceRoute(null);
    setCancellingEmergency(false);
    setBookingAmbulance(false);
    setShowFeedbackForm(false);
    setFeedbackSubmitted(false);
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
            "radial-gradient(circle at 50% 0%, var(--bg-card) 0%, transparent 50%)",
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
                background: "var(--bg-card)",
                border: "1px solid var(--bg-card)",
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
                  boxShadow: "0 0 8px var(--bg-card)",
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

            <div
              style={{
                marginTop: "18px",
                display: "inline-flex",
                padding: "4px",
                borderRadius: "14px",
                border: "1px solid var(--bg-card)",
                background: "var(--bg-card)",
                gap: "4px",
              }}
            >
              <button
                onClick={() => {
                  setFlowMode("hospital_first");
                  setAmbulanceSearchError("");
                }}
                className="neu-button"
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "none",
                  background:
                    flowMode === "hospital_first"
                      ? "rgba(239,68,68,0.18)"
                      : "transparent",
                  color:
                    flowMode === "hospital_first"
                      ? "#fecaca"
                      : "var(--text-muted)",
                  fontWeight: 800,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontFamily: "var(--font-family)",
                }}
              >
                Hospital First
              </button>
              <button
                onClick={() => setFlowMode("ambulance_first")}
                className="neu-button"
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "none",
                  background:
                    flowMode === "ambulance_first"
                      ? "rgba(34,197,94,0.18)"
                      : "transparent",
                  color:
                    flowMode === "ambulance_first"
                      ? "#bbf7d0"
                      : "var(--text-muted)",
                  fontWeight: 800,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontFamily: "var(--font-family)",
                }}
              >
                Ambulance First
              </button>
            </div>

            {flowMode === "ambulance_first" && (
              <div
                className="neu-card"
                style={{
                  marginTop: "18px",
                  padding: "14px",
                  borderRadius: "16px",
                  textAlign: "left",
                  border: "1px solid var(--bg-card)",
                  background: "var(--bg-card)",
                  minWidth: "360px",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "#bbf7d0",
                    marginBottom: "8px",
                  }}
                >
                  108 Driver Number Lookup
                </p>
                <div
                  style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
                >
                  <input
                    value={ambulanceSearchInput}
                    onChange={(event) =>
                      setAmbulanceSearchInput(event.target.value.toUpperCase())
                    }
                    placeholder="Enter ambulance number (e.g. HYD01-001)"
                    style={{
                      flex: 1,
                      borderRadius: "12px",
                      border: "1px solid var(--bg-card)",
                      background: "var(--bg-card)",
                      color: "var(--text-primary)",
                      padding: "10px 12px",
                      outline: "none",
                      fontFamily: "var(--font-family)",
                    }}
                  />
                  <button
                    onClick={handleSearchAmbulance}
                    className="neu-button"
                    disabled={searchingAmbulance}
                    style={{
                      borderRadius: "12px",
                      border: "none",
                      background: "#16a34a",
                      color: "#dcfce7",
                      padding: "10px 12px",
                      fontWeight: 800,
                      fontFamily: "var(--font-family)",
                      opacity: searchingAmbulance ? 0.7 : 1,
                    }}
                  >
                    {searchingAmbulance ? "Searching..." : "Find"}
                  </button>
                </div>

                {selectedAmbulance && (
                  <div
                    style={{
                      borderRadius: "12px",
                      border: "1px solid rgba(34,197,94,0.3)",
                      background: "rgba(34,197,94,0.12)",
                      padding: "10px 12px",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 800,
                        fontSize: "13px",
                        marginBottom: "4px",
                      }}
                    >
                      {selectedAmbulance.vehicleNumber} •{" "}
                      {selectedAmbulance.status}
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Driver: {selectedAmbulance.driverName} (
                      {selectedAmbulance.driverPhone})
                    </p>
                    {selectedAmbulanceRoute?.etaMinutes ? (
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#86efac",
                          marginTop: "4px",
                          fontWeight: 700,
                        }}
                      >
                        ETA to your location:{" "}
                        {Math.max(
                          1,
                          Math.round(selectedAmbulanceRoute.etaMinutes),
                        )}{" "}
                        min
                        {Number.isFinite(selectedAmbulanceRoute?.distanceKm)
                          ? ` • ${Number(selectedAmbulanceRoute.distanceKm).toFixed(1)} km`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                )}

                {ambulanceSearchError && (
                  <p
                    style={{
                      marginTop: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#fecaca",
                    }}
                  >
                    {ambulanceSearchError}
                  </p>
                )}
              </div>
            )}
          </div>
          <div style={{ position: "relative", marginBottom: "64px" }}>
            {/* Machined Outer Ring */}
            <div
              className="neu-inner"
              style={{
                position: "absolute",
                inset: "-20px",
                borderRadius: "50%",
                background: "var(--bg-primary)",
                border: "2px solid var(--shadow-dark)",
              }}
            />

            <button
              onClick={handleSOS}
              className="sos-button cursor-pointer"
              style={{
                position: "relative",
                zIndex: 10,
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                background:
                  "linear-gradient(145deg, var(--color-danger), #dc2626)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                border: "none",
                boxShadow: "0 0 40px var(--color-danger)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "0",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 70%)",
                }}
              />
              <AlertCircle
                size={56}
                style={{
                  color: "#fff",
                  marginBottom: "8px",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
                }}
              />
              <span
                style={{
                  fontSize: "2.2rem",
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                }}
              >
                SOS
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.9)",
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  marginTop: "6px",
                }}
              >
                PRESS TO HELP
              </span>
            </button>
          </div>
          <div
            className="neu-card"
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
                background: geo.loading ? "var(--bg-card)" : "var(--bg-card)",
              }}
            >
              <MapPin
                size={18}
                style={{
                  color: geo.loading
                    ? "var(--color-warning)"
                    : "var(--color-success)",
                }}
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
            className="neu-button"
            style={{
              marginTop: "16px",
              padding: "12px 18px",
              borderRadius: "14px",
              border: "1px solid var(--bg-card)",
              background: "var(--bg-card)",
              color: "var(--color-info)",
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
                border: "1px solid var(--bg-card)",
                background: "var(--bg-card)",
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
              className="neu-button"
              style={{
                padding: "12px",
                borderRadius: "14px",
                background: "var(--bg-card)",
                border: "1px solid transparent",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--bg-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "var(--bg-card)";
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
                  className="neu-card cursor-pointer"
                  style={{
                    padding: "28px 24px",
                    textAlign: "left",
                    borderRadius: "24px",
                    background: "var(--bg-card)",
                    transition: "all 0.3s",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${c}40`;
                    e.currentTarget.style.background = "var(--bg-secondary)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.background = "var(--bg-card)";
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
          {flowMode === "ambulance_first" && selectedAmbulance && (
            <div
              className="neu-card"
              style={{
                marginBottom: "14px",
                padding: "12px 14px",
                borderRadius: "14px",
                border: "1px solid rgba(34,197,94,0.35)",
                background: "rgba(34,197,94,0.12)",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "#bbf7d0",
                  marginBottom: "4px",
                }}
              >
                Ambulance-First Mode
              </p>
              <p style={{ fontWeight: 800, fontSize: "0.92rem" }}>
                {selectedAmbulance.vehicleNumber} •{" "}
                {selectedAmbulance.driverName}
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  marginTop: "4px",
                }}
              >
                Submit patient details next. AI will suggest hospitals after
                this step.
              </p>
            </div>
          )}

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
                background: "var(--bg-card)",
                filter: "blur(40px)",
                borderRadius: "50%",
                animation: "pulse-glow 2s ease-in-out infinite",
              }}
            />
            <div
              className="spinner"
              style={{ width: "80px", height: "80px" }}
            ></div>
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
            onBookAmbulance={handleBookAmbulance}
            selectingHospitalId={selectingHospitalId}
            actionError={resultError}
            onCancelEmergency={handleCancelEmergency}
            cancellingEmergency={cancellingEmergency}
            bookingAmbulance={bookingAmbulance}
          />

          {showFeedbackForm && result?.emergency?._id && (
            <FeedbackForm
              emergencyId={result.emergency._id}
              onSubmitSuccess={() => {
                setShowFeedbackForm(false);
                setFeedbackSubmitted(true);
              }}
              onCancel={() => {
                setShowFeedbackForm(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
