import { ShieldAlert } from "lucide-react";

export default function AmbulanceDispatchCard({
  ambulance,
  requiresHospitalSelection,
  onOpenDispatch,
}) {
  if (!ambulance) {
    return (
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
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <button
        onClick={onOpenDispatch}
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
  );
}
