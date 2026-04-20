import { useCallback, useEffect, useState } from "react";
import {
  getAllAmbulances,
  getAllHospitals,
  getUserVisibleAmbulances,
} from "../services/api";
import socket from "../services/socket";
import { useSocket } from "./useSocket";

const hasCoords = (entity) =>
  Array.isArray(entity?.location?.coordinates) &&
  entity.location.coordinates.length === 2;

export default function useTrackingAmbulances({ isUserViewer }) {
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [loading, setLoading] = useState(true);

  const assignedAmbulanceId =
    activeEmergency?.assignedAmbulance?._id?.toString() || null;

  const isVisibleForUser = useCallback(
    (ambulance) => {
      if (!ambulance) return false;
      if (ambulance.status === "available") return true;
      if (!assignedAmbulanceId) return false;
      return ambulance._id?.toString() === assignedAmbulanceId;
    },
    [assignedAmbulanceId],
  );

  const refreshTrackingData = useCallback(async () => {
    try {
      if (isUserViewer) {
        const [visibleAmbulancesRes, hospitalsRes] = await Promise.all([
          getUserVisibleAmbulances(),
          getAllHospitals(),
        ]);

        const visibleAmbulances = (
          visibleAmbulancesRes.data.data?.ambulances || []
        )
          .filter(hasCoords)
          .map((ambulance) => ({
            ...ambulance,
            _id: ambulance._id?.toString(),
          }));

        setAmbulances(visibleAmbulances);
        setHospitals((hospitalsRes.data.data || []).filter(hasCoords));
        setActiveEmergency(
          visibleAmbulancesRes.data.data?.activeEmergency || null,
        );
      } else {
        const [ambulancesRes, hospitalsRes] = await Promise.all([
          getAllAmbulances(),
          getAllHospitals(),
        ]);

        setAmbulances((ambulancesRes.data.data || []).filter(hasCoords));
        setHospitals((hospitalsRes.data.data || []).filter(hasCoords));
        setActiveEmergency(null);
      }
    } catch (error) {
      console.error("Error fetching tracking data:", error);
    } finally {
      setLoading(false);
    }
  }, [isUserViewer]);

  useEffect(() => {
    setLoading(true);
    refreshTrackingData().finally(() => setLoading(false));
    const interval = setInterval(refreshTrackingData, 10000);
    return () => clearInterval(interval);
  }, [refreshTrackingData]);

  useSocket(socket, "ambulance:location-update", (data) => {
    if (!data?.ambulanceId || !Array.isArray(data.location?.coordinates))
      return;

    setAmbulances((prev) => {
      const updated = prev.map((amb) =>
        amb._id?.toString() === data.ambulanceId?.toString()
          ? {
              ...amb,
              location: data.location,
              status: data.status || amb.status,
            }
          : amb,
      );

      return isUserViewer ? updated.filter(isVisibleForUser) : updated;
    });
  });

  useSocket(socket, "ambulance:status-change", (data) => {
    if (!data?.ambulanceId) return;

    setAmbulances((prev) => {
      const updated = prev.map((amb) =>
        amb._id?.toString() === data.ambulanceId?.toString()
          ? { ...amb, status: data.status || amb.status }
          : amb,
      );

      return isUserViewer ? updated.filter(isVisibleForUser) : updated;
    });
  });

  return {
    ambulances,
    hospitals,
    activeEmergency,
    assignedAmbulanceId,
    loading,
    refreshTrackingData,
  };
}
