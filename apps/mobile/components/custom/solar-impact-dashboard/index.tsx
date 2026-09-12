import React, { useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Sun,
  Zap,
  Leaf,
  BatteryCharging,
  Clock,
  Check,
  Sparkles,
  Award,
  CircleDollarSign,
  Coins,
  Gauge,
  ArrowRight,
  TrendingUp,
  Gift,
} from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { SolarPanelHero } from "@/components/custom/solar-panel-hero";
import type {
  SolarImpactResponse,
  SolarRecommendationStatus,
} from "@/src/types/api";
import { useSolarRecommendationActions } from "@/src/hooks/queries";

export function SolarImpactDashboard({ data }: { data: SolarImpactResponse }) {
  const [statuses, setStatuses] = useState<
    Record<string, SolarRecommendationStatus>
  >({});
  const actions = useSolarRecommendationActions();

  const recommendations = useMemo(
    () =>
      data.recommendations.map((item) => ({
        ...item,
        status: statuses[item.id] ?? item.status,
      })),
    [data.recommendations, statuses]
  );

  const handleStatusChange = (
    id: string,
    nextStatus: SolarRecommendationStatus
  ) => {
    setStatuses((current) => ({ ...current, [id]: nextStatus }));
    if (nextStatus === "accepted") actions.accept.mutate(id);
    if (nextStatus === "completed") actions.complete.mutate(id);
  };

  const score = Math.max(0, Math.min(100, Math.round(data.solarScore)));
  const totalPoints = data.rewards.reduce((sum, r) => sum + r.points, 0);
  const pendingPoints = recommendations
    .filter((r) => r.status !== "completed")
    .reduce((sum, r) => sum + r.points, 0);

  // Comparison values
  const { current, optimized } = data.comparison;
  const usedGain = Math.max(0, optimized.usedKwh - current.usedKwh);
  const selfUseGain = Math.max(
    0,
    optimized.selfConsumptionPct - current.selfConsumptionPct
  );
  const additionalSavings = Math.max(0, data.comparison.additionalSavingsInr);
  const maxUsed = Math.max(current.generatedKwh, optimized.generatedKwh, 1);

  return (
    <View style={styles.container}>
      {/* ========================================================= */}
      {/* 1. HERO SOLAR TELEMETRY BANNER (With Prominent Points)    */}
      {/* ========================================================= */}
      <LinearGradient
        colors={["#0C2518", "#143C28", "#0B1D14"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroGlowOrb} />

        {/* Top Header Row with Points Spotlight */}
        <View style={styles.heroHeaderRow}>
          <View style={styles.heroPill}>
            <Sun size={13} color="#5EEAD4" strokeWidth={2.4} />
            <Text style={styles.heroPillText}>SOLAR TELEMETRY</Text>
          </View>
          <View style={styles.heroPointsBadge}>
            <Coins size={13} color="#FBBF24" strokeWidth={2.4} />
            <Text style={styles.heroPointsBadgeText}>+{totalPoints} Karma Coins Earned</Text>
          </View>
        </View>

        {/* Big Generation Metric */}
        <View style={styles.balanceRow}>
          <Text style={styles.balanceNumber}>
            {data.generatedKwh.toFixed(1)}
          </Text>
          <View style={styles.balanceMeta}>
            <Text style={styles.balanceUnit}>kWh Generated Today</Text>
            <Text style={styles.balanceSubtext}>
              {data.location} · {data.systemSizeKw} kW Rooftop
            </Text>
          </View>
        </View>

        {/* 3-Column Stats Row */}
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>
              {data.selfConsumptionPct.toFixed(0)}%
            </Text>
            <Text style={styles.heroStatLabel}>Used at Home</Text>
            <Text style={styles.heroStatSub}>
              {data.consumedKwh.toFixed(1)} kWh direct
            </Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>
              {data.exportedKwh.toFixed(1)} kWh
            </Text>
            <Text style={styles.heroStatLabel}>Sent to Grid</Text>
            <Text style={styles.heroStatSub}>
              ₹{Math.round(data.exportedKwh * (data.financial.tariffInrPerKwh || 4.5))} credit
            </Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>
              {data.co2AvoidedKg.toFixed(1)} kg
            </Text>
            <Text style={styles.heroStatLabel}>CO₂ Avoided</Text>
            <Text style={styles.heroStatSub}>
              {data.solarContributionPct.toFixed(0)}% clean mix
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ========================================================= */}
      {/* 2. REWARDS & POINTS SPOTLIGHT (Placed ABOVE for Persuasion)*/}
      {/* ========================================================= */}
      <View style={styles.rewardsSpotlightCard}>
        {/* Top Header Row: Category Badge on Left, Waiting Points on Right */}
        <View style={styles.spotlightTopRow}>
          <View style={styles.spotlightCategoryTag}>
            <Award size={13} color="#059669" strokeWidth={2.4} />
            <Text style={styles.spotlightCategoryText}>DAILY GREEN REWARDS</Text>
          </View>

          {pendingPoints > 0 ? (
            <View style={styles.pendingPointsPill}>
              <Sparkles size={11} color="#B45309" strokeWidth={2.4} />
              <Text style={styles.pendingPointsText}>
                +{pendingPoints} Karma Coins Waiting
              </Text>
            </View>
          ) : (
            <View style={styles.allClaimedPill}>
              <Check size={11} color="#059669" strokeWidth={2.4} />
              <Text style={styles.allClaimedText}>All Claimed</Text>
            </View>
          )}
        </View>

        {/* Main Metric Row: Icon + Large Points + Subtitle */}
        <View style={styles.spotlightMainRow}>
          <View style={styles.rewardsIconWrap}>
            <Coins size={22} color="#059669" strokeWidth={2.4} />
          </View>
          <View style={styles.spotlightMainInfo}>
            <View style={styles.spotlightPointsRow}>
              <Text style={styles.rewardsBigPoints}>+{totalPoints}</Text>
              <Text style={styles.rewardsPointsUnit}>Karma Coins Today</Text>
            </View>
            <Text style={styles.rewardsSpotlightSub}>
              Liquid reward currency · Redeemable on Offers tab
            </Text>
          </View>
        </View>

        {/* Milestone checklist row (wrapping cleanly to prevent ellipsis truncation) */}
        <View style={styles.milestonesRow}>
          {data.rewards.slice(0, 3).map((r) => (
            <View key={r.label} style={styles.milestoneItem}>
              <View style={styles.milestoneDot} />
              <Text style={styles.milestoneLabel}>
                {r.label}
              </Text>
              <Text style={styles.milestonePts}>+{r.points} coins</Text>
            </View>
          ))}
        </View>

        {/* Motivational nudge */}
        <View style={styles.rewardsNudgeBox}>
          <Gift size={14} color="#166534" strokeWidth={2.2} />
          <Text style={styles.rewardsNudgeText}>
            Complete the smart actions below to unlock +{pendingPoints || 40} more Karma Coins immediately!
          </Text>
        </View>
      </View>

      {/* ========================================================= */}
      {/* 3. SOLAR POWER IN MOTION (Animated Isometric Flow)        */}
      {/* ========================================================= */}
      <SolarPanelHero data={data} />

      {/* ========================================================= */}
      {/* 4. SMART SOLAR ACTIONS (Points Highlighted Above Title)   */}
      {/* ========================================================= */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Smart Solar Actions</Text>
          <Text style={styles.sectionSubtitle}>
            Act now during peak sunlight to earn immediate Karma Coins
          </Text>
        </View>
      </View>

      <View style={styles.recommendationsList}>
        {recommendations.map((item) => {
          const isDone = item.status === "completed";
          const isAccepted =
            item.status === "accepted" || item.status === "in_progress";

          return (
            <View key={item.id} style={styles.actionCard}>
              {/* Card Header: Category Badge + High-Impact Points Rewarded Above */}
              <View style={styles.actionCardHeader}>
                <View style={styles.actionCategoryBadge}>
                  <Sun size={11} color="#047857" strokeWidth={2.4} />
                  <Text style={styles.actionCategoryBadgeText}>
                    SMART TIMING
                  </Text>
                </View>

                {/* Points Rewarded Placed Above for Persuasion */}
                <View style={styles.actionPointsPillTop}>
                  <Coins size={12} color="#B45309" strokeWidth={2.4} />
                  <Text style={styles.actionPointsTextTop}>
                    +{item.points} KARMA COINS
                  </Text>
                </View>
              </View>

              {/* Card Body */}
              <View style={styles.actionBody}>
                <View style={styles.actionRewardHeadlineRow}>
                  <Text style={styles.actionPerk}>
                    Earn +{item.points} Karma Coins · Save ₹{Math.round(item.expectedSavingsInr)}
                  </Text>
                  {isDone ? (
                    <View style={styles.statusBadgeDone}>
                      <Check size={10} color="#059669" strokeWidth={2.4} />
                      <Text style={styles.statusBadgeDoneText}>COMPLETED</Text>
                    </View>
                  ) : isAccepted ? (
                    <View style={styles.statusBadgeAccepted}>
                      <Clock size={10} color="#B45309" strokeWidth={2.2} />
                      <Text style={styles.statusBadgeAcceptedText}>IN PROGRESS</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.actionTitle}>{item.title}</Text>
                <Text style={styles.actionDescription}>{item.body}</Text>

                {/* Timing Highlight Pill (Offers Style) */}
                <View style={styles.actionTimePill}>
                  <Clock size={12} color="#166534" strokeWidth={2.2} />
                  <Text style={styles.actionTimePillText}>
                    Peak Window: {item.window} · Avoids {item.co2AvoidedKg.toFixed(1)} kg CO₂
                  </Text>
                </View>
              </View>

              {/* Card Footer: Action Button */}
              <View style={styles.actionFooter}>
                <View style={styles.actionSavingsPill}>
                  <Leaf size={13} color="#059669" strokeWidth={2.2} />
                  <Text style={styles.actionSavingsText}>
                    Saves ₹{Math.round(item.expectedSavingsInr)} today
                  </Text>
                </View>

                {isDone ? (
                  <View style={styles.actionBtnDone}>
                    <Check size={13} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.actionBtnTextDone}>Karma Coins Claimed ✓</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      isAccepted ? styles.actionBtnAccepted : null,
                    ]}
                    onPress={() =>
                      handleStatusChange(
                        item.id,
                        isAccepted ? "completed" : "accepted"
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>
                      {isAccepted
                        ? `Complete for +${item.points} Karma Coins`
                        : `Claim +${item.points} Karma Coins`}
                    </Text>
                    <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.2} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* ========================================================= */}
      {/* 5. PERFORMANCE & SMART TIMING                             */}
      {/* ========================================================= */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Performance & Dividends</Text>
          <Text style={styles.sectionSubtitle}>
            Self-consumption metrics, load shifting, and rupee savings
          </Text>
        </View>
      </View>

      {/* Card A: Load Shifting & Optimization */}
      <View style={styles.cleanCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconCircle}>
            <BatteryCharging size={18} color="#2EA86E" strokeWidth={2.2} />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardHeaderTitle}>Smart Load Shifting</Text>
            <Text style={styles.cardHeaderSubtitle}>
              Compare your typical pattern vs shifting flexible loads
            </Text>
          </View>
        </View>

        {/* Dual Comparison Columns */}
        <View style={styles.compareColsRow}>
          {/* Current Column */}
          <View style={styles.compareColCurrent}>
            <Text style={styles.compareColLabel}>Current Use</Text>
            <Text style={styles.compareColSub}>Typical pattern</Text>
            <Text style={styles.compareColPercentCurrent}>
              {current.selfConsumptionPct.toFixed(0)}%
            </Text>
            <View style={styles.progressBarBgCurrent}>
              <View
                style={[
                  styles.progressBarFillCurrent,
                  {
                    width: `${Math.min(100, Math.max(10, (current.usedKwh / maxUsed) * 100))}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.compareColDetails}>
              <Text style={styles.compareDetailText}>
                {current.usedKwh.toFixed(1)} kWh local
              </Text>
              <Text style={styles.compareDetailTextMuted}>
                {current.exportedKwh.toFixed(1)} kWh grid
              </Text>
            </View>
          </View>

          {/* Optimized Column */}
          <View style={styles.compareColOptimized}>
            <Text style={styles.compareColLabelOpt}>Smart Timing</Text>
            <Text style={styles.compareColSubOpt}>Flexible loads shifted</Text>
            <Text style={styles.compareColPercentOpt}>
              {optimized.selfConsumptionPct.toFixed(0)}%
            </Text>
            <View style={styles.progressBarBgOpt}>
              <View
                style={[
                  styles.progressBarFillOpt,
                  {
                    width: `${Math.min(100, Math.max(10, (optimized.usedKwh / maxUsed) * 100))}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.compareColDetails}>
              <Text style={styles.compareDetailTextOpt}>
                {optimized.usedKwh.toFixed(1)} kWh local
              </Text>
              <Text style={styles.compareDetailTextMuted}>
                {optimized.exportedKwh.toFixed(1)} kWh grid
              </Text>
            </View>
          </View>
        </View>

        {/* Highlight Callout Box (Offers Style) */}
        <View style={styles.impactHighlightBox}>
          <Leaf size={14} color="#166534" strokeWidth={2.2} />
          <Text style={styles.impactHighlightText}>
            +{usedGain.toFixed(1)} kWh home use · Save ₹{additionalSavings.toFixed(0)} more by shifting EV & laundry into midday.
          </Text>
        </View>
      </View>

      {/* Card B: Financial & Environmental Dividends (2x2 Grid) */}
      <View style={styles.cleanCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconCircle}>
            <CircleDollarSign size={18} color="#2EA86E" strokeWidth={2.2} />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardHeaderTitle}>Financial & Environmental Dividends</Text>
            <Text style={styles.cardHeaderSubtitle}>
              Clean power economic value & avoided emissions
            </Text>
          </View>
        </View>

        <View style={styles.dividendGrid}>
          {/* Tile 1 */}
          <View style={styles.dividendTile}>
            <Text style={styles.dividendTileLabel}>ACTUAL SAVINGS</Text>
            <Text style={styles.dividendTileValue}>
              ₹{Math.round(data.financial.actualSavingsInr)}
            </Text>
            <Text style={styles.dividendTileSub}>Current cycle savings</Text>
          </View>

          {/* Tile 2 */}
          <View style={styles.dividendTile}>
            <Text style={styles.dividendTileLabel}>POSSIBLE WITH TIMING</Text>
            <Text style={[styles.dividendTileValue, { color: "#059669" }]}>
              ₹{Math.round(data.financial.optimizedSavingsInr)}
            </Text>
            <Text style={styles.dividendTileSub}>
              +₹{Math.round(data.financial.additionalSavingsInr)} additional
            </Text>
          </View>

          {/* Tile 3 */}
          <View style={styles.dividendTile}>
            <Text style={styles.dividendTileLabel}>CLEAN POWER USED</Text>
            <Text style={styles.dividendTileValue}>
              {data.consumedKwh.toFixed(1)} kWh
            </Text>
            <Text style={styles.dividendTileSub}>Direct from rooftop</Text>
          </View>

          {/* Tile 4 */}
          <View style={styles.dividendTile}>
            <Text style={styles.dividendTileLabel}>GRID CO₂ AVOIDED</Text>
            <Text style={[styles.dividendTileValue, { color: "#2EA86E" }]}>
              {data.co2AvoidedKg.toFixed(1)} kg
            </Text>
            <Text style={styles.dividendTileSub}>Avoided thermal grid</Text>
          </View>
        </View>

        <Text style={styles.tariffFootnote}>
          Calculated using empanelled DISCOM tariff rate ₹{data.financial.tariffInrPerKwh}/kWh
        </Text>
      </View>

      {/* ========================================================= */}
      {/* 6. TIMELINE OF SOLAR EVENTS                               */}
      {/* ========================================================= */}
      <View style={styles.cleanCard}>
        <Text style={styles.timelineHeading}>TODAY’S SOLAR ACTIVITY</Text>
        <View style={styles.timelineList}>
          {data.timeline.map((event, index) => (
            <View
              key={`${event.time}-${event.title}`}
              style={styles.timelineRow}
            >
              <View style={styles.timelineDotWrap}>
                <View style={styles.timelineDot} />
                {index < data.timeline.length - 1 ? (
                  <View style={styles.timelineLine} />
                ) : null}
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.timelineTime}>{event.time}</Text>
                  {event.points ? (
                    <Text style={styles.timelinePoints}>
                      +{event.points} coins
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.timelineTitle}>{event.title}</Text>
                <Text style={styles.timelineDetail}>{event.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },

  // Hero Banner (Exact Offers Style)
  heroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.25)",
    overflow: "hidden",
    position: "relative",
    boxShadow: "0px 8px 16px rgba(5,150,105,0.15)",
    elevation: 6,
  },
  heroGlowOrb: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(46,168,110,0.18)",
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(46,168,110,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroPillText: {
    fontSize: 10,
    fontFamily: "Nunito_800ExtraBold",
    color: "#5EEAD4",
    letterSpacing: 0.8,
  },
  heroPointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(251,191,36,0.18)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
  },
  heroPointsBadgeText: {
    fontSize: 11,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FBBF24",
    letterSpacing: 0.3,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 18,
  },
  balanceNumber: {
    fontSize: 42,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  balanceMeta: {
    gap: 2,
    flex: 1,
  },
  balanceUnit: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#5EEAD4",
  },
  balanceSubtext: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "rgba(255,255,255,0.5)",
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 14,
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroStatValue: {
    fontSize: 15,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#FFFFFF",
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  heroStatSub: {
    fontSize: 9,
    fontFamily: "Nunito_600SemiBold",
    color: "#5EEAD4",
    marginTop: 1,
  },

  // Rewards Spotlight Card (High-Persuasion Placed Above)
  rewardsSpotlightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.22)",
    boxShadow: "0px 2px 8px rgba(5,150,105,0.05)",
    elevation: 2,
    gap: 12,
  },
  spotlightTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  spotlightCategoryTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.2)",
  },
  spotlightCategoryText: {
    fontSize: 9.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
    letterSpacing: 0.5,
  },
  pendingPointsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4.5,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  pendingPointsText: {
    fontSize: 10.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#B45309",
    letterSpacing: 0.2,
  },
  allClaimedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.25)",
  },
  allClaimedText: {
    fontSize: 10.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
  },
  spotlightMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rewardsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.25)",
  },
  spotlightMainInfo: {
    flex: 1,
  },
  spotlightPointsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
  },
  rewardsBigPoints: {
    fontSize: 26,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
  },
  rewardsPointsUnit: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#059669",
  },
  rewardsSpotlightSub: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    marginTop: 1,
  },
  milestonesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 10,
  },
  milestoneItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAF9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },
  milestoneDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#2EA86E",
  },
  milestoneLabel: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#183222",
  },
  milestonePts: {
    fontSize: 10.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#059669",
  },
  rewardsNudgeBox: {
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
  rewardsNudgeText: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#166534",
    flex: 1,
    lineHeight: 15,
  },

  // Section Headers
  sectionHeader: {
    marginTop: 4,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    marginTop: 1,
  },

  // Clean White Cards
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

  // Dual Comparison Columns
  compareColsRow: {
    flexDirection: "row",
    gap: 10,
  },
  compareColCurrent: {
    flex: 1,
    backgroundColor: "#F8FAF9",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },
  compareColLabel: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#0D1811",
  },
  compareColSub: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
    marginTop: 1,
  },
  compareColPercentCurrent: {
    fontSize: 22,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#2D4236",
    marginTop: 8,
  },
  progressBarBgCurrent: {
    height: 6,
    backgroundColor: "#E2EAE5",
    borderRadius: 3,
    overflow: "hidden",
    marginVertical: 8,
  },
  progressBarFillCurrent: {
    height: "100%",
    backgroundColor: "#7A9082",
    borderRadius: 3,
  },
  compareColDetails: {
    gap: 2,
  },
  compareDetailText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
  compareDetailTextMuted: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
  },

  compareColOptimized: {
    flex: 1,
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.3)",
  },
  compareColLabelOpt: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#047857",
  },
  compareColSubOpt: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#059669",
    marginTop: 1,
  },
  compareColPercentOpt: {
    fontSize: 22,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#2EA86E",
    marginTop: 8,
  },
  progressBarBgOpt: {
    height: 6,
    backgroundColor: "#DCFCE7",
    borderRadius: 3,
    overflow: "hidden",
    marginVertical: 8,
  },
  progressBarFillOpt: {
    height: "100%",
    backgroundColor: "#2EA86E",
    borderRadius: 3,
  },
  compareDetailTextOpt: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#047857",
  },

  // Impact Highlight Box (Offers Style)
  impactHighlightBox: {
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
  impactHighlightText: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#166534",
    flex: 1,
    lineHeight: 15,
  },

  // Dividends 2x2 Grid
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
  tariffFootnote: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
    textAlign: "center",
  },

  // Smart Solar Action Cards (Offers Coupon Style)
  recommendationsList: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
    elevation: 2,
  },
  actionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  actionCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(4,120,87,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  actionCategoryBadgeText: {
    fontSize: 9,
    fontFamily: "Nunito_700Bold",
    color: "#047857",
    letterSpacing: 0.5,
  },
  actionPointsPillTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  actionPointsTextTop: {
    fontSize: 9.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#B45309",
    letterSpacing: 0.4,
  },
  actionBody: {
    marginBottom: 12,
  },
  actionRewardHeadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  actionPerk: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    lineHeight: 20,
    flex: 1,
  },
  statusBadgeDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeDoneText: {
    fontSize: 8.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
  },
  statusBadgeAccepted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeAcceptedText: {
    fontSize: 8.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#B45309",
  },
  actionTitle: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
    marginTop: 2,
  },
  actionDescription: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    lineHeight: 16,
    marginTop: 4,
  },
  actionTimePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  actionTimePillText: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#166534",
  },

  actionFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 10,
  },
  actionSavingsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionSavingsText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#059669",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0D1811",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  actionBtnAccepted: {
    backgroundColor: "#047857",
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  actionBtnDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  actionBtnTextDone: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },

  // Timeline
  timelineHeading: {
    fontSize: 10,
    fontFamily: "Nunito_800ExtraBold",
    color: "#7A9082",
    letterSpacing: 0.8,
  },
  timelineList: {
    gap: 12,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 10,
  },
  timelineDotWrap: {
    alignItems: "center",
    width: 14,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2EA86E",
    marginTop: 3,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: "rgba(46,168,110,0.25)",
    marginVertical: 3,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timelineTime: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: "#059669",
  },
  timelinePoints: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: "#B45309",
  },
  timelineTitle: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#0D1811",
    marginTop: 1,
  },
  timelineDetail: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    marginTop: 1,
  },
});
