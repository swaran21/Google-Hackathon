import React, { useState } from "react";
import { Star, Send, X, AlertCircle, MessageCircle, Activity } from "lucide-react";
import api from "../services/api";
import Toast from "./Toast";

const FeedbackForm = ({ emergencyId, onSubmitSuccess, onCancel }) => {
  const [ratings, setRatings] = useState({
    driverRating: 0,
    hospitalRating: 0,
    experienceRating: 0,
  });
  const [comments, setComments] = useState("");
  const [hoveredRating, setHoveredRating] = useState({
    driver: 0,
    hospital: 0,
    experience: 0,
  });
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  const handleStarHover = (category, value) => {
    setHoveredRating((prev) => ({ ...prev, [category]: value }));
  };

  const handleStarClick = (category, value) => {
    const fieldName =
      category === "driver"
        ? "driverRating"
        : category === "hospital"
          ? "hospitalRating"
          : "experienceRating";
    setRatings((prev) => ({ ...prev, [fieldName]: value }));
  };

  const StarRating = ({ category, label, value }) => (
    <div className="mb-8">
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <div style={{ width: "4px", height: "14px", background: "var(--color-danger)", borderRadius: "2px" }} />
        <label style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
          {label}
        </label>
      </div>
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map((star) => {
          const isSelected = value >= star;
          const isHovered = hoveredRating[category] >= star;
          const isActive = isHovered || (hoveredRating[category] === 0 && isSelected);
          
          return (
            <button
              key={star}
              type="button"
              onClick={() => handleStarClick(category, star)}
              onMouseEnter={() => handleStarHover(category, star)}
              onMouseLeave={() => handleStarHover(category, 0)}
              className="neu-button"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isActive ? "var(--bg-card)" : "var(--bg-card)",
                color: isActive ? "#eab308" : "var(--text-muted)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: isActive ? "scale(1.05)" : "scale(1)",
                boxShadow: isActive 
                  ? "0 0 15px rgba(234, 179, 8, 0.3), inset 2px 2px 4px var(--shadow-dark)" 
                  : "4px 4px 10px var(--shadow-dark), -4px -4px 10px var(--shadow-light)"
              }}
            >
              <Star
                size={22}
                fill={isActive ? "currentColor" : "none"}
                strokeWidth={ isActive ? 2.5 : 2}
              />
            </button>
          );
        })}
      </div>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ratings.driverRating || !ratings.hospitalRating || !ratings.experienceRating) {
      setToastMessage("All ratings are required for mission closure.");
      setToastType("error");
      return;
    }
    setLoading(true);
    try {
      await api.post(`/emergency/${emergencyId}/feedback`, {
        driverRating: ratings.driverRating,
        hospitalRating: ratings.hospitalRating,
        experienceRating: ratings.experienceRating,
        comments,
      });
      setToastMessage("Feedback received. Improving response networks.");
      setToastType("success");
      setTimeout(() => onSubmitSuccess?.(), 1500);
    } catch (error) {
      setToastMessage("Failed to log mission feedback. Retry required.");
      setToastType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(10, 10, 10, 0.4)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      zIndex: 10000
    }}>
      <div className="neu-card" style={{
        width: "100%",
        maxWidth: "500px",
        borderRadius: "32px",
        background: "var(--bg-card)",
        padding: "32px",
        position: "relative"
      }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <Activity size={18} color="var(--color-danger)" />
            <span style={{ fontSize: "11px", fontWeight: 900, color: "var(--color-danger)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Mission Debriefing
            </span>
          </div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            Rate Response Quality
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", fontWeight: 600, marginTop: "4px" }}>
            Your telemetry helps optimize future dispatch vectors.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <StarRating category="driver" label="Ambulance Service" value={ratings.driverRating} />
          <StarRating category="hospital" label="Hospital Care" value={ratings.hospitalRating} />
          <StarRating category="experience" label="Overall Efficiency" value={ratings.experienceRating} />

          <div className="mb-8">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <MessageCircle size={16} color="var(--text-muted)" />
              <label style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
                Additional Intel
              </label>
            </div>
            <div className="neu-inner" style={{ borderRadius: "18px", padding: "6px" }}>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Brief summary of your experience..."
                rows="3"
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  fontSize: "14px",
                  resize: "none"
                }}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="neu-button"
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: "18px",
                fontWeight: 900,
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--text-muted)",
                background: "var(--bg-card)",
                opacity: loading ? 0.5 : 1
              }}
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={loading}
              className="neu-button"
              style={{
                flex: 1.5,
                padding: "16px",
                borderRadius: "18px",
                fontWeight: 900,
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#fff",
                background: "var(--color-info)",
                boxShadow: "0 8px 24px rgba(37, 99, 235, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                border: "none"
              }}
            >
              {loading ? <Activity size={18} className="animate-pulse" /> : <Send size={18} />}
              {loading ? "Logging..." : "Submit Report"}
            </button>
          </div>
        </form>

        {toastMessage && (
          <Toast message={toastMessage} type={toastType} duration={3000} />
        )}
      </div>
    </div>
  );
};

export default FeedbackForm;

