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
import { useAuthStore } from "@/src/store/auth";
import { remapSeededFacilities, seededLocationCenter } from "@/src/lib/seeded-location";
import { DEMO_RECYCLE_ACTION_ID, DEMO_REPAIR_ACTION_ID } from "@/src/types/api";
import { MapPin } from "lucide-react-native";

const TITLE: Record<string, string> = {
  repair: "Find repair",
  recycling: "Recycle nearby",
  donation: "Donate nearby",
  resale: "Resale nearby",
};

const BLR = { lat: 12.9716, lng: 77.5946 };

// A restrained, local cartographic layer for the demo. It keeps the map
// useful when a tile provider is not configured, while pins still come only
// from the seeded facility coordinates returned by the API.
const ROAD_STYLES = [
  { left: "-12%", top: "18%", width: "125%", height: 9, rotate: "18deg", major: true },
  { left: "-10%", top: "48%", width: "122%", height: 7, rotate: "-12deg", major: true },
  { left: "-8%", top: "75%", width: "118%", height: 6, rotate: "8deg", major: false },
  { left: "17%", top: "-18%", width: 7, height: "140%", rotate: "20deg", major: true },
  { left: "52%", top: "-16%", width: 5, height: "138%", rotate: "-8deg", major: false },
  { left: "77%", top: "-20%", width: 6, height: "145%", rotate: "26deg", major: true },
] as const;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    type?: string;
    actionId?: string;
    actionType?: string;
  }>();
  const facilityType = params.type || "repair";
  const manualLocation = useAuthStore((state) => state.manualLocation);
  const [coords, setCoords] = useState(BLR);
  const mapLocation = manualLocation ? seededLocationCenter(manualLocation) : coords;
  const facilitiesQuery = useFacilitiesNearby(
    facilityType,
    mapLocation.lat,
    mapLocation.lng,
    { allowFallback: true },
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
        if (!cancelled && !manualLocation) {
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
  }, [manualLocation]);

  const facilities = useMemo(() => {
    // The catalog is seeded rather than live-geocoded. Always lay it out
    // around the selected/current center so distances remain the promised
    // stable demo values (0–10 km), even when the device is outside Bengaluru.
    const seeded = remapSeededFacilities(
      facilitiesQuery.data ?? [],
      manualLocation || "current-location",
      mapLocation,
    );
    return [...seeded].sort(
      (a, b) =>
        (a.distance_km ?? Number.POSITIVE_INFINITY) -
        (b.distance_km ?? Number.POSITIVE_INFINITY),
    );
  }, [facilitiesQuery.data, manualLocation, mapLocation.lat, mapLocation.lng]);

  const mapPoints = useMemo(() => {
    const points = [...facilities, { lat: mapLocation.lat, lng: mapLocation.lng }];
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
  }, [mapLocation.lat, mapLocation.lng, facilities]);
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
            Check your connection and try again. Demo-seeded locations remain available offline.
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
          label={manualLocation
            ? `Seeded places near ${manualLocation}`
            : coords.lat === BLR.lat
              ? "Using Bengaluru demo location"
              : "Sorted from your location"}
        />
      </Box>

      {/* Deterministic, web-compatible map. Pins are plotted exclusively from
          the seeded facility coordinates returned by the API. */}
      <Box className="mx-6 h-80 rounded-3xl overflow-hidden border border-border relative" style={{ backgroundColor: "#dbece1" }}>
        <Box className="absolute inset-0" style={{ backgroundColor: "#dbece1" }} />
        {/* Parks and water give the seeded Bengaluru view recognizable map
            structure without pretending that an external tile map is live. */}
        <Box className="absolute left-[7%] top-[9%] h-20 w-28 rounded-[40px] opacity-80" style={{ backgroundColor: "#bfe2c9", transform: [{ rotate: "-12deg" }] }} />
        <Box className="absolute right-[9%] bottom-[19%] h-16 w-24 rounded-[36px] opacity-75" style={{ backgroundColor: "#b8dfe1", transform: [{ rotate: "18deg" }] }} />
        <Box className="absolute left-[42%] top-[38%] h-14 w-20 rounded-[30px] opacity-75" style={{ backgroundColor: "#c2e5c5", transform: [{ rotate: "-22deg" }] }} />
        <Box className="absolute inset-0" style={{ transform: [{ scale: mapZoom }], transformOrigin: "center" }}>
          {ROAD_STYLES.map((road, index) => (
            <Box
              key={`road-${index}`}
              className="absolute rounded-full"
              style={{
                left: road.left,
                top: road.top,
                width: road.width,
                height: road.height,
                backgroundColor: road.major ? "#f8fbf5" : "#eef7ef",
                borderWidth: road.major ? 1 : 0,
                borderColor: "#c8dccd",
                opacity: road.major ? 0.95 : 0.82,
                transform: [{ rotate: road.rotate }],
              }}
            />
          ))}
          <Text className="absolute left-[8%] top-[27%] text-[10px] font-bold text-[#5a806c]">Malleshwaram</Text>
          <Text className="absolute left-[53%] top-[25%] text-[10px] font-bold text-[#5a806c]">Indiranagar</Text>
          <Text className="absolute left-[27%] top-[56%] text-[10px] font-bold text-[#5a806c]">Koramangala</Text>
          <Text className="absolute left-[59%] top-[72%] text-[10px] font-bold text-[#5a806c]">HSR Layout</Text>
          <Text className="absolute right-[7%] top-[12%] text-[10px] font-bold text-[#5a806c]">Whitefield</Text>
        </Box>

        <Box className="absolute left-4 right-4 top-4 flex-row justify-between items-center z-10">
          <Badge action="playful" label="Seeded Bengaluru map" />
          <Box className="flex-row gap-1">
            <Pressable accessibilityLabel="Zoom in map" onPress={() => setMapZoom((value) => Math.min(2.4, value + 0.2))} className="h-8 w-8 rounded-full bg-white items-center justify-center border border-border">
              <Text bold className="text-foreground">+</Text>
            </Pressable>
            <Pressable accessibilityLabel="Zoom out map" onPress={() => setMapZoom((value) => Math.max(0.55, value - 0.2))} className="h-8 w-8 rounded-full bg-white items-center justify-center border border-border">
              <Text bold className="text-foreground">−</Text>
            </Pressable>
            <Pressable onPress={() => setMapZoom(1)} className="px-3 h-8 rounded-full bg-white items-center justify-center border border-border">
              <Text className="text-xs text-foreground">Reset</Text>
            </Pressable>
          </Box>
        </Box>

        <Box className="absolute inset-0" style={{ transform: [{ scale: mapZoom }], transformOrigin: "center" }}>
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
