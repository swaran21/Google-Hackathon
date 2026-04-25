import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

const SAVED_LOCATION_KEY = "resqnet_user_location";

const readSavedLocation = () => {
  try {
    const raw = localStorage.getItem(SAVED_LOCATION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      !Number.isFinite(parsed?.latitude) ||
      !Number.isFinite(parsed?.longitude)
    ) {
      return null;
    }

    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      permissionAsked: true,
      granted: true,
      isFallback: !!parsed.isFallback,
    };
  } catch {
    return null;
  }
};

const persistLocation = (next) => {
  if (!Number.isFinite(next?.latitude) || !Number.isFinite(next?.longitude)) {
    return;
  }

  localStorage.setItem(
    SAVED_LOCATION_KEY,
    JSON.stringify({
      latitude: next.latitude,
      longitude: next.longitude,
      isFallback: !!next.isFallback,
    }),
  );
};

/**
 * Custom hook for Socket.io event listening.
 * Automatically subscribes/unsubscribes on mount/unmount.
 */
export const useSocket = (socket, event, callback) => {
  useEffect(() => {
    if (!socket || !event) return;
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }, [socket, event, callback]);
};

/**
 * Custom hook for geolocation.
 * Returns user's current lat/lng or falls back to Hyderabad center.
 */
export const useGeolocation = () => {
  const DEFAULT_TEST_LOCATION = {
    latitude: 17.314347,
    longitude: 78.533894,
  };

  const savedLocation = readSavedLocation();

  const [location, setLocation] = useState({
    latitude: savedLocation?.latitude ?? null,
    longitude: savedLocation?.longitude ?? null,
    loading: false,
    error: null,
    permissionAsked: savedLocation?.permissionAsked ?? false,
    granted: savedLocation?.granted ?? false,
    isFallback: savedLocation?.isFallback ?? false,
  });

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        permissionAsked: true,
        granted: false,
        error: "Geolocation not supported in this browser.",
      }));
      return Promise.resolve(null);
    }

    setLocation((prev) => ({
      ...prev,
      loading: true,
      permissionAsked: true,
      error: null,
    }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            loading: false,
            permissionAsked: true,
            granted: true,
            isFallback: false,
            error: null,
          };
          setLocation(next);
          persistLocation(next);
          resolve(next);
        },
        (err) => {
          const denied = err.code === err.PERMISSION_DENIED;
          setLocation((prev) => ({
            ...prev,
            loading: false,
            permissionAsked: true,
            granted: false,
            error: denied
              ? "Location permission denied. Please allow location access and try again."
              : `Unable to fetch current location. ${err.message}`,
          }));
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    });
  };

  const useTestLocation = () => {
    const next = {
      ...DEFAULT_TEST_LOCATION,
      loading: false,
      permissionAsked: true,
      granted: false,
      error: null,
      isFallback: true,
    };
    setLocation(next);
    persistLocation(next);
  };

  return {
    ...location,
    requestLocation,
    useTestLocation,
    hasCoordinates:
      Number.isFinite(location.latitude) && Number.isFinite(location.longitude),
  };
};

/**
 * Hook to track current route for Navbar active state.
 */
export const useActiveRoute = () => {
  const location = useLocation();
  return location.pathname;
};
