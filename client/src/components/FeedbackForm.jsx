import React, { useState } from "react";
import { Star, Send, AlertCircle } from "lucide-react";
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

  const getStarColor = (category, index, isHovered) => {
    const hovered = hoveredRating[category];
    const current =
      category === "driver"
        ? ratings.driverRating
        : category === "hospital"
          ? ratings.hospitalRating
          : ratings.experienceRating;

    if (isHovered && hovered >= index) return "text-yellow-400";
    if (!isHovered && current >= index) return "text-yellow-400";
    return "text-gray-300";
  };

  const StarRating = ({ category, label, value }) => (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {label}
      </label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(category, star)}
            onMouseEnter={() => handleStarHover(category, star)}
            onMouseLeave={() => handleStarHover(category, 0)}
            className="transition-all duration-150"
          >
            <Star
              size={32}
              className={`${getStarColor(category, star, hoveredRating[category] > 0)} transition-colors duration-150 cursor-pointer`}
              fill={
                (hoveredRating[category] > 0 &&
                  hoveredRating[category] >= star) ||
                (hoveredRating[category] === 0 && value >= star)
                  ? "currentColor"
                  : "none"
              }
            />
          </button>
        ))}
      </div>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !ratings.driverRating ||
      !ratings.hospitalRating ||
      !ratings.experienceRating
    ) {
      setToastMessage("Please rate all categories");
      setToastType("error");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(`/emergency/${emergencyId}/feedback`, {
        driverRating: ratings.driverRating,
        hospitalRating: ratings.hospitalRating,
        experienceRating: ratings.experienceRating,
        comments,
      });

      setToastMessage("Thank you! Feedback submitted successfully.");
      setToastType("success");

      setTimeout(() => {
        onSubmitSuccess?.();
      }, 1500);
    } catch (error) {
      setToastMessage(
        error.response?.data?.message ||
          "Failed to submit feedback. Please try again.",
      );
      setToastType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">
          Rate Your Experience
        </h2>
        <p className="text-gray-600 mb-6 text-sm">
          Help us improve our emergency response service
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <StarRating
            category="driver"
            label="Rate the Ambulance Driver"
            value={ratings.driverRating}
          />
          <StarRating
            category="hospital"
            label="Rate the Hospital Service"
            value={ratings.hospitalRating}
          />
          <StarRating
            category="experience"
            label="Overall Experience"
            value={ratings.experienceRating}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share your feedback..."
              rows="3"
              maxLength={1000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{comments.length}/1000</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {loading ? "Submitting..." : "Submit"}
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
