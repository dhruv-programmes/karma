import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CircularityRing } from "@/components/custom/circularity-ring";
import { PointsCounter } from "@/components/custom/points-counter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const [spentFlash, setSpentFlash] = useState(0);
  const brandRewards = (rewards.data ?? []).filter((r) => r.brand);

  async function onRedeem(id: string) {
    try {
      const result = await redeem.mutateAsync(id);
      setClaimCode(result.claim_code);
      setSpentFlash(result.points_spent);
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {
        /* sim */
      }
      setTimeout(() => setSpentFlash(0), 1600);
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
      <Heading size="2xl">Impact rewards</Heading>
      <Text className="text-muted-foreground -mt-2">
        Earned only by real circular actions. Demo brand codes only.
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
          <Text bold>Claim code</Text>
          <Text className="font-mono mt-2">{claimCode}</Text>
          <Text size="xs" className="text-muted-foreground mt-2">
            Mock voucher — not a real brand endorsement.
          </Text>
        </Card>
      ) : null}

      <Text bold>Brand partners</Text>
      <Text size="xs" className="text-muted-foreground -mt-2">
        Demo offers — not real endorsements.
      </Text>
      {brandRewards.map((r) => (
        <Card key={r.id} variant="soft">
          <VStack space="sm">
            <Text bold>{r.title}</Text>
            <Text size="sm" className="text-muted-foreground">
              {r.description}
            </Text>
            <Badge
              action="muted"
              label={`${r.points_required} pts · ${r.brand}`}
            />
            <Button
              size="sm"
              variant="playful"
              loading={redeem.isPending}
              onPress={() => void onRedeem(r.id)}
            >
              Redeem
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
        points={spentFlash}
        visible={spentFlash > 0}
        label="Reward unlocked!"
      />
    </ScrollView>
  );
}
