import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useImpact, useOffsets, usePurchaseOffset } from "@/src/hooks/queries";

export default function OffsetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const offsets = useOffsets();
  const purchase = usePurchaseOffset();
  const impact = useImpact();
  const [note, setNote] = useState<string | null>(null);

  const items = offsets.data ?? [];

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
    } catch {
      setNote("Could not complete demo offset purchase.");
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
      <Pressable onPress={() => router.back()}>
        <Text className="text-primary">Back</Text>
      </Pressable>
      <Heading size="2xl">Verified offsets</Heading>
      <Text className="text-muted-foreground -mt-2">
        Optional after circular actions. Prefer repair/reuse first. Demo data.
      </Text>

      <Card variant="softPop">
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
        <Card key={o.id} variant="soft">
          <VStack space="sm">
            <HStack className="justify-between gap-3 items-start">
              <Text bold className="flex-1">
                {o.name}
              </Text>
              <Badge
                action={
                  o.verification_status === "Verified" ? "success" : "warning"
                }
                label={o.verification_status}
              />
            </HStack>
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
              onPress={() => void buy(o.id)}
            >
              Demo purchase
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
