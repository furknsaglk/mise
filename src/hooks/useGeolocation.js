"use client";

import { useCallback, useState } from "react";

// For the "use my location" button: asks the browser for permission and gets the position.
export default function useGeolocation() {
  const [status, setStatus] = useState("idle"); // idle | loading | denied | error

  const locate = useCallback(
    () =>
      new Promise((resolve) => {
        if (!("geolocation" in navigator)) {
          setStatus("error");
          return resolve(null);
        }
        setStatus("loading");
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setStatus("idle");
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          (err) => {
            setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      }),
    []
  );

  return { locate, status };
}
