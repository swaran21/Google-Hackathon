const Ambulance = require('../models/Ambulance');
const Emergency = require('../models/Emergency');
const { haversine, calculateETA } = require('../utils/haversine');

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
const findNearestAmbulance = async (lat, lng, recommendedEquipment = 'basic') => {
  // First try to find ambulances matching the recommended equipment level
  let availableAmbulances = await Ambulance.find({
    status: 'available',
    equipmentLevel: recommendedEquipment,
    isActive: true,
  });

  // Fallback: if no ambulances of the recommended type, get any available
  if (availableAmbulances.length === 0) {
    availableAmbulances = await Ambulance.find({ status: 'available', isActive: true });
  }

  if (availableAmbulances.length === 0) return null;

  // Calculate distance for each and sort (nearest first)
  const ranked = availableAmbulances
    .map((amb) => {
      const [ambLng, ambLat] = amb.location.coordinates;
      const distance = haversine(lat, lng, ambLat, ambLng);
      const eta = calculateETA(distance);
      return { ambulance: amb, distance: Math.round(distance * 100) / 100, eta };
    })
    .sort((a, b) => a.distance - b.distance);

  return ranked[0];
};

/**
 * Assign an ambulance to an emergency.
 */
const assignAmbulance = async (emergencyId, ambulanceId, eta) => {
  await Ambulance.findByIdAndUpdate(ambulanceId, {
    status: 'dispatched',
    currentEmergency: emergencyId,
  });

  const updated = await Emergency.findByIdAndUpdate(
    emergencyId,
    { assignedAmbulance: ambulanceId, status: 'dispatched', eta },
    { new: true }
  ).populate('assignedAmbulance');

  return updated;
};

module.exports = { findNearestAmbulance, assignAmbulance };
