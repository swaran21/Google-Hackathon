/**
 * Routing Service — Uses OSRM (Open Source Routing Machine) for real road routing.
 * OSRM demo server is free, no API key needed.
 *
 * Provides:
 * - Real road distance (not straight-line Haversine)
 * - Actual ETA with road network consideration
 * - Route geometry (polyline) for map drawing
 */

const OSRM_BASE_URL = 'https://router.project-osrm.org';

/**
 * Get driving route between two points.
 *
 * @param {number} fromLat - Origin latitude
 * @param {number} fromLng - Origin longitude
 * @param {number} toLat - Destination latitude
 * @param {number} toLng - Destination longitude
 * @returns {Object} { distance, duration, geometry, steps }
 */
const getRoute = async (fromLat, fromLng, toLat, toLng) => {
  try {
    // OSRM expects lng,lat order
    const url = `${OSRM_BASE_URL}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn('OSRM routing failed, falling back to Haversine');
      return null;
    }

    const route = data.routes[0];

    return {
      distance: Math.round(route.distance / 10) / 100, // meters → km, 2 decimals
      duration: Math.round(route.duration / 60), // seconds → minutes
      geometry: route.geometry, // GeoJSON for polyline drawing
      steps: route.legs[0]?.steps?.map((step) => ({
        instruction: step.maneuver?.type,
        name: step.name,
        distance: Math.round(step.distance),
        duration: Math.round(step.duration),
      })),
    };
  } catch (error) {
    console.error('OSRM routing error:', error.message);
    return null;
  }
};

/**
 * Get route with multiple waypoints (ambulance → emergency → hospital).
 */
const getFullRoute = async (ambulanceLat, ambulanceLng, emergencyLat, emergencyLng, hospitalLat, hospitalLng) => {
  try {
    const url = `${OSRM_BASE_URL}/route/v1/driving/${ambulanceLng},${ambulanceLat};${emergencyLng},${emergencyLat};${hospitalLng},${hospitalLat}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok') return null;

    const route = data.routes[0];
    return {
      totalDistance: Math.round(route.distance / 10) / 100,
      totalDuration: Math.round(route.duration / 60),
      geometry: route.geometry,
      legs: route.legs.map((leg, i) => ({
        segment: i === 0 ? 'ambulance → emergency' : 'emergency → hospital',
        distance: Math.round(leg.distance / 10) / 100,
        duration: Math.round(leg.duration / 60),
      })),
    };
  } catch (error) {
    console.error('OSRM full route error:', error.message);
    return null;
  }
};

module.exports = { getRoute, getFullRoute };
