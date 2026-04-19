const Hospital = require('../models/Hospital');
const { haversine } = require('../utils/haversine');

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
 * @param {number} limit - Number of hospitals to return (default 3)
 * @returns {Array} Ranked hospitals with scores and distances
 */
const suggestHospitals = async (lat, lng, limit = 3) => {
  const hospitals = await Hospital.find({ emergencyDepartment: true });

  if (hospitals.length === 0) return [];

  const scored = hospitals
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
        hospital.icuTotal > 0
          ? hospital.icuAvailable / hospital.icuTotal
          : 0;

      // Composite score
      const score = 0.6 * proximityScore + 0.3 * bedScore + 0.1 * icuScore;

      return {
        hospital,
        distance: Math.round(distance * 100) / 100,
        score: Math.round(score * 1000) / 1000,
        proximityScore: Math.round(proximityScore * 1000) / 1000,
        bedScore: Math.round(bedScore * 1000) / 1000,
        icuScore: Math.round(icuScore * 1000) / 1000,
      };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
};

module.exports = { suggestHospitals };
