import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CircularityRing } from "@/components/custom/circularity-ring";
import { PointsCounter } from "@/components/custom/points-counter";
import { ProductImage } from "@/components/custom/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useMe, useRedeemReward, useRewards } from "@/src/hooks/queries";
import { useAppStore } from "@/src/store/app";

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useMe();
  const rewards = useRewards();
  const redeem = useRedeemReward();
  const lastPoints = useAppStore((s) => s.lastPointsAwarded);
  const [claimCode, setClaimCode] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const brandRewards = (rewards.data ?? []).filter((r) => r.brand);

  async function onRedeem(id: string) {
    try {
      const result = await redeem.mutateAsync(id);
      setClaimCode(result.claim_code);
      setFlash(true);
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {
        /* sim */
      }
      setTimeout(() => setFlash(false), 1600);
    } catch {
      setClaimCode("Need more points — complete a circular action first.");
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
      <Pressable onPress={() => router.replace("/(tabs)")}>
        <Text className="text-primary">Home</Text>
      </Pressable>
      <Heading size="2xl">Partner offers</Heading>
      <Text className="text-muted-foreground -mt-2">
        Wallet of demo brand perks — not real endorsements.
      </Text>

      <Card variant="soft" className="flex-row items-center gap-4">
        <CircularityRing score={me.data?.circularity_score ?? 74} size={110} />
        <VStack space="xs" className="flex-1">
          <Text size="2xl" bold className="font-mono">
            {me.data?.impact_points ?? 420} pts
          </Text>
          <Text size="sm" className="text-muted-foreground">
            Loop Level {me.data?.loop_level ?? 2} · Streak{" "}
            {me.data?.streak_days ?? 5}d
          </Text>
          {lastPoints ? (
            <Text className="font-mono text-primary">
              Last award +{lastPoints}
            </Text>
          ) : null}
        </VStack>
      </Card>

      {claimCode ? (
        <Card variant="softPop">
          <Chip tone="success" label="In your wallet" />
          <Text bold className="mt-2">
            Claim code
          </Text>
          <Text className="font-mono mt-2">{claimCode}</Text>
          <Text size="xs" className="text-muted-foreground mt-2">
            Mock voucher — expires per partner offer.
          </Text>
        </Card>
      ) : null}

      {brandRewards.map((r) => (
        <Card key={r.id} variant="soft" className="overflow-hidden p-0">
          {r.cover_image_url ? (
            <ProductImage uri={r.cover_image_url} size="full" radius={0} />
          ) : null}
          <VStack space="sm" className="p-4">
            <Text bold>{r.title}</Text>
            <Text size="sm" className="text-muted-foreground">
              {r.description}
            </Text>
            <Badge
              action="muted"
              label={`${r.points_required} pts · ${r.brand}`}
            />
            {r.expires_on ? (
              <Chip tone="warning" label={`Expires ${r.expires_on}`} />
            ) : null}
            <Button
              size="sm"
              variant="playful"
              loading={redeem.isPending}
              onPress={() => void onRedeem(r.id)}
            >
              Redeem to wallet
            </Button>
          </VStack>
        </Card>
      ))}

      <Button
        onPress={() => router.push("/offsets" as import("expo-router").Href)}
      >
        Browse offsets
      </Button>

      <PointsCounter
        points={0}
        visible={flash}
        label="Offer unlocked!"
      />
    </ScrollView>
  );
}
