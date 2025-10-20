import { useState, useEffect } from "react";

/**
 * Custom hook for accessing user geolocation
 * @returns {Object} Geolocation state and data
 */
export function useGeolocation() {
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({
        latitude: null,
        longitude: null,
        error: "Geolocation is not supported by your browser",
        loading: false,
      });
      return;
    }

    const successHandler = (position) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        error: null,
        loading: false,
      });
    };

    const errorHandler = (error) => {
      let errorMessage = "Unable to retrieve your location";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage =
            "Location permission denied. Please enable location access.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information unavailable.";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out.";
          break;
      }

      setLocation({
        latitude: null,
        longitude: null,
        error: errorMessage,
        loading: false,
      });
    };

    navigator.geolocation.getCurrentPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
    });
  }, []);

  return location;
}
