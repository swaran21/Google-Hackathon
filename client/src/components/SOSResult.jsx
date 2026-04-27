import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  Cpu,
  Map as MapIcon,
  MessageSquare,
  Navigation,
} from "lucide-react";
import DispatchControlModal from "./common/DispatchControlModal";
import AmbulanceDispatchCard from "./sos/AmbulanceDispatchCard";
import HospitalSuggestionsPanel from "./sos/HospitalSuggestionsPanel";

const SEV = {
  1: {
    color: "#4ade80",
    bg: "var(--bg-card)",
    border: "var(--bg-card)",
    label: "LOW",
  },
  2: {
    color: "#60a5fa",
    bg: "var(--bg-card)",
    border: "var(--bg-card)",
    label: "MODERATE",
  },
  3: {
    color: "#facc15",
    bg: "var(--bg-card)",
    border: "var(--bg-card)",
    label: "HIGH",
  },
  4: {
    color: "#fb923c",
    bg: "var(--bg-card)",
    border: "var(--bg-card)",
    label: "CRITICAL",
  },
  5: {
    color: "#fca5a5",
    bg: "var(--bg-card)",
    border: "var(--bg-card)",
    label: "EXTREME",
  },
};

export default function SOSResult({
  result,
  onReset,
  onSelectHospital,
  onBookAmbulance,
  selectingHospitalId,
  actionError,
  onCancelEmergency,
  cancellingEmergency = false,
  bookingAmbulance = false,
}) {
  const navigate = useNavigate();
  const [showDispatchPanel, setShowDispatchPanel] = useState(false);

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
    suggestedHospitals.find((entry) => entry.recommended) ||
    suggestedHospitals[0];
  const topHospital = selectedHospital || recommendedHospitalEntry?.hospital;
  const hospitalRequestStatus =
    emergency?.hospitalRequest?.status || "not_requested";
  const requiresHospitalSelection =
    (!!result?.requiresHospitalSelection ||
      hospitalRequestStatus === "rejected") &&
    !ambulance;
  const waitingHospitalApproval =
    !ambulance &&
    (!!result?.requiresHospitalApproval || hospitalRequestStatus === "pending");
  const canBookAmbulance =
    !ambulance &&
    (!!result?.canBookAmbulance ||
      emergency?.ambulanceBooking?.status === "ready_to_book" ||
      hospitalRequestStatus === "accepted");
  const sev = SEV[triage?.severity] || SEV[3];
  const roleGuidance = triage?.roleGuidance || {};
  const hasRoleGuidance =
    (roleGuidance.userSteps || []).length > 0 ||
    (roleGuidance.ambulanceChecklist || []).length > 0 ||
    (roleGuidance.hospitalPrep || []).length > 0 ||
    (roleGuidance.requiredDoctorSpecialties || []).length > 0 ||
    (roleGuidance.likelyTreatments || []).length > 0;

  const handleCancelDispatch = async () => {
    if (!onCancelEmergency || !emergency?._id) return;
    await onCancelEmergency(emergency._id);
    setShowDispatchPanel(false);
  };

  const openDispatchControls = () => {
    if (!emergency?._id) return;
    if (!ambulance && !topHospital) return;
    setShowDispatchPanel(true);
  };

  const handleBookAmbulance = async () => {
    if (!onBookAmbulance || !emergency?._id) return;
    await onBookAmbulance(emergency._id);
  };

  return (
    <div
      className="page-enter"
      style={{
        width: "100%",
        maxWidth: "900px",
        display: "flex",
        flexDirection: "column",
        gap: "24px" }}
    >
      <div
        style={{
          textAlign: "center",
          paddingBottom: "28px",
          borderBottom: "1px solid transparent" }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            margin: "0 auto 20px",
            background: "var(--bg-card)",
            border: "1px solid var(--bg-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 40px var(--bg-card)" }}
        >
          <CheckCircle2 size={36} style={{ color: "#22c55e" }} />
        </div>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            marginBottom: "8px" }}
        >
          {requiresHospitalSelection
            ? "Select Receiving Hospital"
            : waitingHospitalApproval
              ? "Awaiting Hospital Approval"
              : canBookAmbulance
                ? "Hospital Approved - Book Ambulance"
                : "Response Active"}
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px" }}
        >
          <span
            style={{
              fontSize: "11px",
              fontFamily: "monospace",
              fontWeight: 700,
              color: "var(--text-muted)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              transition: "color 0.3s" }}
          >
            Emergency ID
          </span>
          <span
            style={{
              padding: "4px 12px",
              background: "var(--bg-card)",
              border: "1px solid transparent",
              borderRadius: "8px",
              color: "#ef4444",
              fontFamily: "monospace",
              fontSize: "0.875rem",
              fontWeight: 900,
              textTransform: "uppercase" }}
          >
            {emergency._id.slice(-8)}
          </span>
        </div>
      </div>

      {actionError && (
        <div
          className="neu-card"
          style={{
            padding: "16px 20px",
            borderRadius: "18px",
            border: "1px solid var(--bg-card)",
            background: "var(--bg-card)",
            color: "#fecaca",
            fontWeight: 700 }}
        >
          {actionError}
        </div>
      )}

      {cancellationMessage && (
        <div
          className="neu-card"
          style={{
            padding: "16px 20px",
            borderRadius: "18px",
            border: "1px solid var(--bg-card)",
            background: "var(--bg-card)",
            color: "#bbf7d0",
            fontWeight: 700 }}
        >
          {cancellationMessage}
        </div>
      )}

      {waitingHospitalApproval && (
        <div
          className="neu-card"
          style={{
            padding: "16px 20px",
            borderRadius: "18px",
            border: "1px solid var(--bg-card)",
            background: "var(--bg-card)",
            color: "#fde68a",
            fontWeight: 700 }}
        >
          Bed request sent to hospital. Waiting for hospital admin approval.
        </div>
      )}

      {hospitalRequestStatus === "rejected" && (
        <div
          className="neu-card"
          style={{
            padding: "16px 20px",
            borderRadius: "18px",
            border: "1px solid var(--bg-card)",
            background: "var(--bg-card)",
            color: "#fecaca",
            fontWeight: 700 }}
        >
          Hospital declined this request. Select another hospital below.
        </div>
      )}

      {canBookAmbulance && (
        <div
          className="neu-card"
          style={{
            padding: "14px 16px",
            borderRadius: "18px",
            border: "1px solid var(--bg-card)",
            background: "var(--bg-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap" }}
        >
          <span style={{ color: "#bbf7d0", fontWeight: 800 }}>
            Hospital accepted your bed request. Book ambulance now.
          </span>
          <button
            onClick={handleBookAmbulance}
            disabled={bookingAmbulance}
            className="neu-button"
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "none",
              background: "#22c55e",
              color: "#052e16",
              fontWeight: 900,
              fontFamily: "var(--font-family)",
              opacity: bookingAmbulance ? 0.7 : 1 }}
          >
            {bookingAmbulance ? "Booking..." : "Book Ambulance"}
          </button>
        </div>
      )}

      {emergency?._id && (ambulance || topHospital) && (
        <button
          onClick={openDispatchControls}
          className="neu-card cursor-pointer"
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: "18px",
            border: "1px solid var(--bg-card)",
            background: "var(--bg-card)",
            color: "#bfdbfe",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            fontFamily: "var(--font-family)" }}
        >
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "4px" }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#93c5fd" }}
            >
              {ambulance ? "Booked Ambulance" : "Hospital Coordination"}
            </span>
            <span
              style={{
                fontSize: "0.95rem",
                fontWeight: 800,
                fontFamily: "monospace" }}
            >
              {ambulance?.vehicleNumber || topHospital?.name}
            </span>
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.1em" }}
          >
            Tap to Chat / Call {ambulance ? "/ Cancel" : ""}
          </span>
        </button>
      )}

      {requiresHospitalSelection && (
        <HospitalSuggestionsPanel
          suggestedHospitals={suggestedHospitals}
          selectingHospitalId={selectingHospitalId}
          onSelectHospital={onSelectHospital}
        />
      )}

      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "32px",
          background: "var(--bg-card)",
          border: `1px solid ${sev.border}`,
          borderRadius: "28px" }}
      >
        <div
          style={{
            position: "absolute",
            top: "24px",
            right: "24px",
            opacity: 0.04,
            pointerEvents: "none" }}
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
              marginBottom: "20px" }}
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
                  justifyContent: "center" }}
              >
                <Cpu size={22} />
              </div>
              <h3
                style={{
                  fontSize: "12px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: sev.color }}
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
                color: sev.color }}
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
              transition: "color 0.3s" }}
          >
            "{triage?.reasoning}"
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "20px",
              paddingTop: "20px",
              borderTop: "1px solid transparent" }}
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
                    marginBottom: "4px" }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontSize: item.small ? "10px" : "1.1rem",
                    fontWeight: 800,
                    textTransform: "capitalize",
                    fontFamily: item.small ? "monospace" : "inherit",
                    opacity: item.small ? 0.5 : 1 }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {hasRoleGuidance && (
            <div
              style={{
                marginTop: "18px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "10px" }}
            >
              <div
                style={{
                  borderRadius: "12px",
                  border: "1px solid var(--bg-card)",
                  background: "var(--bg-card)",
                  padding: "10px" }}
              >
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 900,
                    color: "#22c55e" }}
                >
                  For You Now
                </p>
                <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.45 }}>
                  {(roleGuidance.userSteps || []).slice(0, 3).join(" • ") ||
                    "Stay calm and remain reachable for responder call."}
                </p>
              </div>

              <div
                style={{
                  borderRadius: "12px",
                  border: "1px solid var(--bg-card)",
                  background: "var(--bg-card)",
                  padding: "10px" }}
              >
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 900,
                    color: "#3b82f6" }}
                >
                  Ambulance Checklist
                </p>
                <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.45 }}>
                  {(roleGuidance.ambulanceChecklist || []).slice(0, 3).join(" • ") ||
                    "Standard stabilization kit and monitor setup."}
                </p>
              </div>

              <div
                style={{
                  borderRadius: "12px",
                  border: "1px solid var(--bg-card)",
                  background: "var(--bg-card)",
                  padding: "10px" }}
              >
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 900,
                    color: "#f97316" }}
                >
                  Hospital Preparation
                </p>
                <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.45 }}>
                  {(roleGuidance.hospitalPrep || []).slice(0, 2).join(" • ") ||
                    "Prepare emergency intake and baseline diagnostics."}
                </p>
                {(roleGuidance.requiredDoctorSpecialties || []).length > 0 && (
                  <p style={{ margin: "6px 0 0", fontSize: "11px" }}>
                    Doctor: {roleGuidance.requiredDoctorSpecialties.join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px" }}
      >
        <div
          className="neu-card"
          style={{ padding: "28px", borderRadius: "28px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px" }}
          >
            <div
              style={{
                padding: "12px",
                borderRadius: "14px",
                background: "var(--bg-card)",
                color: "#3b82f6",
                display: "flex" }}
            >
              <Navigation size={22} />
            </div>
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "#3b82f6" }}
            >
              Unit Deployment
            </h3>
          </div>

          <AmbulanceDispatchCard
            ambulance={ambulance}
            requiresHospitalSelection={requiresHospitalSelection}
            onOpenDispatch={openDispatchControls}
          />
        </div>

        <div
          className="neu-card"
          style={{ padding: "28px", borderRadius: "28px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px" }}
          >
            <div
              style={{
                padding: "12px",
                borderRadius: "14px",
                background: "var(--bg-card)",
                color: "#22c55e",
                display: "flex" }}
            >
              <Building2 size={22} />
            </div>
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "#22c55e" }}
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
                  lineHeight: 1.3 }}
              >
                {topHospital.name}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px" }}
              >
                <div
                  style={{
                    padding: "14px",
                    background: "var(--bg-card)",
                    borderRadius: "14px" }}
                >
                  <p
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: "var(--text-muted)",
                      textTransform: "uppercase" }}
                  >
                    Emergency Beds
                  </p>
                  <p
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 900,
                      color: "#22c55e" }}
                  >
                    {topHospital.availableBeds}
                  </p>
                </div>
                <div
                  style={{
                    padding: "14px",
                    background: "var(--bg-card)",
                    borderRadius: "14px" }}
                >
                  <p
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: "var(--text-muted)",
                      textTransform: "uppercase" }}
                  >
                    ICU Capacity
                  </p>
                  <p
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 900,
                      color:
                        topHospital.icuAvailable > 0 ? "#22c55e" : "#ef4444" }}
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

      {notifications?.length > 0 && (
        <div
          className="neu-card"
          style={{ padding: "28px", borderRadius: "28px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px" }}
          >
            <MessageSquare size={18} style={{ color: "var(--text-muted)" }} />
            <h4
              style={{
                fontSize: "10px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: "var(--text-muted)" }}
            >
              Alert Propagation Log
            </h4>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {notifications.map((notification, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "14px",
                  background: "var(--bg-card)",
                  border: "1px solid transparent" }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#22c55e" }}
                  />
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--text-secondary)" }}
                  >
                    {notification.to}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "monospace",
                    color: "var(--text-muted)",
                    textTransform: "uppercase" }}
                >
                  {notification.provider} SYNC SUCCESS
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <DispatchControlModal
        isOpen={showDispatchPanel && !!emergency?._id}
        title={ambulance ? "Dispatch Interface" : "Hospital Coordination"}
        emergencyId={emergency?._id}
        emergencyChatSeed={emergency?.chatThread || []}
        ambulance={ambulance || null}
        hospitalPhone={topHospital?.phone}
        onClose={() => setShowDispatchPanel(false)}
        onCancel={handleCancelDispatch}
        cancelDisabled={cancellingEmergency}
        cancelLabel={
          cancellingEmergency
            ? "Cancelling..."
            : "Cancel Ambulance + Hospital Request"
        }
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "12px",
          paddingTop: "16px" }}
      >
        {ambulance && (
          <button
            onClick={() => navigate("/tracking")}
            className="neu-button"
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
              boxShadow: "0 8px 24px var(--bg-card)",
              transition: "all 0.3s",
              fontFamily: "var(--font-family)" }}
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
          className="neu-button"
          style={{
            padding: "14px 28px",
            background: "transparent",
            color: "var(--text-muted)",
            borderRadius: "16px",
            fontWeight: 700,
            border: "none",
            transition: "color 0.2s",
            fontFamily: "var(--font-family)" }}
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
