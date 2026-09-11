import React from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, Leaf, Recycle, Receipt } from "lucide-react-native";
import { CircularityScore } from "@/components/custom/circularity-score";
import { FootprintTrend } from "@/components/custom/footprint-trend";
import { ProductImage } from "@/components/custom/product-image";
import { RecommendationCard } from "@/components/custom/recommendation-card";
import { SkeletonCard } from "@/components/custom/skeleton-card";
import { TickerStrip } from "@/components/custom/ticker-strip";
import { Avatar } from "@/components/ui/avatar";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Heading } from "@/components/ui/heading";
import { ListRow } from "@/components/ui/list-row";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { StatTile } from "@/components/ui/stat-tile";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
  useActivity,
  useCloset,
  useImpact,
  useImpactTimeseries,
  useMe,
  useRecommendations,
} from "@/src/hooks/queries";
import { DEMO_REPAIR_ACTION_ID } from "@/src/types/api";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function nudge(streak: number, hour: number) {
  if (hour < 11) return "Morning loop: clear one action before lunch.";
  if (hour > 18) return "Evening check-in: log a circular win today.";
  if (streak >= 5) return "Streak is hot — one more action locks Week Streak.";
  return "Your next circular move is ready.";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useMe();
  const impact = useImpact();
  const series = useImpactTimeseries();
  const recs = useRecommendations();
  const closet = useCloset();
  const activity = useActivity();
  const best = recs.data?.[0];
  const hour = new Date().getHours();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 24,
        gap: 20,
      }}
    >
      <Box className="flex-row items-center justify-between">
        <VStack space="xs" className="flex-1">
          <Text size="sm" bold className="text-primary">
            Carbon Loop
          </Text>
          <Heading size="2xl">
            {greeting()}
            {me.data?.name ? `, ${me.data.name}` : ""}
          </Heading>
        </VStack>
        <Avatar name={me.data?.name || "A"} size="lg" />
      </Box>

      <Chip tone="info" label={nudge(me.data?.streak_days ?? 5, hour)} />

      <TickerStrip
        points={me.data?.impact_points ?? 420}
        streak={me.data?.streak_days ?? 5}
        trend={me.data?.trend_delta ?? 6}
        level={me.data?.loop_level ?? 2}
      />

      {best ? (
        <Card variant="softPop" className="gap-3">
          <Chip tone="accent" label="Today · do this first" />
          <Text bold size="xl">
            {best.title}
          </Text>
          <Text size="sm" className="text-muted-foreground">
            {best.subtitle} · ~{Math.round(best.co2e_avoided_kg)} kg CO₂e ·{" "}
            {best.local_availability}
          </Text>
          <Button
            onPress={() =>
              router.push({
                pathname: "/map",
                params: {
                  type: "repair",
                  actionId: best.id || DEMO_REPAIR_ACTION_ID,
                  actionType: best.action_type,
                },
              })
            }
          >
            Start nearby action
          </Button>
        </Card>
      ) : (
        <SkeletonCard height={140} />
      )}

      <Box className="flex-row gap-3">
        <StatTile
          label="Residual"
          value={`~${Math.round(impact.data?.residual_kg ?? 0)}`}
          hint="kg left"
          tone="primary"
        />
        <StatTile
          label="Budget"
          value={`${Math.round(impact.data?.budget_used_pct ?? 0)}%`}
          hint={impact.data?.budget_status?.replace("_", " ") || "on track"}
          tone={
            impact.data?.budget_status === "over"
              ? "warning"
              : impact.data?.budget_status === "watch"
                ? "accent"
                : "info"
          }
        />
      </Box>

      <FootprintTrend
        points={(series.data?.points ?? []).map((p) => ({
          label: p.label,
          kg: p.kg,
        }))}
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
          My Loop Closet
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Box className="flex-row gap-3">
            {(closet.data ?? []).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/product/${item.id}`)}
              >
                <Card variant="soft" className="w-[156px] gap-2 overflow-hidden p-3">
                  <ProductImage uri={item.image_url} size="full" radius={16} />
                  <Text bold numberOfLines={2} size="sm">
                    {item.name}
                  </Text>
                  <Chip tone="muted" label={item.next_action_label || item.category} />
                  {item.last_action_label ? (
                    <Text size="xs" className="text-muted-foreground">
                      {item.last_action_label}
                    </Text>
                  ) : null}
                </Card>
              </Pressable>
            ))}
          </Box>
        </ScrollView>
      </VStack>

      <VStack space="sm">
        <Text size="sm" bold className="text-secondary-foreground">
          Activity
        </Text>
        <Card variant="soft" className="py-1">
          {(activity.data ?? []).slice(0, 6).map((ev) => (
            <ListRow
              key={ev.id}
              title={ev.title}
              subtitle={ev.subtitle}
              trailing={
                ev.points_delta
                  ? `${ev.points_delta > 0 ? "+" : ""}${ev.points_delta}`
                  : undefined
              }
            />
          ))}
        </Card>
      </VStack>

      <VStack space="md">
        <Text size="sm" bold className="text-secondary-foreground">
          Jump in
        </Text>
        <Box className="flex-row flex-wrap gap-3">
          <Quick
            icon={<Camera color="rgb(46,168,110)" size={20} />}
            label="Scan"
            onPress={() => router.push("/scan")}
          />
          <Quick
            icon={<Receipt color="rgb(46,168,110)" size={20} />}
            label="Receipt"
            onPress={() => router.push("/receipt")}
          />
          <Quick
            icon={<Recycle color="rgb(46,168,110)" size={20} />}
            label="Recycle"
            onPress={() => router.push("/map?type=recycling")}
          />
          <Quick
            icon={<Leaf color="rgb(46,168,110)" size={20} />}
            label="Offsets"
            onPress={() =>
              router.push("/offsets" as import("expo-router").Href)
            }
          />
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
