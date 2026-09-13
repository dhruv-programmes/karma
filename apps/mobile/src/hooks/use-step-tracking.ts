import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { Pedometer } from "expo-sensors";
import { useSyncSteps } from "@/src/hooks/queries";

export type StepTrackingState =
  | "idle"
  | "syncing"
  | "enabled"
  | "unavailable"
  | "denied"
  | "error";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const FOREGROUND_SYNC_INTERVAL_MS = 60_000;

/**
 * Native-only, user-initiated pedometer bridge. iOS can query today's stored
 * count; Android emits only while this foreground screen is mounted. We never
 * start a listener until the person explicitly enables walking rewards.
 */
export function useStepTracking(serverSteps = 0) {
  const sync = useSyncSteps();
  const subscription = useRef<ReturnType<typeof Pedometer.watchStepCount> | null>(null);
  const serverStepsRef = useRef(serverSteps);
  const androidBaselineStepsRef = useRef<number | null>(null);
  const sessionStepsRef = useRef(0);
  const trackingEnabledRef = useRef(false);
  const syncInFlightRef = useRef(false);
  const pendingStepsRef = useRef<number | null>(null);
  const [state, setState] = useState<StepTrackingState>(
    Platform.OS === "web" ? "unavailable" : "idle"
  );

  useEffect(() => {
    serverStepsRef.current = serverSteps;
  }, [serverSteps]);

  useEffect(
    () => () => {
      trackingEnabledRef.current = false;
      subscription.current?.remove();
      subscription.current = null;
    },
    []
  );

  const syncTotal = useCallback(
    async (steps: number) => {
      // Pedometer callbacks can arrive faster than the network request. Keep
      // the largest observed total and drain it serially so a slower response
      // cannot overwrite newer step progress or award points twice.
      pendingStepsRef.current = Math.max(
        pendingStepsRef.current ?? 0,
        Math.max(0, Math.floor(steps))
      );
      if (syncInFlightRef.current) return;

      syncInFlightRef.current = true;
      setState("syncing");
      try {
        while (pendingStepsRef.current !== null) {
          const nextSteps = pendingStepsRef.current;
          pendingStepsRef.current = null;
          const result = await sync.mutateAsync(nextSteps);
          // The API is authoritative. Retain its total for the next Android
          // callback instead of trusting a client-side points calculation.
          serverStepsRef.current = Math.max(
            serverStepsRef.current,
            result.todaySteps
          );
        }
        setState("enabled");
      } catch {
        pendingStepsRef.current = null;
        setState("error");
      } finally {
        syncInFlightRef.current = false;
      }
    },
    [sync]
  );

  const refreshNativeSteps = useCallback(async () => {
    if (!trackingEnabledRef.current) return;

    // Some Android vendors expose the historical query even though older
    // Expo versions documented it as iOS-only. Prefer it when available so
    // returning to the app immediately reflects the device's real total.
    try {
      const result = await Pedometer.getStepCountAsync(startOfToday(), new Date());
      if (Number.isFinite(result.steps)) {
        await syncTotal(result.steps);
        return;
      }
    } catch {
      // Android commonly rejects this query; fall back to the live listener.
    }

    if (Platform.OS === "ios") {
      setState("error");
      return;
    }

    // Android's Expo pedometer stream reports steps since subscription. Add
    // that delta to the server's today-total, but never double count a total
    // already acknowledged by the API.
    const baseline = androidBaselineStepsRef.current;
    if (baseline !== null) {
      await syncTotal(
        Math.max(
          serverStepsRef.current,
          baseline + sessionStepsRef.current
        )
      );
    }
  }, [syncTotal]);

  // Keep iOS totals fresh while the Home screen is foregrounded and flush an
  // Android listener total when the app returns to the foreground. This is
  // intentionally foreground-only: background activity needs a native build
  // and platform-specific background delivery, not a misleading web timer.
  useEffect(() => {
    if (state !== "enabled" || Platform.OS === "web") return;

    const interval = setInterval(() => {
      void refreshNativeSteps();
    }, FOREGROUND_SYNC_INTERVAL_MS);
    const appState = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void refreshNativeSteps();
    });
    return () => {
      clearInterval(interval);
      appState.remove();
    };
  }, [refreshNativeSteps, state]);

  const enableOrSync = useCallback(async () => {
    if (Platform.OS === "web") {
      setState("unavailable");
      return;
    }

    try {
      const available = await Pedometer.isAvailableAsync();
      if (!available) {
        setState("unavailable");
        return;
      }

      const currentPermission = await Pedometer.getPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await Pedometer.requestPermissionsAsync();
      if (!permission.granted) {
        setState("denied");
        return;
      }

      trackingEnabledRef.current = true;

      if (Platform.OS === "ios") {
        await refreshNativeSteps();
        return;
      }

      // Android has no historic query in expo-sensors. Keep one foreground
      // listener only after opt-in; its relative count is added to the API's
      // already-synced total and is removed when this screen unmounts.
      if (!subscription.current) {
        androidBaselineStepsRef.current = serverStepsRef.current;
        sessionStepsRef.current = 0;
        subscription.current = Pedometer.watchStepCount((result) => {
          sessionStepsRef.current = Math.max(sessionStepsRef.current, result.steps);
          void refreshNativeSteps();
        });
      }
      await syncTotal(serverStepsRef.current + sessionStepsRef.current);
    } catch {
      trackingEnabledRef.current = false;
      setState("error");
    }
  }, [refreshNativeSteps, syncTotal]);

  return {
    state,
    isSyncing: sync.isPending || state === "syncing",
    enableOrSync,
  };
}
