import { Link } from "react-router-dom";
import {
  Activity,
  Ambulance,
  Building2,
  Cpu,
  MapPin,
  Navigation,
  Shield,
  User,
} from "lucide-react";

const HIGHLIGHTS = [
  {
    title: "AI triage in seconds",
    body:
      "Classifies severity and response level so the right resources move first.",
    icon: <Activity size={22} />,
    color: "#ef4444",
  },
  {
    title: "Location-aware dispatch",
    body:
      "Routes ambulances using live distance and ETA instead of straight-line guesses.",
    icon: <Navigation size={22} />,
    color: "#2563eb",
  },
  {
    title: "Capacity-aware hospitals",
    body:
      "Matches hospitals by beds, ICU capacity, and specialty fit.",
    icon: <Building2 size={22} />,
    color: "#22c55e",
  },
];

const FLOW_CARDS = [
  {
    title: "Ambulance-first flow",
    tone: "#22c55e",
    steps: [
      "Caller receives ambulance vehicle number",
      "Vehicle is verified in SOS console",
      "Patient record and AI triage are captured",
      "Hospital is selected based on beds and distance",
      "Live tracking and updates guide the response",
    ],
  },
  {
    title: "Hospital-first flow",
    tone: "#2563eb",
    steps: [
      "User shares emergency type and location",
      "AI triage suggests required care level",
      "Hospital shortlist is generated and selected",
      "Hospital confirms bed allocation",
      "Ambulance is assigned and monitored live",
    ],
  },
];

const ROLE_CARDS = [
  {
    title: "User",
    body: "Report emergencies, follow triage guidance, and track the unit.",
    icon: <User size={20} />,
  },
  {
    title: "Ambulance",
    body: "Accept dispatches, stream GPS, and update mission status.",
    icon: <Ambulance size={20} />,
  },
  {
    title: "Hospital",
    body: "Approve bed requests, prepare teams, and monitor arrivals.",
    icon: <Building2 size={20} />,
  },
  {
    title: "Admin",
    body: "View system health, active emergencies, and fleet availability.",
    icon: <Shield size={20} />,
  },
];

const TECH_STACK = [
  "React",
  "Vite",
  "Tailwind CSS",
  "Node.js",
  "Express",
  "Socket.io",
  "MongoDB",
  "OSRM",
  "Gemini API",
];

export default function AboutPage() {
  return (
    <div
      className="page-enter"
      style={{
        minHeight: "100vh",
        padding: "96px 24px 48px",
        display: "flex",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          display: "flex",
          flexDirection: "column",
          gap: "36px",
          position: "relative",
          zIndex: 5,
        }}
      >
        <section
          className="neu-card"
          style={{
            padding: "32px",
            borderRadius: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            animation: "fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            className="neu-inner"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 18px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--color-danger)",
                boxShadow: "0 0 10px rgba(239,68,68,0.6)",
              }}
            />
            Smart Resource Allocation
          </div>
          <h1
            className="neu-text"
            style={{
              fontSize: "2.6rem",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            About <span style={{ color: "var(--color-secondary)" }}>ResQNet AI</span>
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "1rem",
              lineHeight: 1.8,
              maxWidth: "780px",
            }}
          >
            ResQNet AI is a hackathon-built emergency response platform that
            optimizes ambulance dispatch and hospital allocation using AI
            triage, live geospatial routing, and capacity intelligence. The
            system coordinates users, drivers, hospitals, and admins on a
            single, real-time operational layer.
          </p>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.95rem",
              lineHeight: 1.7,
              maxWidth: "780px",
            }}
          >
            The AI triage engine uses the Gemini API to analyze the emergency
            type and description, then produces severity, recommended
            equipment, and role-based guidance to prioritize the response.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <Link
              to="/sos"
              className="sos-button"
              style={{
                textDecoration: "none",
                padding: "12px 24px",
                borderRadius: "14px",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Activity size={18} /> Launch SOS
            </Link>
            <Link
              to="/tracking"
              className="neu-button"
              style={{
                textDecoration: "none",
                padding: "12px 24px",
                borderRadius: "14px",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <MapPin size={18} /> Live Tracking
            </Link>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            animation: "fadeIn 0.6s 0.12s cubic-bezier(0.4, 0, 0.2, 1)",
            animationFillMode: "both",
          }}
        >
          {HIGHLIGHTS.map((item) => (
            <div
              key={item.title}
              className="neu-card"
              style={{
                padding: "20px",
                borderRadius: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                className="neu-card"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: item.color,
                }}
              >
                {item.icon}
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 800 }}>{item.title}</h3>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                {item.body}
              </p>
            </div>
          ))}
        </section>

        <section
          className="neu-card"
          style={{
            padding: "28px",
            borderRadius: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            animation: "fadeIn 0.6s 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            animationFillMode: "both",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              className="neu-card"
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-info)",
              }}
            >
              <Cpu size={22} />
            </div>
            <div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                Dual Workflow Engine
              </p>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 900 }}>
                How the platform runs the response
              </h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {FLOW_CARDS.map((flow) => (
              <div
                key={flow.title}
                className="neu-inner"
                style={{
                  borderRadius: "18px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: flow.tone,
                      boxShadow: `0 0 12px ${flow.tone}66`,
                    }}
                  />
                  <h3 style={{ fontSize: "1rem", fontWeight: 800 }}>{flow.title}</h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {flow.steps.map((step, index) => (
                    <div
                      key={`${flow.title}-${index}`}
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "flex-start",
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "8px",
                          background: "var(--bg-card)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "0.7rem",
                          color: flow.tone,
                        }}
                      >
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "14px",
            animation: "fadeIn 0.6s 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
            animationFillMode: "both",
          }}
        >
          {ROLE_CARDS.map((role) => (
            <div
              key={role.title}
              className="neu-card"
              style={{
                padding: "18px",
                borderRadius: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                className="neu-card"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-secondary)",
                }}
              >
                {role.icon}
              </div>
              <h4 style={{ fontWeight: 800 }}>{role.title}</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                {role.body}
              </p>
            </div>
          ))}
        </section>

        <section
          className="neu-card"
          style={{
            padding: "24px",
            borderRadius: "22px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            animation: "fadeIn 0.6s 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            animationFillMode: "both",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              className="neu-card"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-warning)",
              }}
            >
              <Navigation size={20} />
            </div>
            <div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  color: "var(--text-muted)",
                }}
              >
                Technology Stack
              </p>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 900 }}>
                Built for real-time coordination
              </h3>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="neu-inner"
                style={{
                  padding: "8px 14px",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-secondary)",
                }}
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        <section
          className="neu-card"
          style={{
            padding: "24px",
            borderRadius: "22px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            alignItems: "center",
            textAlign: "center",
            animation: "fadeIn 0.6s 0.42s cubic-bezier(0.4, 0, 0.2, 1)",
            animationFillMode: "both",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: 900 }}>
            Ready to see the live system?
          </h2>
          <p style={{ color: "var(--text-muted)", maxWidth: "520px", lineHeight: 1.6 }}>
            Explore the SOS console or watch the real-time tracking view to see
            how resources are coordinated in minutes.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <Link
              to="/login"
              className="neu-button"
              style={{
                textDecoration: "none",
                padding: "12px 22px",
                borderRadius: "12px",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Shield size={16} /> Sign In
            </Link>
            <Link
              to="/tracking"
              className="neu-button"
              style={{
                textDecoration: "none",
                padding: "12px 22px",
                borderRadius: "12px",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <MapPin size={16} /> Open Live Track
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
