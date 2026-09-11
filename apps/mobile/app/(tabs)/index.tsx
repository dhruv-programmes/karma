import React from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, Leaf, Recycle, Receipt } from "lucide-react-native";
import { CircularityScore } from "@/components/custom/circularity-score";
import { RecommendationCard } from "@/components/custom/recommendation-card";
import { SkeletonCard } from "@/components/custom/skeleton-card";
import { TickerStrip } from "@/components/custom/ticker-strip";
import { Box } from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useImpact, useMe, useRecommendations } from "@/src/hooks/queries";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useMe();
  const impact = useImpact();
  const recs = useRecommendations();
  const best = recs.data?.[0];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 24,
        gap: 24,
      }}
    >
      <VStack space="xs">
        <Text size="sm" bold className="text-primary">
          Carbon Loop
        </Text>
        <Heading size="2xl">
          {greeting()}
          {me.data?.name ? `, ${me.data.name}` : ""}
        </Heading>
      </VStack>

      <TickerStrip
        points={me.data?.impact_points ?? 420}
        streak={me.data?.streak_days ?? 5}
        trend={me.data?.trend_delta ?? 6}
      />

      {me.isLoading ? (
        <SkeletonCard height={140} />
      ) : (
        <CircularityScore
          score={me.data?.circularity_score ?? 74}
          trendDelta={me.data?.trend_delta ?? 6}
          onPress={() => router.push("/rewards")}
        />
      )}

      <VStack space="md">
        <Text size="sm" bold className="text-secondary-foreground">
          Best action today
        </Text>
        {best ? (
          <RecommendationCard
            hero
            item={best}
            onPress={() =>
              router.push(
                best.product_id
                  ? `/product/${best.product_id}`
                  : `/action/${best.id}`
              )
            }
          />
        ) : (
          <SkeletonCard />
        )}
      </VStack>

      <VStack space="md">
        <Text size="sm" bold className="text-secondary-foreground">
          Your footprint mix
        </Text>
        <Box className="flex-row gap-3">
          {[
            { label: "Purchases", value: impact.data?.purchases_kg },
            { label: "Transport", value: impact.data?.transport_kg },
            { label: "Energy", value: impact.data?.energy_kg },
          ].map((item) => (
            <Card key={item.label} variant="soft" className="flex-1 p-3">
              <Text size="lg" bold className="font-mono">
                ~{Math.round(item.value ?? 0)}
              </Text>
              <Text size="xs" className="text-muted-foreground mt-1">
                {item.label}
              </Text>
            </Card>
          ))}
        </Box>
      </VStack>

      <VStack space="md">
        <Text size="sm" bold className="text-secondary-foreground">
          Jump in
        </Text>
        <Box className="flex-row flex-wrap gap-3">
          <Quick icon={<Camera color="rgb(46,168,110)" size={20} />} label="Scan" onPress={() => router.push("/scan")} />
          <Quick icon={<Receipt color="rgb(46,168,110)" size={20} />} label="Receipt" onPress={() => router.push("/receipt")} />
          <Quick icon={<Recycle color="rgb(46,168,110)" size={20} />} label="Recycle" onPress={() => router.push("/map?type=recycling")} />
          <Quick icon={<Leaf color="rgb(46,168,110)" size={20} />} label="Offsets" onPress={() => router.push("/offsets" as import("expo-router").Href)} />
        </Box>
      </VStack>
    </ScrollView>
  );
}

function Quick({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="w-[47%] grow">
      <Card variant="soft" className="min-h-[88px] justify-center gap-2">
        {icon}
        <Text size="sm">{label}</Text>
      </Card>
    </Pressable>
  );
}
