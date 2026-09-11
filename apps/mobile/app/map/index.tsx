import React, { useMemo, useState } from "react";
import MapView, { Marker } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FacilityCard } from "@/components/custom/facility-card";
import { PointsCounter } from "@/components/custom/points-counter";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { useCompleteAction, useRepairNearby } from "@/src/hooks/queries";
import { api } from "@/src/lib/api";
import { fallbackFacilities } from "@/src/lib/fallbacks";
import { useAppStore } from "@/src/store/app";
import { DEMO_REPAIR_ACTION_ID } from "@/src/types/api";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    actionId?: string;
  }>();
  const repair = useRepairNearby();
  const complete = useCompleteAction();
  const [selected, setSelected] = useState<string | null>(null);
  const [showPoints, setShowPoints] = useState(false);
  const [awarded, setAwarded] = useState(0);
  const setLastPoints = useAppStore((s) => s.setLastPointsAwarded);

  const facilities = useMemo(() => {
    if (params.type === "recycling") {
      return fallbackFacilities.map((f, i) =>
        i === 0
          ? {
              ...f,
              id: "33333333-3333-3333-3333-333333333303",
              name: "Saahas Zero Waste Hub",
              facility_type: "recycling",
              distance_km: 3.2,
              verification_status: "Verified",
            }
          : f
      );
    }
    return repair.data ?? fallbackFacilities;
  }, [params.type, repair.data]);

  async function markComplete() {
    const actionId = params.actionId ?? DEMO_REPAIR_ACTION_ID;
    try {
      const result = await complete.mutateAsync({
        id: actionId,
        action_type: "REPAIR",
      });
      setAwarded(result.points_awarded);
      setLastPoints(result.points_awarded);
      setShowPoints(true);
      setTimeout(() => router.replace("/rewards"), 1600);
    } catch {
      try {
        const result = await api.completeAction(actionId, "REPAIR");
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
        <Pressable onPress={() => router.back()}>
          <Text className="text-primary">Back</Text>
        </Pressable>
        <Text bold>
          {params.type === "recycling" ? "Recycle nearby" : "Find repair"}
        </Text>
        <Box className="w-10" />
      </Box>

      <MapView
        style={{ height: 260, marginHorizontal: 24, borderRadius: 24, overflow: "hidden" }}
        initialRegion={{
          latitude: 12.9716,
          longitude: 77.5946,
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
        contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 100 }}
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
        className="absolute left-0 right-0 bottom-0 px-6 bg-background"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Button
          disabled={!selected}
          loading={complete.isPending}
          onPress={() => void markComplete()}
        >
          Mark action complete
        </Button>
      </Box>

      <PointsCounter points={awarded} visible={showPoints} />
    </Box>
  );
}
