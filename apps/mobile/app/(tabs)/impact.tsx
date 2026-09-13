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
  Sun,
} from "lucide-react-native";
import { BackButton } from "@/components/custom/back-button";
import { BudgetRing } from "@/components/custom/budget-ring";
import { CategoryDonut } from "@/components/custom/category-donut";
import { CompareBars } from "@/components/custom/compare-bars";
import { FootprintTrend } from "@/components/custom/footprint-trend";
import { InsightCard } from "@/components/custom/insight-card";
import { SolarImpactDashboard } from "@/components/custom/solar-impact-dashboard";
import { ScreenHeader } from "@/components/custom/screen-header";
import { SkeletonCard } from "@/components/custom/skeleton-card";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { ScrollView } from "@/components/ui/scroll-view";
import { SegmentedControl } from "@/components/ui/segmented";
import { StatTile } from "@/components/ui/stat-tile";
import { Button } from "@/components/ui/button";
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
import { useSolarAssetsStore } from "@/src/store/solar-assets";

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
  const solarPanels = useSolarAssetsStore((state) => state.panels);
  const selectedPanelId = useSolarAssetsStore((state) => state.selectedPanelId);
  const selectPanel = useSolarAssetsStore((state) => state.selectPanel);
  const selectedPanel = solarPanels.find((panel) => panel.id === selectedPanelId) ?? solarPanels[0];
  const solarViewData = solar.data && selectedPanel
    ? {
        ...solar.data,
        location: selectedPanel.location,
        systemSizeKw: selectedPanel.systemSizeKw,
        rewards: [
          { label: `${selectedPanel.name} verified`, points: selectedPanel.rewardPoints },
          ...solar.data.rewards,
        ],
      }
    : null;
  const [tab, setTab] = useState("overview");

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
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
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
            { label: "Solar", value: "solar" },
            { label: "Spend", value: "spend" },
          ]}
        />

        {tab === "solar" ? (
          !selectedPanel ? (
            <View style={styles.solarEmptyCard}>
              <View style={styles.solarEmptyIcon}><Sun size={24} color="#B7791F" /></View>
              <UIText bold style={styles.solarEmptyTitle}>Add solar from Tools</UIText>
              <UIText style={styles.solarEmptyText}>Add one or more rooftop systems to unlock the animated solar view and higher-value rewards.</UIText>
              <Button onPress={() => router.push("/tools/add-solar")}>Add solar system</Button>
            </View>
          ) : solar.isLoading || !solarViewData ? (
            <SkeletonCard height={280} />
          ) : (
            <>
              {solarPanels.length > 1 ? (
                <View style={styles.solarSelector}>
                  {solarPanels.map((panel) => (
                    <Pressable key={panel.id} onPress={() => selectPanel(panel.id)} style={[styles.solarChip, panel.id === selectedPanel.id && styles.solarChipActive]}>
                      <Sun size={14} color={panel.id === selectedPanel.id ? "#FFFFFF" : "#B7791F"} />
                      <UIText numberOfLines={1} style={[styles.solarChipText, panel.id === selectedPanel.id && styles.solarChipTextActive]}>{panel.name}</UIText>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <SolarImpactDashboard data={solarViewData} />
            </>
          )
        ) : impact.isLoading || !impact.data ? (
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

            <BudgetRing
                usedPct={impact.data.budget_used_pct ?? 0}
                budgetKg={impact.data.monthly_budget_kg ?? 90}
                thisMonthKg={
                  impact.data.this_month_kg ?? impact.data.total_kg
                }
                status={impact.data.budget_status ?? "on_track"}
              />

            {tab === "overview" ? (
              <VStack space="md">
                <FootprintTrend
                    points={(series.data?.points ?? []).map((p) => ({
                      label: p.label,
                      kg: p.kg,
                    }))}
                  />
                <CategoryDonut
                    purchases={impact.data.purchases_kg}
                    transport={impact.data.transport_kg}
                    energy={impact.data.energy_kg}
                  />
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
                <InsightCard
                  title={`Biggest opportunity: ${impact.data.biggest_opportunity}`}
                  body={impact.data.insight}
                />
                {impact.data.by_category ? (
                  <View style={styles.drilldownCard}>
                    <Text style={styles.drilldownTitle}>
                      Category drill-down
                    </Text>
                    {Object.entries(impact.data.by_category)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, kg]) => (
                        <ListRow
                          key={cat}
                          title={cat}
                          trailing={`~${Math.round(kg)} kg`}
                        />
                      ))}
                  </View>
                ) : null}
              </VStack>
            ) : (
              <View style={styles.drilldownCard}>
                <Text style={styles.drilldownTitle}>
                  Recent transactions
                </Text>
                {(txns.data ?? []).slice(0, 12).map((t) => (
                  <ListRow
                    key={t.id}
                    title={t.merchant}
                    subtitle={`${t.category} · ${t.date}`}
                    trailing={`₹${Math.round(t.amount_inr).toLocaleString("en-IN")}`}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <View style={styles.ctaRow}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaPrimary,
              pressed && { opacity: 0.9 },
            ]}
            onPress={() => router.push("/map?type=recycling")}
          >
            <Text style={styles.ctaPrimaryText} numberOfLines={1}>
              Find Recycling Hubs
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
    minWidth: 0,
  },
  drilldownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5ECE8",
    boxShadow: "0px 1px 4px rgba(0,0,0,0.03)",
    elevation: 1,
  },
  drilldownTitle: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    letterSpacing: -0.2,
    marginBottom: 4,
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
  solarEmptyCard: { backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: "#D8E9DF", padding: 20, gap: 10 },
  solarEmptyIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#FFF5D9", alignItems: "center", justifyContent: "center" },
  solarEmptyTitle: { color: "#183222", fontSize: 19 },
  solarEmptyText: { color: "#6B8576", fontSize: 13, lineHeight: 18 },
  solarSelector: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  solarChip: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "100%", paddingHorizontal: 11, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: "#D8E9DF", backgroundColor: "#FFFFFF" },
  solarChipActive: { backgroundColor: "#0E2A1E", borderColor: "#0E2A1E" },
  solarChipText: { color: "#557362", fontSize: 12, fontWeight: "800", flexShrink: 1 },
  solarChipTextActive: { color: "#FFFFFF" },
});
