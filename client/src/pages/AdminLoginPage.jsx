import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ChevronLeft,
  Lock,
  LogIn,
  Mail,
  Shield,
} from "lucide-react";
import api from "../services/api";

const inputStyle = {
  width: "100%",
  padding: "14px 16px 14px 48px",
  borderRadius: "14px",
  background: "var(--bg-input)",
  border: "1px solid var(--border-input)",
  color: "var(--text-primary)",
  fontSize: "0.95rem",
  outline: "none",
  fontFamily: "var(--font-family)",
  transition: "all 0.2s",
  boxSizing: "border-box",
};

const focus = (event) => {
  event.target.style.borderColor = "var(--bg-card)";
  event.target.style.boxShadow = "0 0 0 3px var(--bg-card)";
};

const blur = (event) => {
  event.target.style.borderColor = "var(--border-input)";
  event.target.style.boxShadow = "none";
};

function Field({ icon: Icon, ...props }) {
  return (
    <div style={{ position: "relative" }}>
      <Icon
        size={18}
        style={{
          position: "absolute",
          left: "16px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-muted)",
          pointerEvents: "none" }}
      />
      <input {...props} style={inputStyle} onFocus={focus} onBlur={blur} />
    </div>
  );
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "ResQNet Admin Login";
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/admin/login", { email, password });
      const { token } = response.data.data;

      localStorage.setItem("resqnet_token", token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      window.location.href = "/admin";
    } catch (err) {
      setError(err.response?.data?.message || "Admin authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="page-enter"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative" }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 50% 0%, var(--bg-card) 0%, transparent 50%)" }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          position: "relative",
          zIndex: 10 }}
      >
        <Link
          to="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            fontWeight: 600,
            textDecoration: "none",
            marginBottom: "24px" }}
        >
          <ChevronLeft size={16} /> Back to role selection
        </Link>

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "18px",
              margin: "0 auto 14px",
              background: "var(--bg-card)",
              border: "1px solid var(--bg-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center" }}
          >
            <Shield size={28} style={{ color: "#ef4444" }} />
          </div>
          <h1
            style={{
              fontSize: "1.65rem",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              marginBottom: "4px" }}
          >
            Admin <span className="gradient-text">Command</span> Login
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
            Restricted access for ResQNet administrators only
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              marginBottom: "16px",
              background: "var(--bg-card)",
              border: "1px solid var(--bg-card)",
              color: "#fca5a5",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "8px" }}
          >
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="neu-card"
          style={{
            padding: "28px",
            borderRadius: "22px",
            display: "flex",
            flexDirection: "column",
            gap: "16px" }}
        >
          <Field
            icon={Mail}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Admin email address"
            required
          />

          <div style={{ position: "relative" }}>
            <Lock
              size={18}
              style={{
                position: "absolute",
                left: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none" }}
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
              style={{ ...inputStyle, paddingRight: "16px" }}
              onFocus={focus}
              onBlur={blur}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="neu-button"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "none",
              background: "linear-gradient(135deg,#ef4444,#dc2626)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontFamily: "var(--font-family)",
              boxShadow: "0 6px 24px var(--bg-card)",
              opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              "Signing in..."
            ) : (
              <>
                <LogIn size={18} /> Enter Admin Console
              </>
            )}
          </button>

          <p
            style={{
              textAlign: "center",
              fontSize: "0.82rem",
              color: "var(--text-muted)" }}
          >
            The endpoint is not linked from the public login screen.
          </p>
        </form>
      </div>
    </div>
  );
}
