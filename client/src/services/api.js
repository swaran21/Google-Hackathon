import axios from "axios";

/**
 * Axios instance configured for the ResQNet API.
 * In development, Vite proxy forwards /api to localhost:5000.
 */
const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ─── Auth APIs ───────────────────────────────────────────────────
export const loginUser = (data) => api.post("/auth/login", data);
export const registerUser = (data) => api.post("/auth/register", data);
export const registerHospital = (data) =>
  api.post("/auth/register-hospital", data);
export const registerAmbulance = (data) =>
  api.post("/auth/register-ambulance", data);
export const getMe = () => api.get("/auth/me");

// ─── Emergency APIs ──────────────────────────────────────────────
export const createEmergency = (data) => api.post("/emergency", data);
export const selectHospitalForEmergency = (emergencyId, hospitalId) =>
  api.post(`/emergency/${emergencyId}/select-hospital`, { hospitalId });
export const getEmergency = (id) => api.get(`/emergency/${id}`);
export const getMyActiveEmergency = () => api.get("/emergency/mine/active");
export const cancelEmergencyRequest = (id) =>
  api.post(`/emergency/${id}/cancel`);
export const updateEmergencyStatus = (id, status) =>
  api.patch(`/emergency/${id}/status`, { status });

// ─── Ambulance APIs ──────────────────────────────────────────────
export const getNearestAmbulance = (lat, lng) =>
  api.get(`/ambulance/nearest?lat=${lat}&lng=${lng}`);
export const getAllAmbulances = () => api.get("/ambulance");
export const getUserVisibleAmbulances = () => api.get("/ambulance/visible");
export const updateAmbulanceLocation = (id, latitude, longitude) =>
  api.patch(`/ambulance/${id}/location`, { latitude, longitude });

// ─── Hospital APIs ───────────────────────────────────────────────
export const suggestHospitals = (lat, lng) =>
  api.get(`/hospitals/suggest?lat=${lat}&lng=${lng}`);
export const getAllHospitals = () => api.get("/hospitals");
export const updateHospitalBeds = (id, data) =>
  api.patch(`/hospitals/${id}/beds`, data);

// ─── Driver APIs ─────────────────────────────────────────────────
export const getDriverStatus = (ambulanceId) =>
  api.get(`/driver/status?ambulanceId=${ambulanceId}`);
export const acceptDispatch = (ambulanceId) =>
  api.post("/driver/accept", { ambulanceId });
export const rejectDispatch = (ambulanceId) =>
  api.post("/driver/reject", { ambulanceId });
export const updateDriverStatus = (ambulanceId, status) =>
  api.post("/driver/update-status", { ambulanceId, status });
export const simulateMove = (ambulanceId) =>
  api.post("/driver/simulate-move", { ambulanceId });

// ─── Admin APIs ──────────────────────────────────────────────────
export const getDashboard = () => api.get("/admin/dashboard");
export const getActiveEmergencies = () => api.get("/admin/emergencies");
export const getAdminAmbulances = () => api.get("/admin/ambulances");
export const getAdminHospitals = () => api.get("/admin/hospitals");
export const getNotificationLog = () => api.get("/admin/notifications");

export default api;
