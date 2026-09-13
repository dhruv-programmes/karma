import { BackButton } from "@/components/custom/back-button";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ProductImage } from "@/components/custom/product-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useImpact, useMe, useOffsets, usePurchaseOffset } from "@/src/hooks/queries";
import { useAuthStore } from "@/src/store/auth";

function offsetPointsCost(priceInr: number) {
  return Math.max(50, Math.floor(Math.max(0, priceInr) / 20 + 0.5) * 10);
}

export default function OffsetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const offsets = useOffsets();
  const purchase = usePurchaseOffset();
  const impact = useImpact();
  const me = useMe();
  const authUser = useAuthStore((state) => state.user);
  const [note, setNote] = useState<string | null>(null);

  const items = offsets.data ?? [];
  const pointsBalance = me.data?.impact_points ?? authUser?.impact_points ?? null;

  async function buy(id: string) {
    try {
      const result = await purchase.mutateAsync(id);
      setNote(result.message);
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {
        /* sim */
      }
    } catch (error) {
      setNote(
        error instanceof Error
          ? error.message
          : "Could not complete demo offset purchase."
      );
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 24,
        gap: 16,
      }}
    >
      <HStack className="items-center gap-3">
        <BackButton label="Home" fallbackRoute="/(tabs)" />
        <Heading size="2xl" className="flex-1">Verified offsets</Heading>
      </HStack>
      <Text className="text-muted-foreground -mt-2">
        Optional after circular actions. Prefer repair/reuse first. Demo data.
      </Text>

      <Card variant="softPop">
        <Text bold>
          Karma Coins: {pointsBalance == null ? "—" : pointsBalance.toLocaleString()}
        </Text>
        <Text bold>
          Offset so far ~{Math.round(impact.data?.offset_kg_total ?? 0)} kg
        </Text>
        <Text size="sm" className="text-muted-foreground mt-1">
          Residual footprint ~{Math.round(impact.data?.residual_kg ?? impact.data?.total_kg ?? 0)}{" "}
          kg
        </Text>
      </Card>

      {note ? (
        <Card variant="soft">
          <Text size="sm">{note}</Text>
        </Card>
      ) : null}

      {items.map((o) => (
        <Card key={o.id} variant="soft" className="overflow-hidden p-0">
          {o.cover_image_url ? (
            <ProductImage uri={o.cover_image_url} size="full" radius={0} />
          ) : null}
          <VStack space="sm" className="p-4">
            <Text bold className="flex-1">
              {o.name}
            </Text>
            <Text size="xs" className="text-muted-foreground">
              {o.provider} · {o.geography}
              {o.methodology ? ` · ${o.methodology}` : ""}
            </Text>
            <Text size="sm" className="text-muted-foreground">
              {o.description}
            </Text>
            <HStack space="xl">
              <Text className="font-mono">~{o.co2e_kg} kg CO₂e</Text>
              <Text className="font-mono">₹{o.price_inr}</Text>
            </HStack>
            <Button
              size="sm"
              variant="secondary"
              loading={purchase.isPending}
              disabled={pointsBalance != null && pointsBalance < offsetPointsCost(o.price_inr)}
              onPress={() => void buy(o.id)}
            >
              {`Purchase · ${offsetPointsCost(o.price_inr)} coins`}
            </Button>
          </VStack>
        </Card>
      ))}

      <Button variant="outline" onPress={() => router.push("/(tabs)/actions")}>
        Back to actions
      </Button>
    </ScrollView>
  );
}
