import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
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

/**
 * Native-only, user-initiated pedometer bridge. iOS can query today's stored
 * count; Android emits only while this foreground screen is mounted. We never
 * start a listener until the person explicitly enables walking rewards.
 */
export function useStepTracking(serverSteps = 0) {
  const sync = useSyncSteps();
  const subscription = useRef<ReturnType<typeof Pedometer.watchStepCount> | null>(null);
  const serverStepsRef = useRef(serverSteps);
  const sessionStepsRef = useRef(0);
  const [state, setState] = useState<StepTrackingState>(
    Platform.OS === "web" ? "unavailable" : "idle"
  );

  useEffect(() => {
    serverStepsRef.current = serverSteps;
  }, [serverSteps]);

  useEffect(
    () => () => {
      subscription.current?.remove();
      subscription.current = null;
    },
    []
  );

  const syncTotal = useCallback(
    async (steps: number) => {
      setState("syncing");
      try {
        await sync.mutateAsync(steps);
        setState("enabled");
      } catch {
        setState("error");
      }
    },
    [sync]
  );

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

      if (Platform.OS === "ios") {
        const result = await Pedometer.getStepCountAsync(startOfToday(), new Date());
        await syncTotal(result.steps);
        return;
      }

      // Android has no historic query in expo-sensors. Keep one foreground
      // listener only after opt-in; its relative count is added to the API's
      // already-synced total and is removed when this screen unmounts.
      if (!subscription.current) {
        sessionStepsRef.current = 0;
        subscription.current = Pedometer.watchStepCount((result) => {
          sessionStepsRef.current = Math.max(sessionStepsRef.current, result.steps);
        });
      }
      await syncTotal(serverStepsRef.current + sessionStepsRef.current);
    } catch {
      setState("error");
    }
  }, [syncTotal]);

  return {
    state,
    isSyncing: sync.isPending || state === "syncing",
    enableOrSync,
  };
}
