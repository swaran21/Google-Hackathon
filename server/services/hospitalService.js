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

const TYPE_TREATMENT_KEYWORDS = {
  cardiac: ["cardiac", "heart", "angioplasty", "ecg", "icu"],
  stroke: ["stroke", "neurology", "ct", "thrombolysis", "neuro"],
  breathing: ["respiratory", "ventilation", "oxygen", "pulmonary"],
  accident: ["trauma", "fracture", "surgery", "orthopedic"],
  fire: ["burn", "skin graft", "critical care"],
  flood: ["infection", "fever", "dehydration", "emergency"],
  other: ["emergency", "general", "observation"],
};

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .trim();

const hasSpecialtyMatch = (specialties = [], type = "other") => {
  const typeKeywords =
    TYPE_SPECIALTY_KEYWORDS[type] || TYPE_SPECIALTY_KEYWORDS.other;
  const normalized = specialties.map((s) => normalize(s));

  return normalized.some((specialty) =>
    typeKeywords.some((keyword) => specialty.includes(keyword)),
  );
};

const treatmentMatchesType = (treatment = {}, type = "other") => {
  const treatmentTypes = Array.isArray(treatment.emergencyTypes)
    ? treatment.emergencyTypes.map((entry) => normalize(entry))
    : [];

  if (treatmentTypes.includes(normalize(type))) return true;
  if (normalize(type) === "other" && treatmentTypes.includes("other")) {
    return true;
  }

  const treatmentName = normalize(treatment.name);
  const typeKeywords =
    TYPE_TREATMENT_KEYWORDS[type] || TYPE_TREATMENT_KEYWORDS.other;

  return typeKeywords.some((keyword) => treatmentName.includes(keyword));
};

const getMatchingTreatments = (treatments = [], type = "other") =>
  treatments
    .filter((treatment) => treatmentMatchesType(treatment, type))
    .sort((a, b) => (a.costMin || 0) - (b.costMin || 0))
    .map((treatment) => ({
      name: treatment.name,
      emergencyTypes: treatment.emergencyTypes || [],
      costMin: treatment.costMin,
      costMax: treatment.costMax,
      currency: treatment.currency || "INR",
      notes: treatment.notes || "",
    }));

const hospitalMatchesEmergencyCategory = (hospital, type = "other") => {
  const matchingTreatments = getMatchingTreatments(hospital.treatments, type);
  const specialtyMatch = hasSpecialtyMatch(hospital.specialties, type);

  return specialtyMatch || matchingTreatments.length > 0;
};

/**
 * Suggest the best hospitals for an emergency based on a composite score.
 *
 * Scoring formula:
 *   score = 0.35 * proximityScore
 *         + 0.20 * bedAvailabilityScore
 *         + 0.10 * icuScore
 *         + 0.15 * specialtyScore
 *         + 0.15 * treatmentScore
 *         + 0.05 * costScore
 *
 * - proximityScore:  1 / (1 + distance)  → closer = higher
 * - bedScore:        availableBeds / totalBeds
 * - icuScore:        icuAvailable / icuTotal
 * - treatmentScore:  1 if matching treatments found, else 0
 * - costScore:       lower treatment starting cost receives higher score
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
  const emergencyType = normalize(type || "other");
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

  const categoryMatchedHospitals = scopedHospitals.filter((hospital) =>
    hospitalMatchesEmergencyCategory(hospital, emergencyType),
  );

  if (categoryMatchedHospitals.length === 0) return [];

  const scored = categoryMatchedHospitals
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

      const specialtyScore = hasSpecialtyMatch(
        hospital.specialties,
        emergencyType,
      )
        ? 1
        : 0;

      const matchingTreatments = getMatchingTreatments(
        hospital.treatments,
        emergencyType,
      );
      const treatmentScore = matchingTreatments.length > 0 ? 1 : 0;

      const cheapestTreatmentCost =
        matchingTreatments.length > 0
          ? Math.min(...matchingTreatments.map((t) => t.costMin || 0))
          : null;

      const averageTreatmentCost =
        matchingTreatments.length > 0
          ? Math.round(
              matchingTreatments.reduce(
                (sum, treatment) =>
                  sum +
                  ((treatment.costMin || 0) + (treatment.costMax || 0)) / 2,
                0,
              ) / matchingTreatments.length,
            )
          : null;

      const costScore =
        cheapestTreatmentCost === null
          ? 0.25
          : 1 / (1 + cheapestTreatmentCost / 100000);

      // Composite score
      const score =
        0.35 * proximityScore +
        0.2 * bedScore +
        0.1 * icuScore +
        0.15 * specialtyScore +
        0.15 * treatmentScore +
        0.05 * costScore;

      return {
        hospital,
        distance: Math.round(distance * 100) / 100,
        score: Math.round(score * 1000) / 1000,
        proximityScore: Math.round(proximityScore * 1000) / 1000,
        bedScore: Math.round(bedScore * 1000) / 1000,
        icuScore: Math.round(icuScore * 1000) / 1000,
        specialtyScore,
        treatmentScore,
        costScore: Math.round(costScore * 1000) / 1000,
        matchingTreatments,
        cheapestTreatmentCost,
        averageTreatmentCost,
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
