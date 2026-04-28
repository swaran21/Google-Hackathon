import { PhoneCall, Send, X, Activity, XCircle } from "lucide-react";
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
  title = "Dispatch Console",
  cancelDisabled = false,
  cancelLabel = "Cancel Emergency Request",
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
      ? `Case ID: ${emergencyId.slice(-8).toUpperCase()}`
      : "Initializing Secure Connection...";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 10, 10, 0.4)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 9999 }}
    >
      <div
        className="neu-card"
        style={{
          width: "100%",
          maxWidth: "580px",
          borderRadius: "32px",
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          maxHeight: "88vh",
          background: "var(--bg-card)",
          position: "relative" }}
      >
        {/* Header Console */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div className="pulse-dot" style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--color-success)", boxShadow: "0 0 12px var(--color-success)" }} />
              <span style={{ fontSize: "11px", fontWeight: 900, color: "var(--color-success)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Active Secure Link
              </span>
            </div>
            <h3 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>{title}</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 700, marginTop: "2px" }}>
              {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="neu-button"
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--color-danger)",
              color: "#fff",
              border: "2px solid var(--bg-card)",
              boxShadow: "0 8px 18px rgba(220, 38, 38, 0.35)",
            }}
          >
            <X size={22} strokeWidth={3} />
          </button>
        </div>

        {/* Action Tray */}
        <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none" }}>
          {[
            { label: "Call Driver", phone: ambulance?.driverPhone, color: "var(--color-success)", icon: <PhoneCall size={16} /> },
            { label: "Hospital", phone: hospitalPhone, color: "var(--color-info)", icon: <PhoneCall size={16} /> },
            { label: "Patient", phone: patientPhone, color: "var(--color-warning)", icon: <PhoneCall size={16} /> }
          ].map((btn) => btn.phone && (
            <a key={btn.label} href={`tel:${btn.phone}`} style={{ textDecoration: "none" }}>
              <button
                className="neu-button"
                style={{
                  padding: "12px 18px",
                  borderRadius: "14px",
                  background: "var(--bg-card)",
                  color: btn.color,
                  fontWeight: 800,
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  whiteSpace: "nowrap"
                }}
              >
                {btn.icon} {btn.label}
              </button>
            </a>
          ))}
        </div>

        {/* Chat Interface */}
        <div
          className="neu-inner"
          style={{
            flex: 1,
            borderRadius: "24px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            minHeight: "300px",
            overflow: "hidden",
            background: "rgba(0,0,0,0.01)" }}
        >
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "8px" }}>
            {chatLog.map((item) => (
              <div
                key={item.id}
                style={{
                  alignSelf: item.from === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: item.from === "user" ? "flex-end" : "flex-start" }}
              >
                <span style={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "4px", padding: "0 4px" }}>
                  {item.senderName || "Unknown"} • {item.senderRole || "System"}
                </span>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: item.from === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                    background: item.from === "user" ? "var(--color-info)" : "var(--bg-card)",
                    color: item.from === "user" ? "#fff" : "var(--text-primary)",
                    fontSize: "14px",
                    fontWeight: 600,
                    boxShadow: item.from === "user" ? "0 4px 12px rgba(37, 99, 235, 0.2)" : "4px 4px 12px var(--shadow-dark)" }}
                >
                  {item.text}
                </div>
              </div>
            ))}
            {chatLog.length === 0 && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.4 }}>
                <Activity size={48} style={{ marginBottom: "16px" }} />
                <p style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "12px" }}>Establishing Encrypted Channel</p>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <div className="neu-inner" style={{ flex: 1, borderRadius: "16px", padding: "4px" }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Type your message..."
                disabled={!chatEnabled}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  fontSize: "14px",
                  fontFamily: "var(--font-family)" }}
              />
            </div>
            <button
              onClick={sendChat}
              disabled={!chatEnabled || !chatInput.trim()}
              className="neu-button"
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "16px",
                background: "var(--color-info)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: chatEnabled ? 1 : 0.5,
                boxShadow: "0 6px 20px rgba(37, 99, 235, 0.4)"
              }}
            >
              <Send size={20} />
            </button>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            disabled={cancelDisabled}
            className="neu-button"
            style={{
              borderRadius: "18px",
              padding: "16px",
              background: "var(--bg-card)",
              color: "var(--color-danger)",
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              fontSize: "13px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              opacity: cancelDisabled ? 0.6 : 1 }}
          >
            <XCircle size={20} /> {cancelLabel}
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
      `}} />
    </div>
  );
}


