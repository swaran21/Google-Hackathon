const Ambulance = require("../models/Ambulance");
const Emergency = require("../models/Emergency");
const { haversine, calculateETA } = require("../utils/haversine");

const getAmbulanceRatingScore = (ambulance) => {
  const avg = Number(ambulance?.ratingSummary?.average || 0);
  const votes = Number(ambulance?.ratingSummary?.totalRatings || 0);
  const normalized = Math.min(1, Math.max(0, avg / 5));
  const confidence = Math.min(1, votes / 60);
  return normalized * confidence;
};

const getAvailableAmbulances = async (recommendedEquipment = "basic") => {
  let availableAmbulances = await Ambulance.find({
    status: "available",
    equipmentLevel: recommendedEquipment,
    isActive: true,
  });

  if (availableAmbulances.length === 0) {
    availableAmbulances = await Ambulance.find({
      status: "available",
      isActive: true,
    });
  }

  return availableAmbulances;
};

/**
 * Find the nearest available ambulance, with severity-aware equipment matching.
 *
 * If recommendedEquipment is 'critical_care', prioritize critical_care ambulances.
 * Falls back to any available ambulance if the preferred type isn't available.
 *
 * @param {number} lat - Emergency latitude
 * @param {number} lng - Emergency longitude
 * @param {string} recommendedEquipment - 'basic', 'advanced', or 'critical_care'
 * @returns {Object} { ambulance, distance, eta } or null
 */
const findNearestAmbulance = async (
  lat,
  lng,
  recommendedEquipment = "basic",
) => {
  const availableAmbulances =
    await getAvailableAmbulances(recommendedEquipment);

  if (availableAmbulances.length === 0) return null;

  // Calculate distance for each and sort (nearest first)
  const ranked = availableAmbulances
    .map((amb) => {
      const [ambLng, ambLat] = amb.location.coordinates;
      const distance = haversine(lat, lng, ambLat, ambLng);
      const eta = calculateETA(distance);
      const ratingScore = getAmbulanceRatingScore(amb);
      return {
        ambulance: amb,
        distance: Math.round(distance * 100) / 100,
        eta,
        score: distance - ratingScore * 0.8,
      };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.distance - b.distance;
    });

  return ranked[0];
};

/**
 * Rank ambulances by full mission distance:
 * ambulance -> patient + patient -> selected hospital.
 */
const findBestAmbulanceForTransfer = async (
  patientLat,
  patientLng,
  hospitalLat,
  hospitalLng,
  recommendedEquipment = "basic",
) => {
  const availableAmbulances =
    await getAvailableAmbulances(recommendedEquipment);
  if (availableAmbulances.length === 0) return null;

  const patientToHospitalDistance = haversine(
    patientLat,
    patientLng,
    hospitalLat,
    hospitalLng,
  );

  const ranked = availableAmbulances
    .map((amb) => {
      const [ambLng, ambLat] = amb.location.coordinates;
      const distanceToPatient = haversine(
        patientLat,
        patientLng,
        ambLat,
        ambLng,
      );
      const totalDistance = distanceToPatient + patientToHospitalDistance;
      const ratingScore = getAmbulanceRatingScore(amb);

      return {
        ambulance: amb,
        distanceToPatient: Math.round(distanceToPatient * 100) / 100,
        distancePatientToHospital:
          Math.round(patientToHospitalDistance * 100) / 100,
        totalDistance: Math.round(totalDistance * 100) / 100,
        eta: calculateETA(distanceToPatient),
        score: totalDistance - ratingScore * 0.8,
      };
    })
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      return a.distanceToPatient - b.distanceToPatient;
    });

  return ranked[0];
};

/**
 * Assign an ambulance to an emergency.
 */
const assignAmbulance = async (emergencyId, ambulanceId, eta) => {
  await Ambulance.findByIdAndUpdate(ambulanceId, {
    status: "dispatched",
    currentEmergency: emergencyId,
  });

  const updated = await Emergency.findByIdAndUpdate(
    emergencyId,
    { assignedAmbulance: ambulanceId, status: "dispatched", eta },
    { new: true },
  ).populate("assignedAmbulance");

  return updated;
};

module.exports = {
  findNearestAmbulance,
  findBestAmbulanceForTransfer,
  assignAmbulance,
};
