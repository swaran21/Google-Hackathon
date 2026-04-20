import { PhoneCall, Send, X, XCircle } from "lucide-react";
import useDispatchChat from "../../hooks/useDispatchChat";

export default function DispatchControlModal({
  isOpen,
  ambulance,
  hospitalPhone,
  onClose,
  onCancel,
  cancelDisabled = false,
  cancelLabel = "Cancel Ambulance + Hospital Request",
}) {
  const { chatInput, setChatInput, chatLog, sendChat } = useDispatchChat({
    ambulance,
    enabled: isOpen,
  });

  if (!isOpen || !ambulance) return null;

  return (
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
        zIndex: 70,
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
            onClick={onClose}
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
          {hospitalPhone && (
            <a href={`tel:${hospitalPhone}`} style={{ textDecoration: "none" }}>
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
                  alignSelf: item.from === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  background:
                    item.from === "user"
                      ? "rgba(37,99,235,0.18)"
                      : "rgba(148,163,184,0.12)",
                  color:
                    item.from === "user" ? "#bfdbfe" : "var(--text-secondary)",
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
              onClick={sendChat}
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
          onClick={onCancel}
          disabled={cancelDisabled}
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
            opacity: cancelDisabled ? 0.65 : 1,
          }}
        >
          <XCircle size={14} /> {cancelLabel}
        </button>
      </div>
    </div>
  );
}
