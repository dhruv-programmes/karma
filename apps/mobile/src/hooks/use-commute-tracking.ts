import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { DeviceMotion } from "expo-sensors";
import { useLogCommute } from "@/src/hooks/queries";
import type { CommuteTripResult } from "@/src/types/api";

export type CommuteTrackingStatus =
  | "idle"
  | "requesting_permission"
  | "tracking"
  | "syncing"
  | "denied"
  | "unavailable"
  | "error";

interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp: number;
}

/**
 * Haversine formula to compute great-circle distance between two points in km.
 */
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const r = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c;
}

/**
 * GPS Commute Tracking hook.
 *
 * Runs GPS location sampling while an active commute is in progress.
 * Supports background location via Location.startLocationUpdatesAsync when available,
 * and maintains continuous foreground watchPositionAsync as a high-fidelity watcher.
 * Computes distance and average speed locally in real time.
 * NO coordinates are transmitted to backend — only the final aggregated trip summary.
 */
export function useCommuteTracking() {
  const logMutation = useLogCommute();
  const [status, setStatus] = useState<CommuteTrackingStatus>(
    Platform.OS === "web" ? "unavailable" : "idle"
  );
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0);
  const [lastResult, setLastResult] = useState<CommuteTripResult | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const motionSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const motionSumSquaresRef = useRef(0);
  const motionSampleCountRef = useRef(0);
  const lastCoordRef = useRef<Coordinate | null>(null);
  const totalDistanceRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      if (motionSubscriptionRef.current) {
        motionSubscriptionRef.current.remove();
        motionSubscriptionRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, []);

  const startTracking = useCallback(async () => {
    if (Platform.OS === "web") {
      setStatus("unavailable");
      return;
    }

    try {
      setStatus("requesting_permission");

      // 1. Request foreground location permission
      const { status: fgStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== "granted") {
        setStatus("denied");
        return;
      }

      // 2. Request background location permission if supported
      try {
        await Location.requestBackgroundPermissionsAsync();
      } catch {
        // Background permission may be rejected or unsupported on emulator; foreground will continue
      }

      // Reset state for new trip
      totalDistanceRef.current = 0;
      lastCoordRef.current = null;
      motionSumSquaresRef.current = 0;
      motionSampleCountRef.current = 0;
      startTimeRef.current = Date.now();
      setDistanceKm(0);
      setElapsedSec(0);
      setCurrentSpeedKmh(0);
      setLastResult(null);

      // Start elapsed timer
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Keep raw motion on-device. The API receives only the aggregate RMS
      // signal when the trip ends, which is enough for the transparent
      // motorised-travel heuristic and does not expose a sensor trace.
      try {
        const motionPermission = await DeviceMotion.requestPermissionsAsync();
        if (motionPermission.status === "granted") {
          motionSubscriptionRef.current = DeviceMotion.addListener((measurement) => {
            const linear = measurement.acceleration;
            const vector = linear ?? measurement.accelerationIncludingGravity;
            const magnitude = Math.sqrt(
              vector.x * vector.x + vector.y * vector.y + vector.z * vector.z
            );
            // Web implementations may expose accelerationIncludingGravity as
            // acceleration; remove the static gravity component in that case.
            const linearMagnitude = linear
              ? magnitude
              : Math.max(0, magnitude - DeviceMotion.Gravity);
            motionSumSquaresRef.current += linearMagnitude * linearMagnitude;
            motionSampleCountRef.current += 1;
          });
        }
      } catch {
        // Motion permission is optional; GPS-only classification remains safe.
      }

      // Start watching position
      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5, // Update every 5 meters
          timeInterval: 3000,  // Or every 3 seconds
        },
        (loc) => {
          const { latitude, longitude, speed } = loc.coords;
          const timestamp = loc.timestamp;

          // Update current speed display (speed is in m/s from GPS)
          if (typeof speed === "number" && speed >= 0) {
            setCurrentSpeedKmh(Math.round(speed * 3.6 * 10) / 10);
          }

          if (lastCoordRef.current) {
            const distDelta = calculateDistanceKm(
              lastCoordRef.current.latitude,
              lastCoordRef.current.longitude,
              latitude,
              longitude
            );

            // Filter out GPS drift: ignore if delta is unreasonably large (> 120 km/h) or minuscule
            const timeDeltaSec = (timestamp - lastCoordRef.current.timestamp) / 1000;
            const impliedSpeedKmh = timeDeltaSec > 0 ? (distDelta / timeDeltaSec) * 3600 : 0;

            if (distDelta > 0.002 && impliedSpeedKmh < 120) {
              totalDistanceRef.current += distDelta;
              setDistanceKm(Math.round(totalDistanceRef.current * 100) / 100);
            }
          }

          lastCoordRef.current = { latitude, longitude, timestamp };
        }
      );

      setStatus("tracking");
    } catch {
      setStatus("error");
    }
  }, []);

  const stopTracking = useCallback(async () => {
    // Stop GPS watcher & timer
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    if (motionSubscriptionRef.current) {
      motionSubscriptionRef.current.remove();
      motionSubscriptionRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const finalDistanceKm = totalDistanceRef.current;
    const durationMin = Math.max(0.1, (Date.now() - startTimeRef.current) / 60000);
    const avgSpeedKmh =
      durationMin > 0 ? (finalDistanceKm / (durationMin / 60)) : 0;
    const accelerationRms = motionSampleCountRef.current > 0
      ? Math.sqrt(motionSumSquaresRef.current / motionSampleCountRef.current)
      : undefined;

    setStatus("syncing");

    try {
      // Send aggregated trip summary to backend
      const result = await logMutation.mutateAsync({
        distance_km: Math.round(finalDistanceKm * 1000) / 1000,
        duration_min: Math.round(durationMin * 10) / 10,
        avg_speed_kmh: Math.round(avgSpeedKmh * 10) / 10,
        ...(accelerationRms === undefined
          ? {}
          : { acceleration_rms_mps2: Math.round(accelerationRms * 100) / 100 }),
      });

      setLastResult(result);
      setStatus("idle");
      return result;
    } catch {
      setStatus("error");
      return null;
    }
  }, [logMutation]);

  const dismissResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    status,
    isTracking: status === "tracking",
    isSyncing: status === "syncing",
    distanceKm,
    elapsedSec,
    currentSpeedKmh,
    lastResult,
    startTracking,
    stopTracking,
    dismissResult,
  };
}
