import React, { useState } from "react";
import { useSustainablePurchaseStore } from "@/src/store/sustainable-purchase";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
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
import { SkeletonCard } from "@/components/custom/skeleton-card";
import { Text } from "@/components/ui/text";
import { SolarImpactDashboard } from "@/components/custom/solar-impact-dashboard";
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
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: tabClearance + 24,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* Top Header: Clean Impact without badge                    */}
        {/* ========================================================= */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <BackButton label="Home" fallbackRoute="/(tabs)" />
          </View>
          <Text style={styles.title}>Impact</Text>
          <Text style={styles.subtitle}>
            Live carbon footprint, solar intelligence & earned rewards
          </Text>
        </View>

        {/* ========================================================= */}
        {/* PERSISTENT REWARDS PERSUASION STRIP (Always Visible)      */}
        {/* Keeps rewards prominently seen across ALL tabs            */}
        {/* ========================================================= */}
        <View style={styles.rewardsPersuasionBar}>
          <View style={styles.rewardsBarLeft}>
            <View style={styles.rewardsCoinIconWrap}>
              <Coins size={17} color="#B45309" strokeWidth={2.4} />
            </View>
            <View style={styles.rewardsBarMeta}>
              <View style={styles.rewardsPointsRow}>
                <Text style={styles.rewardsPointsVal}>{pointsBalance ?? "—"}</Text>
                <Text style={styles.rewardsPointsLabel}>Karma Coins</Text>
                <View style={styles.streakBadge}>
                  <Flame size={10} color="#EA580C" strokeWidth={2.4} />
                  <Text style={styles.streakText}>
                    {streakDays === null ? "—" : `${streakDays}d Streak`}
                  </Text>
                </View>
              </View>
              <Text style={styles.rewardsSubCopy}>
                {solarPoints === null
                  ? "Solar points unavailable"
                  : `+${solarPoints} solar pts today · Redeemable for govt subsidies`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.rewardsBarBtn}
            onPress={() => router.push("/offers")}
            activeOpacity={0.8}
          >
            <Text style={styles.rewardsBarBtnText}>Redeem</Text>
            <ArrowRight size={12} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* ========================================================= */}
        {/* Category Sub-Tab Filter Pills                             */}
        {/* ========================================================= */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
        >
          {tabs.map((item) => {
            const active = item.value === tab;
            return (
              <TouchableOpacity
                key={item.value}
                onPress={() => setTab(item.value)}
                style={[styles.pill, active ? styles.pillActive : null]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    active ? styles.pillTextActive : null,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ========================================================= */}
        {/* TAB 1: SOLAR (Dedicated Solar Intelligence Dashboard)      */}
        {/* ========================================================= */}
        {tab === "solar" ? (
          solar.isLoading || !solar.data ? (
            <SkeletonCard height={280} />
          ) : (
            <SolarImpactDashboard data={solar.data} />
          )
        ) : impact.isLoading || !impact.data ? (
          <SkeletonCard height={220} />
        ) : tab === "overview" ? (
          /* ========================================================= */
          /* TAB 2: OVERVIEW                                           */
          /* ========================================================= */
          <>
            {/* Quick 3 Stat Tiles */}
            <View style={styles.statTilesRow}>
              <View style={styles.statTileCard}>
                <View style={styles.statTileHeader}>
                  <View style={[styles.statTileDot, { backgroundColor: "#2EA86E" }]} />
                  <Text style={styles.statTileLabel}>PURCHASES</Text>
                </View>
                <Text style={styles.statTileValue}>
                  ~{Math.round(impact.data.purchases_kg)} <Text style={styles.statTileUnit}>kg</Text>
                </Text>
                <Text style={styles.statTileSub}>Embodied CO₂e</Text>
              </View>

              <View style={styles.statTileCard}>
                <View style={styles.statTileHeader}>
                  <View style={[styles.statTileDot, { backgroundColor: "#0284C7" }]} />
                  <Text style={styles.statTileLabel}>TRANSPORT</Text>
                </View>
                <Text style={[styles.statTileValue, { color: "#0284C7" }]}>
                  ~{Math.round(impact.data.transport_kg)} <Text style={[styles.statTileUnit, { color: "#0284C7" }]}>kg</Text>
                </Text>
                <Text style={styles.statTileSub}>Commuting</Text>
              </View>

              <View style={styles.statTileCard}>
                <View style={styles.statTileHeader}>
                  <View style={[styles.statTileDot, { backgroundColor: "#F59E0B" }]} />
                  <Text style={styles.statTileLabel}>ENERGY</Text>
                </View>
                <Text style={[styles.statTileValue, { color: "#D97706" }]}>
                  ~{Math.round(impact.data.energy_kg)} <Text style={[styles.statTileUnit, { color: "#D97706" }]}>kg</Text>
                </Text>
                <Text style={styles.statTileSub}>Home grid use</Text>
              </View>
            </View>

            {/* Monthly Budget Ring */}
            <BudgetRing
              usedPct={impact.data.budget_used_pct ?? 0}
              budgetKg={impact.data.monthly_budget_kg ?? 90}
              thisMonthKg={impact.data.this_month_kg ?? impact.data.total_kg}
              status={impact.data.budget_status ?? "on_track"}
            />

            {/* Historical Footprint Trend */}
            <FootprintTrend
              points={(series.data?.points ?? []).map((p) => ({
                label: p.label,
                kg: p.kg,
              }))}
            />

            {/* Category Donut & Comparison */}
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
                impact.data.this_month_kg ?? series.data?.this_month_kg ?? 0
              }
            />

            <InsightCard
              title={`Biggest opportunity: ${impact.data.biggest_opportunity}`}
              body={impact.data.insight}
            />

            {/* Upgraded Category Drill-Down in Clean White Card with Visual Proportions */}
            {impact.data.by_category ? (() => {
              const entries = Object.entries(impact.data.by_category).sort((a, b) => b[1] - a[1]);
              const maxCat = Math.max(...entries.map(([, kg]) => kg), 1);
              const totalCat = entries.reduce((acc, [, kg]) => acc + kg, 0) || 1;

              return (
                <View style={styles.cleanCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.iconCircle}>
                      <Leaf size={16} color="#2EA86E" strokeWidth={2.2} />
                    </View>
                    <View style={styles.cardHeaderInfo}>
                      <Text style={styles.cardHeaderTitle}>
                        Category Drill-Down
                      </Text>
                      <Text style={styles.cardHeaderSubtitle}>
                        Embodied footprint by consumption vertical
                      </Text>
                    </View>
                    <View style={styles.categoryCountBadge}>
                      <Text style={styles.categoryCountText}>{entries.length} Sectors</Text>
                    </View>
                  </View>

                  <View style={styles.categoryList}>
                    {entries.map(([cat, kg]) => {
                      const pct = Math.round((kg / totalCat) * 100);
                      const barPct = Math.min(100, Math.max(6, Math.round((kg / maxCat) * 100)));

                      return (
                        <View key={cat} style={styles.categoryRow}>
                          <View style={styles.categoryRowTop}>
                            <View style={styles.categoryRowLeft}>
                              <View style={styles.categoryDot} />
                              <Text style={styles.categoryName}>{cat}</Text>
                              <View style={styles.categoryPctBadge}>
                                <Text style={styles.categoryPctText}>{pct}%</Text>
                              </View>
                            </View>
                            <View style={styles.categoryRowRight}>
                              <Text style={styles.categoryKg}>
                                ~{Math.round(kg)} kg
                              </Text>
                            </View>
                          </View>

                          <View style={styles.categoryBarTrack}>
                            <View
                              style={[
                                styles.categoryBarFill,
                                { width: `${barPct}%` },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })() : null}

            {/* ========================================================= */}
            {/* IMPACT TIMELINE & VERIFIED ACTIONS                        */}
            {/* ========================================================= */}
            <View style={styles.cleanCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconCircle}>
                  <ShieldCheck size={18} color="#2EA86E" strokeWidth={2.2} />
                </View>
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.cardHeaderTitle}>Impact Timeline</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Verified sustainable purchases &amp; green milestones
                  </Text>
                </View>
              </View>

              {/* Summary Stats Row */}
              <View style={styles.timelineMetricsRow}>
                <View style={styles.timelineMetricBox}>
                  <Text style={styles.timelineMetricLabel}>VERIFIED ACTIONS</Text>
                  <Text style={styles.timelineMetricValue}>{verifiedActionsCount ?? "—"}</Text>
                </View>
                <View style={styles.timelineMetricBox}>
                  <Text style={styles.timelineMetricLabel}>SUSTAINABLE PURCHASES</Text>
                  <Text style={[styles.timelineMetricValue, isEvVerified && { color: "#2EA86E" }]}>
                    {sustainablePurchasesCount ?? "—"}
                  </Text>
                </View>
                <View style={styles.timelineMetricBox}>
                  <Text style={styles.timelineMetricLabel}>TOTAL REWARDS</Text>
                  <Text style={[styles.timelineMetricValue, { color: "#059669" }]}>
                    {activity.data == null
                      ? "—"
                      : `+${activity.data.reduce(
                          (total, event) => total + Math.max(0, event.points_delta),
                          0
                        )} coins`}
                  </Text>
                </View>
              </View>

              {/* Timeline list */}
              <View style={styles.timelineEventsList}>
                {isEvVerified && (
                  <View style={styles.timelineItemHighlight}>
                    <View style={styles.timelineBadgeRow}>
                      <View style={styles.timelineDateBadge}>
                        <Text style={styles.timelineDateText}>TODAY</Text>
                      </View>
                      <View style={styles.timelineVerifiedTag}>
                        <CheckCircle2 size={11} color="#059669" strokeWidth={2.4} />
                        <Text style={styles.timelineVerifiedTagText}>VERIFIED</Text>
                      </View>
                    </View>
                    <View style={styles.timelineContentRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.timelineItemTitle}>Electric Vehicle Verified</Text>
                        <Text style={styles.timelineItemSub}>
                          Major sustainable purchase · {sustainableStore.vehicleMakeModel || "Tata Nexon EV"}
                        </Text>
                        <View style={styles.achievementPill}>
                          <Zap size={11} color="#D97706" fill="#D97706" />
                          <Text style={styles.achievementPillText}>
                            ⚡ Electric Pioneer unlocked
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.timelinePointsPositive}>
                        {sustainableRewardPoints > 0
                          ? `+${sustainableRewardPoints.toLocaleString()} Karma Coins`
                          : "No new reward"}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.timelineItemNormal}>
                  <View style={styles.timelineBadgeRow}>
                    <View style={[styles.timelineDateBadge, { backgroundColor: "#F3F4F6" }]}>
                      <Text style={[styles.timelineDateText, { color: "#6B7280" }]}>YESTERDAY</Text>
                    </View>
                  </View>
                  <View style={styles.timelineContentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timelineItemTitle}>Recyclable Packaging Scan</Text>
                      <Text style={styles.timelineItemSub}>Sorted &amp; dropped at circular eco-hub</Text>
                    </View>
                    <Text style={styles.timelinePointsPositive}>+50 Karma Coins</Text>
                  </View>
                </View>

                <View style={styles.timelineItemNormal}>
                  <View style={styles.timelineBadgeRow}>
                    <View style={[styles.timelineDateBadge, { backgroundColor: "#F3F4F6" }]}>
                      <Text style={[styles.timelineDateText, { color: "#6B7280" }]}>THIS WEEK</Text>
                    </View>
                  </View>
                  <View style={styles.timelineContentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timelineItemTitle}>Solar Net Feed-in</Text>
                      <Text style={styles.timelineItemSub}>Clean power fed back to grid</Text>
                    </View>
                    <Text style={styles.timelinePointsPositive}>
                      {solarPoints === null ? "—" : `+${solarPoints} Karma Coins`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : tab === "spend" ? (
          /* ========================================================= */
          /* TAB 3: CARBON (Verified Transactions & Carbon Spend)       */
          /* ========================================================= */
          <View style={styles.cleanCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconCircle}>
                <ShoppingBag size={18} color="#2EA86E" strokeWidth={2.2} />
              </View>
              <View style={styles.cardHeaderInfo}>
                <Text style={styles.cardHeaderTitle}>
                  Recent Carbon Transactions
                </Text>
                <Text style={styles.cardHeaderSubtitle}>
                  Itemized emissions calculated from merchant spend
                </Text>
              </View>
            </View>

            <View style={styles.txnsList}>
              {(txns.data ?? []).slice(0, 12).map((t) => (
                <View key={t.id} style={styles.txnItem}>
                  <View style={styles.txnLeft}>
                    <View style={styles.txnIconWrap}>
                      <Receipt size={16} color="#059669" strokeWidth={2.2} />
                    </View>
                    <View>
                      <Text style={styles.txnMerchant}>{t.merchant}</Text>
                      <Text style={styles.txnMeta}>
                        {t.category} · {t.date}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.txnRight}>
                    <Text style={styles.txnAmount}>
                      ₹{Math.round(t.amount_inr).toLocaleString("en-IN")}
                    </Text>
                    <View style={styles.txnCarbonPill}>
                      <Text style={styles.txnCarbonText}>
                        ~{(t.amount_inr * 0.024).toFixed(1)} kg CO₂
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : tab === "financial" ? (
          /* ========================================================= */
          /* TAB 4: FINANCIAL (Economic Impact & Savings)             */
          /* ========================================================= */
          <View style={styles.cleanCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconCircle}>
                <CircleDollarSign size={18} color="#2EA86E" strokeWidth={2.2} />
              </View>
              <View style={styles.cardHeaderInfo}>
                <Text style={styles.cardHeaderTitle}>
                  Financial Dividends & Savings
                </Text>
                <Text style={styles.cardHeaderSubtitle}>
                  Estimated value created through solar & conscious habits
                </Text>
              </View>
            </View>

            <View style={styles.dividendGrid}>
              <View style={styles.dividendTile}>
                <Text style={styles.dividendTileLabel}>THIS MONTH SAVED</Text>
                <Text style={styles.dividendTileValue}>
                  ₹{Math.round(solar.data?.financial.actualSavingsInr ?? 118)}
                </Text>
                <Text style={styles.dividendTileSub}>Direct bill credit</Text>
              </View>
              <View style={styles.dividendTile}>
                <Text style={styles.dividendTileLabel}>
                  ADDITIONAL POTENTIAL
                </Text>
                <Text style={[styles.dividendTileValue, { color: "#059669" }]}>
                  ₹{Math.round(solar.data?.financial.additionalSavingsInr ?? 34)}
                </Text>
                <Text style={styles.dividendTileSub}>With load shifting</Text>
              </View>
              <View style={styles.dividendTile}>
                <Text style={styles.dividendTileLabel}>CIRCULAR SAVINGS</Text>
                <Text style={styles.dividendTileValue}>₹450</Text>
                <Text style={styles.dividendTileSub}>
                  Repair vs buying new
                </Text>
              </View>
              <View style={styles.dividendTile}>
                <Text style={styles.dividendTileLabel}>ANNUAL PROJECTED</Text>
                <Text style={[styles.dividendTileValue, { color: "#2EA86E" }]}>
                  ₹{Math.round((solar.data?.financial.actualSavingsInr ?? 118) * 12 + 4500)}
                </Text>
                <Text style={styles.dividendTileSub}>Estimated full year</Text>
              </View>
            </View>

            <View style={styles.financialNoteBox}>
              <Sparkles size={14} color="#166534" strokeWidth={2.2} />
              <Text style={styles.financialNoteText}>
                Circular living saves an average Indian household ₹14,200 annually while cutting emissions by 35%.
              </Text>
            </View>
          </View>
        ) : (
          /* ========================================================= */
          /* TAB 5: REWARDS (Full Green Rewards & Subsidy Showcase)    */
          /* ========================================================= */
          <View style={styles.rewardsTabContainer}>
            {/* Rewards Overview Card */}
            <View style={styles.cleanCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconCircle}>
                  <Award size={20} color="#059669" strokeWidth={2.2} />
                </View>
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.cardHeaderTitle}>
                    Green Rewards & Karma Coins
                  </Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Earned from verified green actions & clean energy
                  </Text>
                </View>
              </View>

              <View style={styles.rewardsBigStatRow}>
                <View>
                  <Text style={styles.rewardsBigStatNumber}>
                    {pointsBalance ?? "—"}
                  </Text>
                  <Text style={styles.rewardsBigStatLabel}>
                    Total Karma Coins Available
                  </Text>
                </View>
                <View style={styles.rewardsLevelBadge}>
                  <Text style={styles.rewardsLevelText}>
                    Level {me.data?.loop_level ?? authUser?.loop_level ?? "—"}
                  </Text>
                </View>
              </View>

              {/* Milestones checklist */}
              <View style={styles.divider} />
              <Text style={styles.milestonesSectionTitle}>
                EARNED REWARD MILESTONES
              </Text>
              <View style={styles.milestonesList}>
                {isEvVerified ? (
                  <View style={[styles.milestoneRow, styles.milestoneRowVerified]}>
                    <View style={styles.milestoneLeft}>
                      <CheckCircle2 size={15} color="#059669" strokeWidth={2.4} />
                      <View>
                        <Text style={[styles.milestoneTitle, { color: "#065F46" }]}>
                          ⚡ Electric Pioneer (EV Purchase Verified)
                        </Text>
                        <Text style={{ fontSize: 10, color: "#059669", fontFamily: "Nunito_600SemiBold" }}>
                          Major sustainable purchase · Tata Nexon EV
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.milestoneBadge, { color: "#059669", fontSize: 12 }]}>
                      {sustainableRewardPoints > 0
                        ? `+${sustainableRewardPoints.toLocaleString()} Karma Coins`
                        : "Already claimed · no new reward"}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.milestoneRow, { opacity: 0.85 }]}
                    onPress={() => router.push("/tools/verify-sustainable-purchase")}
                    activeOpacity={0.7}
                  >
                    <View style={styles.milestoneLeft}>
                      <Lock size={14} color="#7A9082" strokeWidth={2.2} />
                      <View>
                        <Text style={styles.milestoneTitle}>
                          ⚡ Electric Vehicle Purchase Verification
                        </Text>
                        <Text style={{ fontSize: 10, color: "#7A9082", fontFamily: "Nunito_400Regular" }}>
                          Reward amount calculated from the verified document
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.milestoneBadge, { color: "#7A9082" }]}>
                      Reward calculated after verification
                    </Text>
                  </TouchableOpacity>
                )}
                {(solar.data?.rewards ?? []).map((reward) => (
                  <View key={reward.label} style={styles.milestoneRow}>
                    <View style={styles.milestoneLeft}>
                      <Check size={14} color="#059669" strokeWidth={2.4} />
                      <Text style={styles.milestoneTitle}>
                        {reward.label}
                      </Text>
                    </View>
                    <Text style={styles.milestoneBadge}>
                      +{reward.points} Karma Coins
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.rewardsOffersCta}
                onPress={() => router.push("/offers")}
                activeOpacity={0.85}
              >
                <Text style={styles.rewardsOffersCtaText}>
                  Explore Government Subsidies & Coupons
                </Text>
                <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* Bottom Navigation Buttons                                 */}
        {/* ========================================================= */}
        <View style={styles.bottomButtonsRow}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push("/map?type=recycling")}
            activeOpacity={0.8}
          >
            <MapPin size={15} color="#183222" strokeWidth={2.2} />
            <Text style={styles.secondaryBtnText}>Find Recycling Hub</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/offers")}
            activeOpacity={0.8}
          >
            <Tag size={15} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.primaryBtnText}>Redeem Rewards</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  header: {
    marginBottom: 2,
  },
  headerTopRow: {
    marginBottom: 10,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(46,168,110,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  headerBadgeText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: "#047857",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    marginTop: 2,
    lineHeight: 18,
  },

  // Persistent Rewards Persuasion Bar (Always Visible)
  rewardsPersuasionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.22)",
    boxShadow: "0px 2px 6px rgba(5,150,105,0.04)",
    elevation: 2,
  },
  rewardsBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rewardsCoinIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
  },
  rewardsBarMeta: {
    flex: 1,
  },
  rewardsPointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  rewardsPointsVal: {
    fontSize: 17,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
  },
  rewardsPointsLabel: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#B45309",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(234,88,12,0.2)",
  },
  streakText: {
    fontSize: 9,
    fontFamily: "Nunito_800ExtraBold",
    color: "#C2410C",
  },
  rewardsSubCopy: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    marginTop: 1,
  },
  rewardsBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D1811",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  rewardsBarBtnText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },

  // Category Filter Pills
  pillsContainer: {
    gap: 8,
    paddingVertical: 2,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.2)",
  },
  pillActive: {
    backgroundColor: "#0D1811",
    borderColor: "#0D1811",
  },
  pillText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#526658",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },

  // Clean White Card (Offers Style)
  cleanCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
    elevation: 2,
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.2)",
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  cardHeaderSubtitle: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    marginTop: 1,
  },

  // Stat Tiles Row (Overview)
  statTilesRow: {
    flexDirection: "row",
    gap: 8,
  },
  statTileCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
    boxShadow: "0px 2px 6px rgba(0,0,0,0.04)",
    elevation: 1,
  },
  statTileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statTileDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statTileLabel: {
    fontSize: 9,
    fontFamily: "Nunito_800ExtraBold",
    color: "#7A9082",
    letterSpacing: 0.6,
  },
  statTileValue: {
    fontSize: 18,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#2EA86E",
    marginTop: 4,
  },
  statTileUnit: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#7A9082",
  },
  statTileSub: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    marginTop: 2,
  },

  // Category Drill-Down
  categoryCountBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.2)",
  },
  categoryCountText: {
    fontSize: 10.5,
    fontFamily: "Nunito_700Bold",
    color: "#059669",
  },
  categoryList: {
    gap: 8,
  },
  categoryRow: {
    backgroundColor: "#F8FAF9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5ECE8",
    gap: 6,
  },
  categoryRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2EA86E",
  },
  categoryName: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
  categoryPctBadge: {
    backgroundColor: "rgba(46,168,110,0.12)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  categoryPctText: {
    fontSize: 9.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
  },
  categoryRowRight: {},
  categoryKg: {
    fontSize: 12,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#059669",
  },
  categoryBarTrack: {
    height: 4,
    backgroundColor: "#E5ECE8",
    borderRadius: 2,
    overflow: "hidden",
    width: "100%",
  },
  categoryBarFill: {
    height: "100%",
    backgroundColor: "#2EA86E",
    borderRadius: 2,
  },

  // Transactions List (Carbon tab)
  txnsList: {
    gap: 10,
  },
  txnItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAF9",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },
  txnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  txnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.2)",
  },
  txnMerchant: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#0D1811",
  },
  txnMeta: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
    marginTop: 1,
  },
  txnRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  txnAmount: {
    fontSize: 13,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
  },
  txnCarbonPill: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txnCarbonText: {
    fontSize: 9.5,
    fontFamily: "Nunito_700Bold",
    color: "#166534",
  },

  // Financial Dividends
  dividendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dividendTile: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#F8FAF9",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },
  dividendTileLabel: {
    fontSize: 9,
    fontFamily: "Nunito_800ExtraBold",
    color: "#7A9082",
    letterSpacing: 0.6,
  },
  dividendTileValue: {
    fontSize: 18,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
    marginTop: 4,
  },
  dividendTileSub: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    marginTop: 2,
  },
  financialNoteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.2)",
  },
  financialNoteText: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#166534",
    flex: 1,
    lineHeight: 15,
  },

  // Rewards Tab
  rewardsTabContainer: {
    gap: 14,
  },
  rewardsBigStatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.25)",
  },
  rewardsBigStatNumber: {
    fontSize: 32,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
  },
  rewardsBigStatLabel: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#059669",
    marginTop: 2,
  },
  rewardsLevelBadge: {
    backgroundColor: "#0D1811",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rewardsLevelText: {
    fontSize: 11,
    fontFamily: "Nunito_800ExtraBold",
    color: "#5EEAD4",
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  milestonesSectionTitle: {
    fontSize: 10,
    fontFamily: "Nunito_800ExtraBold",
    color: "#7A9082",
    letterSpacing: 0.8,
  },
  milestonesList: {
    gap: 8,
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAF9",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },
  milestoneLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
  milestoneBadge: {
    fontSize: 11,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#059669",
  },
  rewardsOffersCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D1811",
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  rewardsOffersCtaText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },

  // Bottom Buttons
  bottomButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.25)",
  },
  secondaryBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0D1811",
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },

  // Impact Timeline & Milestones Styles
  timelineMetricsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  timelineMetricBox: {
    flex: 1,
    backgroundColor: "#F8FAF9",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5ECE8",
    alignItems: "center",
  },
  timelineMetricLabel: {
    fontSize: 8,
    letterSpacing: 0.6,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#7A9082",
    marginBottom: 4,
    textAlign: "center",
  },
  timelineMetricValue: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    color: "#183222",
  },
  timelineEventsList: {
    gap: 10,
  },
  timelineItemHighlight: {
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  timelineItemNormal: {
    backgroundColor: "#F8FAF9",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },
  timelineBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  timelineDateBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timelineDateText: {
    fontSize: 9,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#065F46",
    letterSpacing: 0.5,
  },
  timelineVerifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(5,150,105,0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timelineVerifiedTagText: {
    fontSize: 9,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#059669",
  },
  timelineContentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  timelineItemTitle: {
    fontSize: 14,
    fontFamily: "Nunito_800ExtraBold",
    color: "#183222",
  },
  timelineItemSub: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#6C8375",
    marginTop: 2,
  },
  timelinePointsPositive: {
    fontSize: 13,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
  },
  achievementPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    backgroundColor: "#FEF3C7",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  achievementPillText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#92400E",
  },
  milestoneRowVerified: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
});
