import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Leaf,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Car,
  ArrowRight,
  Sparkles,
  Award,
  ShoppingBag,
  CircleDollarSign,
  TreePine,
  MapPin,
  Receipt,
  Check,
  Flame,
  ChevronRight,
  Zap,
  TrendingUp,
  Tag,
  Clock,
} from "lucide-react-native";
import { BackButton } from "@/components/custom/back-button";
import { BudgetRing } from "@/components/custom/budget-ring";
import { CategoryDonut } from "@/components/custom/category-donut";
import { CompareBars } from "@/components/custom/compare-bars";
import { FootprintTrend } from "@/components/custom/footprint-trend";
import { InsightCard } from "@/components/custom/insight-card";
import { ScreenHeader } from "@/components/custom/screen-header";
import { SkeletonCard } from "@/components/custom/skeleton-card";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { ScrollView } from "@/components/ui/scroll-view";
import { SegmentedControl } from "@/components/ui/segmented";
import { StatTile } from "@/components/ui/stat-tile";
import { Text as UIText } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
  useImpact,
  useImpactTimeseries,
  useSolarImpact,
  useTransactions,
  useMe,
  useRewards,
  useActivity,
} from "@/src/hooks/queries";
import { useAuthStore } from "@/src/store/auth";
import { useSustainablePurchaseStore } from "@/src/store/sustainable-purchase";
import { useTabBarClearance } from "@/src/theme/layout";

export default function ImpactScreen() {
  const insets = useSafeAreaInsets();
  const tabClearance = useTabBarClearance();
  const router = useRouter();
  const impact = useImpact();
  const series = useImpactTimeseries();
  const txns = useTransactions();
  const solar = useSolarImpact();
  const me = useMe();
  const authUser = useAuthStore((state) => state.user);
  const activity = useActivity();
  const rewards = useRewards();
  const [tab, setTab] = useState("overview");

  const tabs = [
    { label: "Overview", value: "overview" },
    { label: "Solar", value: "solar" },
    { label: "Carbon", value: "spend" },
    { label: "Financial", value: "financial" },
    { label: "Rewards", value: "rewards" },
  ];

  const sustainableStore = useSustainablePurchaseStore();
  const isEvVerified = sustainableStore.isVerified || sustainableStore.rewardClaimed;
  const sustainableRewardPoints = sustainableStore.rewardPoints;
  // The API owns the account balance. Sustainable-purchase verification
  // already updates it, so adding a local bonus here would double-count.
  const pointsBalance = me.data?.impact_points ?? authUser?.impact_points ?? null;
  const streakDays = me.data?.streak_days ?? authUser?.streak_days ?? null;
  const solarPoints = solar.data?.greenPoints ?? null;
  const verifiedActionsCount = activity.data?.filter((event) => event.points_delta > 0).length ?? null;
  const sustainablePurchasesCount = activity.data?.filter(
    (event) => event.kind === "sustainable_purchase_verification"
  ).length ?? null;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: tabClearance,
          paddingHorizontal: 20,
          gap: 18,
        }}
      >
        <ScreenHeader
          eyebrow="IMPACT"
          title="Impact"
          subtitle="Live estimates from your spend — not false precision."
        />

        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { label: "Overview", value: "overview" },
            { label: "Spend", value: "spend" },
          ]}
        />

        {impact.isLoading || !impact.data ? (
          <SkeletonCard height={220} />
        ) : (
          <>
            <View style={styles.tileRow}>
              <StatTile
                label="Purchases"
                value={`~${Math.round(impact.data.purchases_kg)}`}
                tone="primary"
              />
              <StatTile
                label="Transport"
                value={`~${Math.round(impact.data.transport_kg)}`}
                tone="info"
              />
              <StatTile
                label="Energy"
                value={`~${Math.round(impact.data.energy_kg)}`}
                tone="warning"
              />
            </View>

            <View style={styles.frost}>
              <BudgetRing
                usedPct={impact.data.budget_used_pct ?? 0}
                budgetKg={impact.data.monthly_budget_kg ?? 90}
                thisMonthKg={
                  impact.data.this_month_kg ?? impact.data.total_kg
                }
                status={impact.data.budget_status ?? "on_track"}
              />
            </View>

            {tab === "overview" ? (
              <VStack space="md">
                <View style={styles.frost}>
                  <FootprintTrend
                    points={(series.data?.points ?? []).map((p) => ({
                      label: p.label,
                      kg: p.kg,
                    }))}
                  />
                </View>
                <View style={styles.frost}>
                  <CategoryDonut
                    purchases={impact.data.purchases_kg}
                    transport={impact.data.transport_kg}
                    energy={impact.data.energy_kg}
                  />
                </View>
                <View style={styles.frost}>
                  <CompareBars
                    previousKg={
                      impact.data.previous_month_kg ??
                      series.data?.previous_month_kg ??
                      0
                    }
                    thisKg={
                      impact.data.this_month_kg ??
                      series.data?.this_month_kg ??
                      0
                    }
                  />
                </View>
                <InsightCard
                  title={`Biggest opportunity: ${impact.data.biggest_opportunity}`}
                  body={impact.data.insight}
                />
                {impact.data.by_category ? (
                  <Card variant="soft" className="border border-border/60">
                    <UIText bold className="mb-2">
                      Category drill-down
                    </UIText>
                    {Object.entries(impact.data.by_category)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, kg]) => (
                        <ListRow
                          key={cat}
                          title={cat}
                          trailing={`~${Math.round(kg)} kg`}
                        />
                      ))}
                  </Card>
                ) : null}
              </VStack>
            ) : (
              <Card variant="soft" className="border border-border/60">
                <UIText bold className="mb-2">
                  Recent transactions
                </UIText>
                {(txns.data ?? []).slice(0, 12).map((t) => (
                  <ListRow
                    key={t.id}
                    title={t.merchant}
                    subtitle={`${t.category} · ${t.date}`}
                    trailing={`₹${Math.round(t.amount_inr).toLocaleString("en-IN")}`}
                  />
                ))}
              </Card>
            )}
          </>
        )}

        <View style={styles.ctaRow}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaOutline,
              pressed && { opacity: 0.88 },
            ]}
            onPress={() => router.push("/map?type=recycling")}
          >
            <Text style={styles.ctaOutlineText} numberOfLines={1}>
              Find recycle
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.ctaPrimary,
              pressed && { opacity: 0.9 },
            ]}
            onPress={() =>
              router.push("/offsets" as import("expo-router").Href)
            }
          >
            <Text style={styles.ctaPrimaryText} numberOfLines={1}>
              View offsets
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4FAF6",
  },
  scroll: {
    flex: 1,
  },
  tileRow: {
    flexDirection: "row",
    gap: 10,
  },
  frost: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.14)",
    padding: 4,
  },
  ctaRow: {
    flexDirection: "row",
    gap: 10,
  },
  ctaOutline: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.28)",
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  ctaOutlineText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: "#183222",
  },
  ctaPrimary: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#2EA86E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  ctaPrimaryText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
});
