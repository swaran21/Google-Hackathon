import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

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
  const [location, setLocation] = useState({
    latitude: 17.314347,
    longitude: 78.533894,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({ ...prev, loading: false, error: 'Geolocation not supported' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (err) => {
        console.warn('Geolocation error, using fallback test coordinates:', err.message);
        setLocation((prev) => ({ ...prev, loading: false, error: err.message }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return location;
};

/**
 * Hook to track current route for Navbar active state.
 */
export const useActiveRoute = () => {
  const location = useLocation();
  return location.pathname;
};
