import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Building2,
  Mail,
  Lock,
  Phone,
  MapPin,
  BedDouble,
  Activity,
  Eye,
  EyeOff,
  LogIn,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import api from "../services/api";

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", maxLen: 10 },
  { code: "+1", flag: "🇺🇸", maxLen: 10 },
  { code: "+44", flag: "🇬🇧", maxLen: 10 },
  { code: "+61", flag: "🇦🇺", maxLen: 9 },
];

const inputStyle = {
  width: "100%",
  padding: "13px 16px 13px 46px",
  borderRadius: "13px",
  background: "var(--bg-input)",
  border: "1px solid var(--border-input)",
  color: "var(--text-primary)",
  fontSize: "0.92rem",
  outline: "none",
  fontFamily: "var(--font-family)",
  transition: "all 0.2s",
  boxSizing: "border-box",
};

const focusStyle = (e) => {
  e.target.style.borderColor = "var(--bg-card)";
  e.target.style.boxShadow = "0 0 0 3px var(--bg-card)";
};
const blurStyle = (e) => {
  e.target.style.borderColor = "var(--border-input)";
  e.target.style.boxShadow = "none";
};

function Field({ icon: Icon, label, suffix, ...props }) {
  return (
    <div>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--text-muted)",
            marginBottom: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.08em" }}
        >
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <Icon
          size={16}
          style={{
            position: "absolute",
            left: "15px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            pointerEvents: "none" }}
        />
        <input
          {...props}
          style={inputStyle}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
        {suffix}
      </div>
    </div>
  );
}

export default function HospitalSignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [tab, setTab] = useState("signup"); // 'signup' | 'login'

  // Signup fields
  const [hospitalName, setHospitalName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [totalBeds, setTotalBeds] = useState("");
  const [icuTotal, setIcuTotal] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const maxPhoneLen =
    COUNTRY_CODES.find((c) => c.code === countryCode)?.maxLen ?? 15;
  const handlePhone = (v) =>
    setPhone(v.replace(/\D/g, "").slice(0, maxPhoneLen));

  // Detect locale for default country code
  useEffect(() => {
    const lang = navigator.language || "";
    if (lang.startsWith("en-IN") || lang.startsWith("hi"))
      setCountryCode("+91");
    else if (lang.startsWith("en-US")) setCountryCode("+1");
    else if (lang.startsWith("en-GB")) setCountryCode("+44");
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGeoLoading(false);
      },
      () => {
        setGeoError("Location access denied. Enter manually.");
        setGeoLoading(false);
      },
    );
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!hospitalName.trim()) {
      setError("Hospital name is required.");
      return;
    }
    if (!address.trim()) {
      setError("Hospital address is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!latitude || !longitude) {
      setError("Hospital location is required.");
      return;
    }
    if (!totalBeds || parseInt(totalBeds) < 1) {
      setError("Total beds must be at least 1.");
      return;
    }
    if (!icuTotal || parseInt(icuTotal) < 0) {
      setError("ICU beds cannot be negative.");
      return;
    }
    if (parseInt(icuTotal) > parseInt(totalBeds)) {
      setError("ICU beds cannot exceed total beds.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (countryCode === "+91" && cleanPhone.length !== 10) {
      setError("Indian phone number must be exactly 10 digits.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register-hospital", {
        hospitalName: hospitalName.trim(),
        address: address.trim(),
        email,
        password,
        phone: `${countryCode} ${cleanPhone}`,
        latitude,
        longitude,
        totalBeds: parseInt(totalBeds),
        icuTotal: parseInt(icuTotal),
      });
      await login(email, password);
      navigate("/hospital");
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(loginEmail, loginPassword);
      if (user.role !== "hospital") {
        setError("This portal is for hospitals only.");
        return;
      }
      navigate("/hospital");
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const eyeBtn = (show, toggle) => (
    <button
      type="button"
      onClick={toggle}
      style={{
        position: "absolute",
        right: "14px",
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        color: "var(--text-muted)",
        cursor: "pointer",
        padding: 0 }}
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <div
      className="page-enter"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
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
          maxWidth: "500px",
          position: "relative",
          zIndex: 10 }}
      >
        {/* Back */}
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
            marginBottom: "20px",
            transition: "color 0.2s" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-muted)")
          }
        >
          <ChevronLeft size={16} /> Back to role selection
        </Link>

        {/* Header */}
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
            <Building2 size={28} style={{ color: "#1e40af" }} />
          </div>
          <h1
            style={{
              fontSize: "1.65rem",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              marginBottom: "4px" }}
          >
            Hospital <span style={{ color: "#1e40af" }}>Portal</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
            {tab === "signup"
              ? "Register your hospital to the ResQNet network"
              : "Sign in to manage your hospital dashboard"}
          </p>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-card)",
            borderRadius: "14px",
            padding: "4px",
            marginBottom: "20px",
            border: "1px solid transparent" }}
        >
          {["signup", "login"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setError("");
              }}
              className="neu-button"
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                background: tab === t ? "var(--bg-card)" : "transparent",
                color: tab === t ? "#1e40af" : "var(--text-muted)",
                fontWeight: 700,
                fontSize: "0.88rem",
                fontFamily: "var(--font-family)",
                transition: "all 0.25s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px" }}
            >
              {t === "signup" ? (
                <>
                  <Building2 size={14} /> Register Hospital
                </>
              ) : (
                <>
                  <LogIn size={14} /> Log In
                </>
              )}
            </button>
          ))}
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
            <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        {/* ── SIGNUP FORM ── */}
        {tab === "signup" && (
          <form
            onSubmit={handleSignup}
            className="neu-card"
            style={{
              padding: "28px",
              borderRadius: "22px",
              display: "flex",
              flexDirection: "column",
              gap: "16px" }}
          >
            <Field
              icon={Building2}
              label="Hospital Name"
              type="text"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              placeholder="e.g. Apollo Hospital"
              required
            />

            <Field
              icon={MapPin}
              label="Hospital Address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, Area, Hyderabad"
              required
            />

            <Field
              icon={Mail}
              label="Official Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@hospital.com"
              required
            />

            {/* Phone */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em" }}
              >
                Phone Number
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <select
                  value={countryCode}
                  onChange={(e) => {
                    setCountryCode(e.target.value);
                    setPhone("");
                  }}
                  style={{
                    ...inputStyle,
                    width: "110px",
                    flexShrink: 0,
                    padding: "13px 8px",
                    cursor: "pointer",
                    appearance: "none",
                    textAlign: "center" }}
                >
                  {COUNTRY_CODES.map(({ code, flag }) => (
                    <option key={code} value={code}>
                      {flag} {code}
                    </option>
                  ))}
                </select>
                <div style={{ position: "relative", flex: 1 }}>
                  <Phone
                    size={16}
                    style={{
                      position: "absolute",
                      left: "15px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      pointerEvents: "none" }}
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => handlePhone(e.target.value)}
                    placeholder={`${maxPhoneLen} digits`}
                    required
                    maxLength={maxPhoneLen}
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px" }}
              >
                <label
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em" }}
                >
                  Location (GPS)
                </label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={geoLoading}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--bg-card)",
                    color: "#1e40af",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontFamily: "var(--font-family)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px" }}
                >
                  {geoLoading ? (
                    <Loader2
                      size={12}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <MapPin size={12} />
                  )}
                  {geoLoading ? "Detecting..." : "Auto-detect"}
                </button>
              </div>
              {geoError && (
                <p
                  style={{
                    color: "#fca5a5",
                    fontSize: "11px",
                    marginBottom: "6px" }}
                >
                  {geoError}
                </p>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px" }}
              >
                <div style={{ position: "relative" }}>
                  <MapPin
                    size={16}
                    style={{
                      position: "absolute",
                      left: "15px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      pointerEvents: "none" }}
                  />
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="Latitude"
                    required
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
                <div style={{ position: "relative" }}>
                  <MapPin
                    size={16}
                    style={{
                      position: "absolute",
                      left: "15px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      pointerEvents: "none" }}
                  />
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="Longitude"
                    required
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
              </div>
              {latitude && longitude && (
                <p
                  style={{
                    fontSize: "11px",
                    color: "#166534",
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px" }}
                >
                  <CheckCircle2 size={11} /> Location set:{" "}
                  {parseFloat(latitude).toFixed(4)},{" "}
                  {parseFloat(longitude).toFixed(4)}
                </p>
              )}
            </div>

            {/* Bed counts */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em" }}
                >
                  Total Beds
                </label>
                <div style={{ position: "relative" }}>
                  <BedDouble
                    size={16}
                    style={{
                      position: "absolute",
                      left: "15px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      pointerEvents: "none" }}
                  />
                  <input
                    type="number"
                    min="1"
                    value={totalBeds}
                    onChange={(e) => setTotalBeds(e.target.value)}
                    placeholder="e.g. 500"
                    required
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em" }}
                >
                  ICU Beds
                </label>
                <div style={{ position: "relative" }}>
                  <Activity
                    size={16}
                    style={{
                      position: "absolute",
                      left: "15px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      pointerEvents: "none" }}
                  />
                  <input
                    type="number"
                    min="0"
                    value={icuTotal}
                    onChange={(e) => setIcuTotal(e.target.value)}
                    placeholder="e.g. 50"
                    required
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
              </div>
            </div>
            {totalBeds &&
              icuTotal &&
              parseInt(icuTotal) > parseInt(totalBeds) && (
                <p
                  style={{
                    color: "#fca5a5",
                    fontSize: "11px",
                    marginTop: "-8px" }}
                >
                  ICU beds cannot exceed total beds
                </p>
              )}

            {/* Password */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em" }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    pointerEvents: "none" }}
                />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  style={{ ...inputStyle, paddingRight: "42px" }}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
                {eyeBtn(showPass, () => setShowPass((p) => !p))}
              </div>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em" }}
              >
                Confirm Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    pointerEvents: "none" }}
                />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  style={{
                    ...inputStyle,
                    paddingRight: "42px",
                    borderColor:
                      confirmPassword && password !== confirmPassword
                        ? "var(--bg-card)"
                        : undefined }}
                  onFocus={focusStyle}
                  onBlur={(e) => {
                    blurStyle(e);
                    e.target.style.borderColor =
                      password !== e.target.value
                        ? "var(--bg-card)"
                        : "var(--border-input)";
                  }}
                />
                {eyeBtn(showConfirm, () => setShowConfirm((p) => !p))}
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p
                  style={{
                    color: "#fca5a5",
                    fontSize: "11px",
                    marginTop: "4px" }}
                >
                  Passwords do not match
                </p>
              )}
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
                background: "linear-gradient(135deg,#1e40af,#1e3a8a)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontFamily: "var(--font-family)",
                boxShadow: "0 6px 24px var(--bg-card)",
                opacity: loading ? 0.7 : 1,
                transition: "all 0.2s" }}
              onMouseEnter={(e) => {
                if (!loading)
                  e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {loading ? (
                <Loader2
                  size={20}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <>
                  <Building2 size={18} /> Register Hospital
                </>
              )}
            </button>
          </form>
        )}

        {/* ── LOGIN FORM ── */}
        {tab === "login" && (
          <form
            onSubmit={handleLogin}
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
              label="Email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="admin@hospital.com"
              required
            />
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em" }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    pointerEvents: "none" }}
                />
                <input
                  type={showLoginPass ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  style={{ ...inputStyle, paddingRight: "42px" }}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
                {eyeBtn(showLoginPass, () => setShowLoginPass((p) => !p))}
              </div>
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
                background: "linear-gradient(135deg,#1e40af,#1e3a8a)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontFamily: "var(--font-family)",
                boxShadow: "0 6px 24px var(--bg-card)",
                opacity: loading ? 0.7 : 1,
                transition: "all 0.2s" }}
              onMouseEnter={(e) => {
                if (!loading)
                  e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {loading ? (
                <Loader2
                  size={20}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <>
                  <LogIn size={18} /> Sign In
                </>
              )}
            </button>
            <p
              style={{
                textAlign: "center",
                fontSize: "0.82rem",
                color: "var(--text-muted)" }}
            >
              Not registered?{" "}
              <button
                type="button"
                onClick={() => {
                  setTab("signup");
                  setError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1e40af",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-family)" }}
              >
                Register your hospital
              </button>
            </p>
          </form>
        )}

        <p
          style={{
            textAlign: "center",
            marginTop: "16px",
            fontSize: "0.82rem",
            color: "var(--text-muted)" }}
        >
          Not a hospital?{" "}
          <Link
            to="/login"
            style={{
              color: "#ef4444",
              fontWeight: 700,
              textDecoration: "none" }}
          >
            Go to main login
          </Link>
        </p>
      </div>
    </div>
  );
}
