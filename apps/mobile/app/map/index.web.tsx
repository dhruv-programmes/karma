import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { BackButton } from "@/components/custom/back-button";
import { FacilityCard } from "@/components/custom/facility-card";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { useCompleteAction, useFacilitiesNearby, useMe } from "@/src/hooks/queries";
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
  const me = useMe();
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

  const mapPoints = useMemo(() => {
    const points = [...facilities, { lat: coords.lat, lng: coords.lng }];
    const latitudes = points.map((point) => point.lat);
    const longitudes = points.map((point) => point.lng);
    const latSpan = Math.max(0.01, Math.max(...latitudes) - Math.min(...latitudes));
    const lngSpan = Math.max(0.01, Math.max(...longitudes) - Math.min(...longitudes));
    const minLat = Math.min(...latitudes) - latSpan * 0.16;
    const minLng = Math.min(...longitudes) - lngSpan * 0.16;
    const paddedLatSpan = latSpan * 1.32;
    const paddedLngSpan = lngSpan * 1.32;
    return facilities.map((facility) => ({
      facility,
      left: Math.min(94, Math.max(6, ((facility.lng - minLng) / paddedLngSpan) * 100)),
      top: Math.min(90, Math.max(10, (1 - (facility.lat - minLat) / paddedLatSpan) * 100)),
    }));
  }, [coords.lat, coords.lng, facilities]);
  const [mapZoom, setMapZoom] = useState(1);

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
    } catch (error) {
      setCheckInNote(
        error instanceof Error
          ? error.message
          : "Could not complete this check-in. Please try again."
      );
      setShowPoints(false);
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

      {/* Deterministic, web-compatible map. Pins are plotted exclusively from
          the seeded facility coordinates returned by the API. */}
      <Box className="mx-6 h-80 rounded-3xl overflow-hidden border border-border relative" style={{ backgroundColor: "#dce9df" }}>
        <Box className="absolute inset-0" style={{ backgroundColor: "#dce9df" }} />
        <Box className="absolute left-[-20%] right-[-20%] top-[42%] h-8 opacity-70" style={{ backgroundColor: "#f8fbf5", transform: [{ rotate: "-14deg" }] }} />
        <Box className="absolute left-[-20%] right-[-20%] top-[66%] h-5 opacity-60" style={{ backgroundColor: "#f8fbf5", transform: [{ rotate: "22deg" }] }} />
        <Box className="absolute top-[-30%] bottom-[-30%] left-[48%] w-7 opacity-60" style={{ backgroundColor: "#f8fbf5", transform: [{ rotate: "18deg" }] }} />
        <Box className="absolute top-[-30%] bottom-[-30%] left-[20%] w-3 opacity-50" style={{ backgroundColor: "#f8fbf5", transform: [{ rotate: "-32deg" }] }} />
        <Box className="absolute inset-0 opacity-30" style={{ backgroundColor: "transparent", borderWidth: 1, borderColor: "#8eb49d" }} />

        <Box className="absolute left-4 right-4 top-4 flex-row justify-between items-center z-10">
          <Badge action="playful" label="Seeded Bengaluru map" />
          <Box className="flex-row gap-1">
            <Pressable onPress={() => setMapZoom((value) => Math.min(1.8, value + 0.2))} className="h-8 w-8 rounded-full bg-white items-center justify-center border border-border">
              <Text bold className="text-foreground">+</Text>
            </Pressable>
            <Pressable onPress={() => setMapZoom((value) => Math.max(0.8, value - 0.2))} className="h-8 w-8 rounded-full bg-white items-center justify-center border border-border">
              <Text bold className="text-foreground">−</Text>
            </Pressable>
            <Pressable onPress={() => setMapZoom(1)} className="px-3 h-8 rounded-full bg-white items-center justify-center border border-border">
              <Text className="text-xs text-foreground">Reset</Text>
            </Pressable>
          </Box>
        </Box>

        <Box className="absolute inset-0" style={{ transform: [{ scale: mapZoom }] }}>
          {mapPoints.map(({ facility, left, top }) => {
            const isSel = selected === facility.id;
            return (
              <Pressable
                key={facility.id}
                onPress={() => setSelected(facility.id)}
                className="absolute items-center"
                style={{ left: `${left}%`, top: `${top}%`, transform: [{ translateX: -16 }, { translateY: -16 }] }}
              >
                <Box className={`h-8 w-8 rounded-full items-center justify-center border-2 ${isSel ? "bg-primary border-white" : "bg-white border-primary"}`}>
                  <MapPin size={16} color={isSel ? "#FFFFFF" : "#2EA86E"} fill={isSel ? "#2EA86E" : "transparent"} />
                </Box>
                {isSel ? <Text className="mt-1 max-w-32 rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-foreground" numberOfLines={1}>{facility.name}</Text> : null}
              </Pressable>
            );
          })}
        </Box>

        <Box className="absolute left-4 bottom-4 rounded-xl bg-white/90 px-3 py-2 z-10 border border-border">
          <Text className="text-[11px] font-bold text-foreground">{facilities.length} seeded places</Text>
          <Text className="text-[10px] text-muted-foreground">Tap a pin or card to select</Text>
        </Box>
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

      {showPoints ? (
        <Box className="absolute left-6 right-6 bottom-28 rounded-2xl border border-primary/30 bg-card px-4 py-3">
          <Text className="text-primary font-bold">+{awarded} Karma Coins earned</Text>
          <Text className="text-muted-foreground text-xs mt-1">
            Wallet total: {me.data?.impact_points ?? "updating…"} coins · This check-in is recorded in your activity.
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
