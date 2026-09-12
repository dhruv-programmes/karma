import React from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  Leaf,
  Receipt,
  Recycle,
  Wrench,
} from "lucide-react-native";
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
import { HStack } from "@/components/ui/hstack";
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
import { useAuthStore } from "@/src/store/auth";
import { DEMO_REPAIR_ACTION_ID } from "@/src/types/api";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const startingScore = useAuthStore((s) => s.startingScore);
  const startingFootprintKg = useAuthStore((s) => s.startingFootprintKg);
  const goal = useAuthStore((s) => s.goal);

  const me = useMe();
  const impact = useImpact();
  const series = useImpactTimeseries();
  const recs = useRecommendations();
  const closet = useCloset();
  const activity = useActivity();
  const best = recs.data?.[0];

  const displayName = me.data?.name || user?.name || "Member";
  const displayScore = me.data?.circularity_score ?? user?.circularity_score ?? startingScore ?? 642;
  const displayTrend = me.data?.trend_delta ?? user?.trend_delta ?? 14;

  const currentMonthFootprint = Math.round(impact.data?.this_month_kg ?? 0);
  const baselineFootprint = startingFootprintKg ?? 74;
  const footprint = currentMonthFootprint > 0 && currentMonthFootprint < 500 ? currentMonthFootprint : baselineFootprint;

  const targetReduction = goal.reductionPct ?? 15;
  const targetFootprint = Math.round(footprint * (1 - targetReduction / 100));

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 24,
        gap: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Brand & Greeting Header */}
      <Box className="flex-row items-center justify-between">
        <VStack space="xs" className="flex-1">
          <Image
            source={require("@/assets/karma-text.png")}
            style={{ width: 80, height: 23 }}
            contentFit="contain"
          />
          <Heading size="2xl" className="font-heading text-foreground">
            {greeting()}, {displayName.split(" ")[0]}
          </Heading>
        </VStack>
        <Avatar name={displayName} size="lg" />
      </Box>

      {/* Hero Score & Footprint Overview Card */}
      <Card variant="soft" className="p-4 border border-primary/20 bg-card gap-3.5 shadow-sm">
        <HStack className="items-center justify-between">
          <VStack>
            <HStack className="items-baseline gap-2">
              <Text size="4xl" bold className="text-foreground font-mono">
                {displayScore}
              </Text>
              <Text size="xs" bold className="text-primary font-mono">
                ↑ +{displayTrend} this month
              </Text>
            </HStack>
            <Text size="xs" bold className="text-primary tracking-widest uppercase font-mono mt-0.5">
              Carbon Score
            </Text>
          </VStack>

          <Box className="items-end">
            <HStack className="items-baseline gap-1">
              <Text size="2xl" bold className="text-foreground font-mono">
                {footprint}
              </Text>
              <Text size="xs" className="text-muted-foreground font-body">
                kg CO₂e
              </Text>
            </HStack>
            <Text size="xs" className="text-muted-foreground font-body">
              Target: {targetFootprint} kg (−{targetReduction}%)
            </Text>
          </Box>
        </HStack>

        <Box className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <Box
            style={{ width: `${Math.min(100, Math.round((displayScore / 850) * 100))}%` }}
            className="h-full bg-primary rounded-full"
          />
        </Box>
      </Card>

      {/* Ticker Stats */}
      <TickerStrip
        points={me.data?.impact_points ?? user?.impact_points ?? 420}
        streak={me.data?.streak_days ?? user?.streak_days ?? 5}
        trend={displayTrend}
        level={me.data?.loop_level ?? user?.loop_level ?? 2}
      />

      {/* YOUR NEXT BEST ACTION */}
      <VStack space="xs">
        <Text size="xs" bold className="text-primary tracking-wider uppercase font-mono">
          Your Next Best Action
        </Text>
        <Card variant="softPop" className="p-4 gap-3 border border-primary/30">
          <HStack className="items-center justify-between">
            <Box className="px-2.5 py-0.5 rounded-full bg-primary/15">
              <Text size="2xs" bold className="text-primary font-mono">
                Potential impact: −4.2 kg CO₂e
              </Text>
            </Box>
            <Chip tone="accent" label="High Priority" />
          </HStack>

          <HStack className="items-center gap-3">
            <Box className="w-11 h-11 rounded-2xl bg-primary/15 items-center justify-center">
              <Wrench size={22} color="rgb(46,168,110)" />
            </Box>
            <VStack className="flex-1">
              <Text bold size="md" className="text-foreground font-heading">
                {best?.title || "Repair your old headphones"}
              </Text>
              <Text size="xs" className="text-muted-foreground font-body">
                {best?.subtitle || "Keep durable audio hardware out of landfills"}
              </Text>
            </VStack>
          </HStack>

          <Button
            onPress={() =>
              router.push({
                pathname: "/map",
                params: {
                  type: "repair",
                  actionId: best?.id || DEMO_REPAIR_ACTION_ID,
                  actionType: best?.action_type || "REPAIR",
                },
              })
            }
            className="h-11 rounded-xl mt-1"
          >
            <HStack className="items-center justify-center gap-2">
              <Text bold className="text-primary-foreground font-body text-sm">
                Find a repair partner
              </Text>
              <ArrowRight size={16} color="white" />
            </HStack>
          </Button>
        </Card>
      </VStack>

      {/* YOUR PROGRESS & REWARDS */}
      <Box className="flex-row gap-3">
        {/* Progress Card */}
        <Card variant="soft" className="flex-1 p-3.5 gap-2 border border-border">
          <Text size="xs" bold className="text-muted-foreground uppercase tracking-wider font-mono">
            Your Progress
          </Text>
          <Text size="xl" bold className="text-foreground font-mono">
            3 / 5 actions
          </Text>
          <HStack className="flex-wrap gap-1 mt-1">
            <Box className="px-2 py-0.5 rounded-md bg-primary/15 flex-row items-center gap-1">
              <Check size={10} color="rgb(46,168,110)" />
              <Text size="2xs" bold className="text-primary font-body">
                Repair
              </Text>
            </Box>
            <Box className="px-2 py-0.5 rounded-md bg-primary/15 flex-row items-center gap-1">
              <Check size={10} color="rgb(46,168,110)" />
              <Text size="2xs" bold className="text-primary font-body">
                Recycle
              </Text>
            </Box>
            <Box className="px-2 py-0.5 rounded-md bg-primary/15 flex-row items-center gap-1">
              <Check size={10} color="rgb(46,168,110)" />
              <Text size="2xs" bold className="text-primary font-body">
                Resell
              </Text>
            </Box>
          </HStack>
        </Card>

        {/* Rewards Unlocked Card */}
        <Pressable
          onPress={() => router.push("/rewards")}
          className="flex-1"
        >
          <Card variant="soft" className="h-full p-3.5 gap-2 border border-border justify-between">
            <VStack space="xs">
              <Text size="xs" bold className="text-muted-foreground uppercase tracking-wider font-mono">
                Rewards
              </Text>
              <Text size="xl" bold className="text-foreground font-mono">
                2 unlocked
              </Text>
            </VStack>
            <HStack className="items-center gap-1">
              <Text size="xs" bold className="text-primary font-body">
                View rewards
              </Text>
              <ChevronRight size={14} color="rgb(46,168,110)" />
            </HStack>
          </Card>
        </Pressable>
      </Box>

      {/* Residual & Budget Tiles */}
      <Box className="flex-row gap-3">
        <StatTile
          label="Residual"
          value={`~${Math.round(impact.data?.residual_kg ?? 58)}`}
          hint="kg left this month"
          tone="primary"
        />
        <StatTile
          label="Budget"
          value={`${Math.round(impact.data?.budget_used_pct ?? 34)}%`}
          hint={impact.data?.budget_status?.replace("_", " ") || "on track"}
          tone="info"
        />
      </Box>

      {/* Timeseries Footprint Trend */}
      <FootprintTrend
        points={(series.data?.points ?? []).map((p) => ({
          label: p.label,
          kg: p.kg,
        }))}
      />

      {/* Circularity Score Deep-dive */}
      <CircularityScore
        score={displayScore}
        trendDelta={displayTrend}
        onPress={() => router.push("/rewards")}
      />

      {/* My Loop Closet */}
      <VStack space="sm">
        <Text size="sm" bold className="text-foreground font-heading">
          My Loop Closet
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Box className="flex-row gap-3">
            {(closet.data ?? []).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/product/${item.id}`)}
              >
                <Card variant="soft" className="w-[156px] gap-2 overflow-hidden p-3 border border-border">
                  <ProductImage uri={item.image_url} size="full" radius={16} />
                  <Text bold numberOfLines={2} size="sm" className="font-heading">
                    {item.name}
                  </Text>
                  <Chip tone="muted" label={item.next_action_label || item.category} />
                  {item.last_action_label ? (
                    <Text size="xs" className="text-muted-foreground font-body">
                      {item.last_action_label}
                    </Text>
                  ) : null}
                </Card>
              </Pressable>
            ))}
          </Box>
        </ScrollView>
      </VStack>

      {/* Activity Timeline */}
      <VStack space="sm">
        <Text size="sm" bold className="text-foreground font-heading">
          Recent Activity
        </Text>
        <Card variant="soft" className="py-1 border border-border">
          {(activity.data ?? []).slice(0, 5).map((ev) => (
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

      {/* Quick Action Tools */}
      <VStack space="sm">
        <Text size="sm" bold className="text-foreground font-heading">
          Loop Tools
        </Text>
        <Box className="flex-row flex-wrap gap-3">
          <Quick
            icon={<Camera color="rgb(46,168,110)" size={20} />}
            label="Scan Product"
            onPress={() => router.push("/scan")}
          />
          <Quick
            icon={<Receipt color="rgb(46,168,110)" size={20} />}
            label="Import Receipt"
            onPress={() => router.push("/receipt")}
          />
          <Quick
            icon={<Recycle color="rgb(46,168,110)" size={20} />}
            label="Recycling Hubs"
            onPress={() => router.push("/map?type=recycling")}
          />
          <Quick
            icon={<Leaf color="rgb(46,168,110)" size={20} />}
            label="Offset Residual"
            onPress={() => router.push("/offsets" as import("expo-router").Href)}
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
      <Card variant="soft" className="min-h-[84px] justify-center gap-2 border border-border active:bg-secondary">
        {icon}
        <Text size="sm" bold className="text-foreground font-body">
          {label}
        </Text>
      </Card>
    </Pressable>
  );
}
