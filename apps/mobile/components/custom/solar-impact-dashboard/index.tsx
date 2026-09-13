import React, { useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  Coins,
  Clock,
  Check,
  Sparkles,
  ArrowRight,
  Leaf,
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

  const totalPoints = data.rewards.reduce((sum, r) => sum + r.points, 0);
  const pendingPoints = recommendations
    .filter((r) => r.status !== "completed")
    .reduce((sum, r) => sum + r.points, 0);

  // Comparison values
  const { current, optimized } = data.comparison;
  const usedGain = Math.max(0, optimized.usedKwh - current.usedKwh);
  const additionalSavings = Math.max(0, data.comparison.additionalSavingsInr);
  const maxUsed = Math.max(current.generatedKwh, optimized.generatedKwh, 1);

  return (
    <View style={styles.container}>
      {/* ========================================================= */}
      {/* 1. HERO SOLAR TELEMETRY BANNER (No Pill Boxes)            */}
      {/* ========================================================= */}
      <LinearGradient
        colors={["#0C2518", "#143C28", "#0B1D14"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroGlowOrb} />

        {/* Header Row: Quiet Eyebrow + Clean Inline Points */}
        <View style={styles.heroHeaderRow}>
          <Text style={styles.heroEyebrow}>ROOFTOP SOLAR</Text>
          <View style={styles.heroPointsWrap}>
            <Coins size={13} color="#FBBF24" strokeWidth={2.4} />
            <Text style={styles.heroPointsText}>
              +{totalPoints} Coins
            </Text>
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
      {/* 2. REWARDS BREAKDOWN (Clean Frosted Glass Card)            */}
      {/* ========================================================= */}
      <View style={styles.glassCard}>
        <BlurView
          intensity={Platform.OS === "ios" ? 50 : 85}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(255,255,255,0.78)", "rgba(255,255,255,0.42)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardTitle}>Daily Green Rewards</Text>
            <Text style={styles.cardSubtitle}>
              Milestones from solar telemetry & clean routine
            </Text>
          </View>
          {pendingPoints > 0 ? (
            <View style={styles.waitingWrap}>
              <Sparkles size={12} color="#D97706" strokeWidth={2.2} />
              <Text style={styles.waitingText}>
                +{pendingPoints} coins waiting
              </Text>
            </View>
          ) : (
            <View style={styles.allClaimedWrap}>
              <Check size={12} color="#059669" strokeWidth={2.4} />
              <Text style={styles.allClaimedText}>All Claimed</Text>
            </View>
          )}
        </View>

        {/* Milestone checklist items */}
        <View style={styles.milestoneList}>
          {data.rewards.map((r, idx) => (
            <View
              key={r.label}
              style={[
                styles.milestoneRow,
                idx < data.rewards.length - 1 && styles.milestoneRowBorder,
              ]}
            >
              <View style={styles.milestoneRowLeft}>
                <Check size={13} color="#059669" strokeWidth={2.4} />
                <Text style={styles.milestoneLabel}>{r.label}</Text>
              </View>
              <Text style={styles.milestonePoints}>+{r.points} coins</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ========================================================= */}
      {/* 3. SOLAR POWER IN MOTION (Isometric Animated Flow)        */}
      {/* ========================================================= */}
      <SolarPanelHero data={data} />

      {/* ========================================================= */}
      {/* 4. SMART SOLAR ACTIONS (No Pill Boxes)                    */}
      {/* ========================================================= */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Smart Solar Actions</Text>
        <Text style={styles.sectionSubtitle}>
          Act during peak sunlight to earn immediate Karma Coins
        </Text>
      </View>

      <View style={styles.recommendationsList}>
        {recommendations.map((item) => {
          const isDone = item.status === "completed";
          const isAccepted =
            item.status === "accepted" || item.status === "in_progress";

          return (
            <View key={item.id} style={styles.actionCard}>
              <BlurView
                intensity={Platform.OS === "ios" ? 50 : 85}
                tint="light"
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={["rgba(255,255,255,0.82)", "rgba(255,255,255,0.45)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              {/* Action Top Header: Eyebrow + Clean Inline Points */}
              <View style={styles.actionCardHeader}>
                <Text style={styles.actionEyebrow}>SMART TIMING</Text>
                <View style={styles.actionGoldWrap}>
                  <Coins size={12} color="#D97706" strokeWidth={2.4} />
                  <Text style={styles.actionGoldText}>
                    +{item.points} COINS
                  </Text>
                </View>
              </View>

              {/* Action Body */}
              <View style={styles.actionBody}>
                <Text style={styles.actionPerk}>
                  Earn +{item.points} Coins · Save ₹{Math.round(item.expectedSavingsInr)}
                </Text>
                <Text style={styles.actionTitle}>{item.title}</Text>
                <Text style={styles.actionDescription}>{item.body}</Text>

                {/* Quiet Peak Window Metadata */}
                <View style={styles.actionMetaRow}>
                  <Clock size={12} color="#64748B" strokeWidth={2} />
                  <Text style={styles.actionMetaText}>
                    Window: {item.window} · Avoids {item.co2AvoidedKg.toFixed(1)} kg CO₂
                  </Text>
                </View>
              </View>

              {/* Action Footer */}
              <View style={styles.actionFooter}>
                <View style={styles.actionSavingsWrap}>
                  <Leaf size={13} color="#059669" strokeWidth={2.2} />
                  <Text style={styles.actionSavingsText}>
                    Saves ₹{Math.round(item.expectedSavingsInr)} today
                  </Text>
                </View>

                {isDone ? (
                  <View style={styles.actionBtnDone}>
                    <Check size={13} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.actionBtnTextDone}>Claimed ✓</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      isAccepted && styles.actionBtnAccepted,
                    ]}
                    onPress={() =>
                      handleStatusChange(
                        item.id,
                        isAccepted ? "completed" : "accepted"
                      )
                    }
                    activeOpacity={0.82}
                  >
                    <Text style={styles.actionBtnText}>
                      {isAccepted
                        ? `Complete for +${item.points} Coins`
                        : `Claim +${item.points} Coins`}
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
      {/* 5. PERFORMANCE & DIVIDENDS                                */}
      {/* ========================================================= */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Performance & Dividends</Text>
        <Text style={styles.sectionSubtitle}>
          Self-consumption metrics, load shifting, and rupee savings
        </Text>
      </View>

      {/* Card A: Smart Load Shifting */}
      <View style={styles.glassCard}>
        <BlurView
          intensity={Platform.OS === "ios" ? 50 : 85}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(255,255,255,0.78)", "rgba(255,255,255,0.42)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardTitle}>Smart Load Shifting</Text>
            <Text style={styles.cardSubtitle}>
              Typical pattern vs shifting flexible loads
            </Text>
          </View>
        </View>

        {/* Dual Comparison Columns */}
        <View style={styles.compareColsRow}>
          {/* Current Column */}
          <View style={styles.compareCol}>
            <Text style={styles.compareColLabel}>Current Use</Text>
            <Text style={styles.compareColSub}>Typical pattern</Text>
            <Text style={styles.compareColPercent}>
              {current.selfConsumptionPct.toFixed(0)}%
            </Text>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: "#94A3B8",
                    width: `${Math.min(100, Math.max(8, (current.usedKwh / maxUsed) * 100))}%`,
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
          <View style={styles.compareCol}>
            <Text style={[styles.compareColLabel, styles.compareColLabelOpt]}>
              Smart Timing
            </Text>
            <Text style={styles.compareColSub}>Flexible loads shifted</Text>
            <Text style={[styles.compareColPercent, styles.compareColPercentOpt]}>
              {optimized.selfConsumptionPct.toFixed(0)}%
            </Text>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: "#2EA86E",
                    width: `${Math.min(100, Math.max(8, (optimized.usedKwh / maxUsed) * 100))}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.compareColDetails}>
              <Text style={[styles.compareDetailText, styles.compareDetailTextOpt]}>
                {optimized.usedKwh.toFixed(1)} kWh local
              </Text>
              <Text style={styles.compareDetailTextMuted}>
                {optimized.exportedKwh.toFixed(1)} kWh grid
              </Text>
            </View>
          </View>
        </View>

        {/* Quiet Highlight Text */}
        <Text style={styles.loadShiftSummary}>
          +{usedGain.toFixed(1)} kWh direct home use · Save ₹{additionalSavings.toFixed(0)} more by shifting EV & laundry into midday.
        </Text>
      </View>

      {/* Card B: Financial & Environmental Dividends */}
      <View style={styles.glassCard}>
        <BlurView
          intensity={Platform.OS === "ios" ? 50 : 85}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(255,255,255,0.78)", "rgba(255,255,255,0.42)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardTitle}>Financial & Environmental Dividends</Text>
            <Text style={styles.cardSubtitle}>
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
      <View style={styles.glassCard}>
        <BlurView
          intensity={Platform.OS === "ios" ? 50 : 85}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(255,255,255,0.78)", "rgba(255,255,255,0.42)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

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

  // Hero Card
  heroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.28)",
    overflow: "hidden",
    position: "relative",
    boxShadow: "0px 8px 20px rgba(5,150,105,0.14)",
    elevation: 4,
  },
  heroGlowOrb: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(94,234,212,0.1)",
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  heroEyebrow: {
    fontSize: 10.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#5EEAD4",
    letterSpacing: 1.2,
  },
  heroPointsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroPointsText: {
    fontSize: 12.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#FBBF24",
    letterSpacing: 0.2,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 16,
  },
  balanceNumber: {
    fontSize: 34,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  balanceMeta: {
    flex: 1,
  },
  balanceUnit: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#E2ECE5",
  },
  balanceSubtext: {
    fontSize: 11,
    fontFamily: "Nunito_500Medium",
    color: "#7A9082",
    marginTop: 2,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroStatValue: {
    fontSize: 16,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#FFFFFF",
  },
  heroStatLabel: {
    fontSize: 10.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#94A3B8",
    marginTop: 2,
  },
  heroStatSub: {
    fontSize: 9.5,
    fontFamily: "Nunito_500Medium",
    color: "#5EEAD4",
    marginTop: 1,
  },

  // Reusable Frosted Glass Card
  glassCard: {
    backgroundColor: "transparent",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.82)",
    boxShadow: "0px 2px 10px rgba(10,36,21,0.06)",
    elevation: 2,
    gap: 14,
    overflow: "hidden",
    position: "relative",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: "Nunito_500Medium",
    color: "#64748B",
    marginTop: 2,
  },
  waitingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  waitingText: {
    fontSize: 12,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#D97706",
  },
  allClaimedWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  allClaimedText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#059669",
  },

  // Milestones List
  milestoneList: {
    gap: 0,
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  milestoneRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  milestoneRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  milestoneLabel: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: "#183222",
  },
  milestonePoints: {
    fontSize: 12.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#059669",
  },

  // Section Headers
  sectionHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Nunito_500Medium",
    color: "#64748B",
    marginTop: 2,
  },

  // Recommendations
  recommendationsList: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: "transparent",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.82)",
    boxShadow: "0px 2px 10px rgba(10,36,21,0.06)",
    elevation: 2,
    overflow: "hidden",
    position: "relative",
    gap: 10,
  },
  actionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionEyebrow: {
    fontSize: 10,
    fontFamily: "Nunito_800ExtraBold",
    color: "#047857",
    letterSpacing: 0.8,
  },
  actionGoldWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionGoldText: {
    fontSize: 11.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#D97706",
    letterSpacing: 0.2,
  },
  actionBody: {
    gap: 4,
  },
  actionPerk: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  actionTitle: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
  actionDescription: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    lineHeight: 17,
  },
  actionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  actionMetaText: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#64748B",
  },
  actionFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 10,
    marginTop: 2,
  },
  actionSavingsWrap: {
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
    gap: 6,
    backgroundColor: "#0D1811",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  actionBtnTextDone: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },

  // Compare Dual Columns
  compareColsRow: {
    flexDirection: "row",
    gap: 10,
  },
  compareCol: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  compareColLabel: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#0D1811",
  },
  compareColLabelOpt: {
    color: "#047857",
  },
  compareColSub: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#64748B",
    marginTop: 1,
  },
  compareColPercent: {
    fontSize: 22,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#2D4236",
    marginTop: 6,
  },
  compareColPercentOpt: {
    color: "#2EA86E",
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "#F1F5F3",
    borderRadius: 2,
    overflow: "hidden",
    marginVertical: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  compareColDetails: {
    gap: 2,
  },
  compareDetailText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
  compareDetailTextOpt: {
    color: "#047857",
  },
  compareDetailTextMuted: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#64748B",
  },
  loadShiftSummary: {
    fontSize: 11.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#2EA86E",
    lineHeight: 16,
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
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  dividendTileLabel: {
    fontSize: 9,
    fontFamily: "Nunito_800ExtraBold",
    color: "#64748B",
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
    fontFamily: "Nunito_500Medium",
    color: "#64748B",
    marginTop: 2,
  },
  tariffFootnote: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#64748B",
    textAlign: "center",
  },

  // Timeline
  timelineHeading: {
    fontSize: 10,
    fontFamily: "Nunito_800ExtraBold",
    color: "#64748B",
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
    fontFamily: "IBMPlexMono_600SemiBold",
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
