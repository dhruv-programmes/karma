import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { BackButton } from "@/components/custom/back-button";
import { FacilityCard } from "@/components/custom/facility-card";
import { PointsCounter } from "@/components/custom/points-counter";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { useCompleteAction, useFacilitiesNearby } from "@/src/hooks/queries";
import { api } from "@/src/lib/api";
import { useAppStore } from "@/src/store/app";
import { DEMO_RECYCLE_ACTION_ID, DEMO_REPAIR_ACTION_ID } from "@/src/types/api";
import { MapPin } from "lucide-react-native";

const TITLE: Record<string, string> = {
  repair: "Find repair",
  recycling: "Recycle nearby",
  donation: "Donate nearby",
  resale: "Resale nearby",
};

const BLR = { lat: 12.9716, lng: 77.5946 };

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    actionId?: string;
    actionType?: string;
  }>();
  const facilityType = params.type || "repair";
  const [coords, setCoords] = useState(BLR);
  const facilitiesQuery = useFacilitiesNearby(
    facilityType,
    coords.lat,
    coords.lng,
    { allowFallback: false },
  );
  const complete = useCompleteAction();
  const [selected, setSelected] = useState<string | null>(null);
  const [showPoints, setShowPoints] = useState(false);
  const [awarded, setAwarded] = useState(0);
  const [badgeNote, setBadgeNote] = useState<string | null>(null);
  const [checkInNote, setCheckInNote] = useState<string | null>(null);
  const setLastPoints = useAppStore((s) => s.setLastPointsAwarded);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          setCoords({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
        }
      } catch {
        /* keep Bengaluru fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const facilities = useMemo(() => {
    return [...(facilitiesQuery.data ?? [])].sort(
      (a, b) =>
        (a.distance_km ?? Number.POSITIVE_INFINITY) -
        (b.distance_km ?? Number.POSITIVE_INFINITY),
    );
  }, [facilitiesQuery.data]);

  async function markComplete() {
    const actionId =
      params.actionId ??
      (facilityType === "recycling"
        ? DEMO_RECYCLE_ACTION_ID
        : DEMO_REPAIR_ACTION_ID);
    const actionType = (
      params.actionType ||
      (facilityType === "recycling"
        ? "RECYCLE"
        : facilityType === "donation"
          ? "DONATE"
          : facilityType === "resale"
            ? "RESELL"
            : "REPAIR")
    ).toUpperCase();
    const place = facilities.find((f) => f.id === selected);
    setCheckInNote(
      place
        ? `Checked in at ${place.name}${place.distance_km != null ? ` · ${place.distance_km} km` : ""}`
        : "Checked in"
    );
    try {
      const result = await complete.mutateAsync({
        id: actionId,
        action_type: actionType,
      });
      setAwarded(result.points_awarded);
      setLastPoints(result.points_awarded);
      if (result.badges_unlocked?.length) {
        setBadgeNote(`Badge: ${result.badges_unlocked[0].replace(/_/g, " ")}`);
      }
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {
        /* sim */
      }
      setShowPoints(true);
      setTimeout(() => router.replace("/rewards"), 1800);
    } catch {
      try {
        const result = await api.completeAction(actionId, actionType);
        setAwarded(result.points_awarded || 100);
      } catch {
        setAwarded(100);
      }
      setShowPoints(true);
      setTimeout(() => router.replace("/(tabs)"), 1600);
    }
  }

  return (
    <Box className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <Box className="flex-row justify-between items-center px-6 py-3">
        <BackButton label="Back" fallbackRoute="/(tabs)" variant="circle" />
        <Text bold>{TITLE[facilityType] ?? "Nearby places"}</Text>
        <Box className="w-10" />
      </Box>

      {facilitiesQuery.isLoading ? (
        <Box className="mx-6 mb-2 rounded-2xl border border-border bg-card px-4 py-3">
          <Text className="text-muted-foreground">
            Finding verified {facilityType === "recycling" ? "recycling hubs" : "nearby places"}…
          </Text>
        </Box>
      ) : facilitiesQuery.isError ? (
        <Box className="mx-6 mb-2 rounded-2xl border border-destructive/30 bg-card px-4 py-3 gap-2">
          <Text className="text-foreground font-medium">Nearby places are unavailable.</Text>
          <Text className="text-muted-foreground text-xs">
            Check your connection and try again. We will not show made-up locations.
          </Text>
          <Button size="sm" variant="outline" onPress={() => void facilitiesQuery.refetch()}>
            Try again
          </Button>
        </Box>
      ) : facilities.length === 0 ? (
        <Box className="mx-6 mb-2 rounded-2xl border border-border bg-card px-4 py-3">
          <Text className="text-foreground font-medium">
            No verified {facilityType === "recycling" ? "recycling hubs" : "places"} found nearby.
          </Text>
          <Text className="text-muted-foreground text-xs mt-1">Try again from a different location.</Text>
        </Box>
      ) : null}

      <Box className="px-6 mb-2">
        <Chip
          tone="info"
          label={
            coords.lat === BLR.lat
              ? "Using Bengaluru demo location"
              : "Sorted from your location"
          }
        />
      </Box>

      {/* Web-compatible interactive map view */}
      <Box
        className="mx-6 h-60 rounded-3xl overflow-hidden bg-muted/40 border border-border relative p-4 justify-between"
        style={{
          backgroundColor: "#121d17",
        }}
      >
        <Box className="flex-row justify-between items-center z-10">
          <Badge action="playful" label="Interactive Map View" />
          <Text className="text-xs text-muted-foreground font-mono">
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </Text>
        </Box>

        <Box className="flex-row flex-wrap gap-2 my-auto justify-center z-10">
          {facilities.slice(0, 4).map((f) => {
            const isSel = selected === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setSelected(f.id)}
                className={`px-3 py-2 rounded-2xl flex-row items-center gap-1.5 transition-all ${
                  isSel
                    ? "bg-primary text-primary-foreground scale-105"
                    : "bg-background/80 backdrop-blur border border-border/80"
                }`}
              >
                <MapPin size={14} color={isSel ? "#000" : "#2ea86e"} />
                <Text
                  className={`text-xs font-medium ${
                    isSel ? "text-primary-foreground font-bold" : "text-foreground"
                  }`}
                  numberOfLines={1}
                >
                  {f.name.split(" ")[0]}
                </Text>
                {f.distance_km != null ? (
                  <Text className="text-[10px] text-muted-foreground">
                    {f.distance_km}km
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </Box>

        <Text className="text-[11px] text-muted-foreground text-center z-10">
          Select a facility pin or list card below to inspect and check in
        </Text>
      </Box>

      <ScrollView
        className="flex-1 px-6 mt-4"
        contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 120 }}
      >
        {facilities.map((f) => (
          <FacilityCard
            key={f.id}
            facility={f}
            selected={selected === f.id}
            onPress={() => setSelected(f.id)}
          />
        ))}
      </ScrollView>

      <Box
        className="absolute left-0 right-0 bottom-0 px-6 bg-background gap-2"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {checkInNote ? <Chip tone="success" label={checkInNote} /> : null}
        {badgeNote ? <Badge action="playful" label={badgeNote} /> : null}
        <Button
          disabled={!selected}
          loading={complete.isPending}
          onPress={() => void markComplete()}
        >
          Check in & complete
        </Button>
      </Box>

      <PointsCounter points={awarded} visible={showPoints} />
    </Box>
  );
}
