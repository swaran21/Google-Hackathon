const Hospital = require("../models/Hospital");
const { haversine } = require("../utils/haversine");

const TYPE_SPECIALTY_KEYWORDS = {
  cardiac: ["cardio", "heart"],
  stroke: ["neuro", "brain"],
  breathing: ["pulmo", "respiratory"],
  accident: ["trauma", "ortho", "surgery"],
  fire: ["burn", "trauma"],
  flood: ["emergency", "general medicine", "infectious"],
  other: ["emergency", "general"],
};

const hasSpecialtyMatch = (specialties = [], type = "other") => {
  const typeKeywords =
    TYPE_SPECIALTY_KEYWORDS[type] || TYPE_SPECIALTY_KEYWORDS.other;
  const normalized = specialties.map((s) => String(s).toLowerCase());

  return normalized.some((specialty) =>
    typeKeywords.some((keyword) => specialty.includes(keyword)),
  );
};

/**
 * Suggest the best hospitals for an emergency based on a composite score.
 *
 * Scoring formula:
 *   score = 0.6 * proximityScore + 0.3 * bedAvailabilityScore + 0.1 * icuScore
 *
 * - proximityScore:  1 / (1 + distance)  → closer = higher
 * - bedScore:        availableBeds / totalBeds
 * - icuScore:        icuAvailable / icuTotal
 *
 * @param {number} lat - Latitude of emergency
 * @param {number} lng - Longitude of emergency
 * @param {string} type - Emergency type for specialty-aware ranking
 * @param {Object} options - Query options
 * @param {number|null} options.radiusKm - Max distance radius in km; null disables radius filter
 * @param {number} options.limit - Number of hospitals to return
 * @returns {Array} Ranked hospitals with scores and distances
 */
const suggestHospitals = async (lat, lng, type = "other", options = {}) => {
  const radiusKm =
    typeof options.radiusKm === "number" ? options.radiusKm : null;
  const limit = typeof options.limit === "number" ? options.limit : 3;

  const hospitals = await Hospital.find({
    emergencyDepartment: true,
    isActive: true,
  });

  if (hospitals.length === 0) return [];

  const scopedHospitals = hospitals.filter((hospital) => {
    if (radiusKm === null) return true;
    const [hLng, hLat] = hospital.location.coordinates;
    const distance = haversine(lat, lng, hLat, hLng);
    return distance <= radiusKm;
  });

  if (scopedHospitals.length === 0) return [];

  const scored = scopedHospitals
    .map((hospital) => {
      const [hLng, hLat] = hospital.location.coordinates;
      const distance = haversine(lat, lng, hLat, hLng);

      // Proximity score: inverse of distance (closer = better)
      const proximityScore = 1 / (1 + distance);

      // Bed availability score
      const bedScore =
        hospital.totalBeds > 0
          ? hospital.availableBeds / hospital.totalBeds
          : 0;

      // ICU availability score
      const icuScore =
        hospital.icuTotal > 0 ? hospital.icuAvailable / hospital.icuTotal : 0;

      const specialtyScore = hasSpecialtyMatch(hospital.specialties, type)
        ? 1
        : 0;

      // Composite score
      const score =
        0.5 * proximityScore +
        0.25 * bedScore +
        0.15 * icuScore +
        0.1 * specialtyScore;

      return {
        hospital,
        distance: Math.round(distance * 100) / 100,
        score: Math.round(score * 1000) / 1000,
        proximityScore: Math.round(proximityScore * 1000) / 1000,
        bedScore: Math.round(bedScore * 1000) / 1000,
        icuScore: Math.round(icuScore * 1000) / 1000,
        specialtyScore,
        coordinates: {
          latitude: Math.round(hLat * 1000000) / 1000000,
          longitude: Math.round(hLng * 1000000) / 1000000,
        },
      };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((entry, index) => ({
    ...entry,
    recommended: index === 0,
  }));
};

module.exports = { suggestHospitals };
