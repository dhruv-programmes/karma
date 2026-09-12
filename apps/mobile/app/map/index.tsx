import React, { useEffect, useMemo, useState } from "react";
import MapView, { Marker } from "react-native-maps";
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
import { DEMO_REPAIR_ACTION_ID } from "@/src/types/api";

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
    coords.lng
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
    return [...(facilitiesQuery.data ?? [])];
  }, [facilitiesQuery.data]);

  async function markComplete() {
    const actionId = params.actionId ?? DEMO_REPAIR_ACTION_ID;
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

      <MapView
        style={{
          height: 240,
          marginHorizontal: 24,
          borderRadius: 24,
          overflow: "hidden",
        }}
        region={{
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        {facilities.map((f) => (
          <Marker
            key={f.id}
            coordinate={{ latitude: f.lat, longitude: f.lng }}
            title={f.name}
            pinColor="rgb(46,168,110)"
            onPress={() => setSelected(f.id)}
          />
        ))}
      </MapView>

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
