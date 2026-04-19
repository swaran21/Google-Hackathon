/**
 * Haversine formula — calculates the great-circle distance
 * between two points on Earth given their latitude/longitude.
 *
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Calculate ETA in minutes based on distance.
 * Assumes average urban ambulance speed of 40 km/h.
 */
const calculateETA = (distanceKm) => {
  const AVG_SPEED_KMH = 40;
  return Math.round((distanceKm / AVG_SPEED_KMH) * 60);
};

module.exports = { haversine, calculateETA };
