import { PhoneCall, Send, X, XCircle } from "lucide-react";
import useEmergencyChat from "../../hooks/useEmergencyChat";
import { useAuth } from "../../context/AuthContext";

export default function DispatchControlModal({
  isOpen,
  emergencyId,
  emergencyChatSeed = [],
  ambulance,
  hospitalPhone,
  patientPhone,
  onClose,
  onCancel,
  title = "Dispatch Interface",
  cancelDisabled = false,
  cancelLabel = "Cancel Ambulance + Hospital Request",
}) {
  const { user } = useAuth();

  const { chatInput, setChatInput, chatLog, sendChat } = useEmergencyChat({
    emergencyId,
    enabled: isOpen,
    currentUserRole: user?.role,
    currentUserName: user?.name,
    currentUserId: user?.id || user?._id,
    initialMessages: emergencyChatSeed,
  });

  if (!isOpen) return null;

  const chatEnabled = Boolean(emergencyId);
  const subtitle = ambulance
    ? `Unit ${ambulance.vehicleNumber} • ${ambulance.driverName}`
    : emergencyId
      ? `Emergency ${emergencyId.slice(-8).toUpperCase()}`
      : "Emergency context unavailable";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg-card)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 70 }}
    >
      <div
        className="neu-card"
        style={{
          width: "100%",
          maxWidth: "560px",
          borderRadius: "24px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxHeight: "82vh" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative"
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900 }}>{title}</h3>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                marginTop: "4px" }}
            >
              {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="neu-button"
            style={{
              position: "absolute",
              top: "-12px",
              right: "-12px",
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              background: "var(--color-danger)", // High intensity crimson
              border: "3px solid var(--bg-card)",
              zIndex: 100, // Ensure it's above everything
              boxShadow: "0 6px 20px rgba(0,0,0,0.3)"
            }}
          >
            <XCircle size={24} strokeWidth={3} />
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {ambulance?.driverPhone && (
            <a
              href={`tel:${ambulance.driverPhone}`}
              style={{ textDecoration: "none" }}
            >
              <button
                className="neu-button"
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--bg-card)",
                  background: "var(--bg-card)",
                  color: "var(--color-success)",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "var(--font-family)" }}
              >
                <PhoneCall size={14} /> Call Ambulance
              </button>
            </a>
          )}
          {hospitalPhone && (
            <a href={`tel:${hospitalPhone}`} style={{ textDecoration: "none" }}>
              <button
                className="neu-button"
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--bg-card)",
                  background: "var(--bg-card)",
                  color: "var(--color-info)",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "var(--font-family)" }}
              >
                <PhoneCall size={14} /> Call Hospital
              </button>
            </a>
          )}
          {patientPhone && (
            <a href={`tel:${patientPhone}`} style={{ textDecoration: "none" }}>
              <button
                className="neu-button"
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--bg-card)",
                  background: "var(--bg-card)",
                  color: "var(--color-warning)",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "var(--font-family)" }}
              >
                <PhoneCall size={14} /> Call Patient
              </button>
            </a>
          )}
        </div>

        <div
          className="neu-inner" style={{  borderRadius: "12px", padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: "200px" }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 800,
              textTransform: "uppercase",
              color: "var(--text-muted)",
              letterSpacing: "0.12em" }}
          >
            Dispatch Chat
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px" }}
          >
            {chatLog.map((item) => (
              <div
                key={item.id}
                style={{
                  alignSelf: item.from === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  background:
                    item.from === "user"
                      ? "var(--bg-card)"
                      : "var(--bg-card)",
                  color:
                    item.from === "user" ? "#bfdbfe" : "var(--text-secondary)",
                  fontSize: "12px",
                  fontWeight: 600 }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "4px",
                    color:
                      item.from === "user" ? "var(--color-info)" : "var(--text-muted)" }}
                >
                  {item.senderName || "Unknown"} • {item.senderRole || "system"}
                </div>
                {item.text}
              </div>
            ))}
          </div>
          {!chatEnabled && (
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "#fca5a5",
                fontWeight: 600 }}
            >
              Chat becomes available once this case has a valid emergency ID.
            </p>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a real-time message"
              disabled={!chatEnabled}
              style={{
                flex: 1,
                borderRadius: "10px",
                border: "1px solid transparent",
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                padding: "10px 12px",
                fontFamily: "var(--font-family)" }}
            />
            <button
              onClick={sendChat}
              disabled={!chatEnabled}
              className="neu-button"
              style={{
                borderRadius: "10px",
                border: "none",
                background: "#2563eb",
                color: "#fff",
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: chatEnabled ? 1 : 0.55 }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            disabled={cancelDisabled}
            className="neu-button"
            style={{
              borderRadius: "12px",
              border: "1px solid var(--bg-card)",
              background: "var(--bg-card)",
              color: "#fca5a5",
              padding: "12px 14px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontFamily: "var(--font-family)",
              opacity: cancelDisabled ? 0.65 : 1 }}
          >
            <XCircle size={14} /> {cancelLabel}
          </button>
        )}
      </div>
    </div>
  );
}
