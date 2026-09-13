import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  FileCheck2,
  Leaf,
  Layers,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Zap,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import type { UniversalVerificationResponse } from "@/src/types/api";

export default function UniversalResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ resultJson?: string }>();

  let result: UniversalVerificationResponse | null = null;
  try {
    if (params.resultJson) {
      result = JSON.parse(params.resultJson);
    }
  } catch {
    result = null;
  }

  const handleBack = () => {
    router.replace("/verify" as any);
  };

  const handleScanAnother = () => {
    router.replace("/verify/capture" as any);
  };

  if (!result) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={22} color="#064E3B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification Result</Text>
        </View>
        <View style={styles.emptyContainer}>
          <AlertCircle size={40} color="#DC2626" />
          <Text style={styles.emptyText}>No verification payload found.</Text>
          <TouchableOpacity style={styles.scanButton} onPress={handleBack}>
            <Text style={styles.scanButtonText}>Back to Scanner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isVerified = result.status === "VERIFIED";
  const isDuplicate = result.status === "DUPLICATE";
  const isSuspicious = result.status === "SUSPICIOUS";
  const isRejected = result.status === "REJECTED";
  const hideCards = isSuspicious || isRejected;
  const totalPoints = result.rewards?.total_points ?? 0;
  const analysis = result.analysis;
  const impact = result.impact;
  const credit = result.long_term;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top Navigation */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#064E3B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerEyebrow}>EVIDENCE AUDIT</Text>
          <Text style={styles.headerTitle}>Verification Certificate</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 36 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <Animated.View entering={FadeInDown.duration(280)}>
          <View
            style={[
              styles.statusBanner,
              isDuplicate
                ? styles.statusBannerDuplicate
                : hideCards
                ? styles.statusBannerSuspicious
                : styles.statusBannerVerified,
            ]}
          >
            <View style={styles.statusRow}>
              <View style={styles.statusLeft}>
                {isDuplicate ? (
                  <Copy size={24} color="#D97706" />
                ) : hideCards ? (
                  <AlertCircle size={24} color="#DC2626" />
                ) : (
                  <CheckCircle2 size={24} color="#059669" />
                )}
                <View>
                  <Text
                    style={[
                      styles.statusTitle,
                      isDuplicate
                        ? { color: "#D97706" }
                        : hideCards
                        ? { color: "#DC2626" }
                        : { color: "#059669" },
                    ]}
                  >
                    {result.status}
                  </Text>
                  <Text style={styles.statusSubtitle}>
                    {analysis?.verification.evidence_type.replace(/_/g, " ")}
                  </Text>
                </View>
              </View>

              <View style={styles.confidenceBadge}>
                <ShieldCheck size={13} color="#065F46" />
                <Text style={styles.confidenceText}>
                  {Math.round((analysis?.verification.confidence ?? 1) * 100)}% Confidence
                </Text>
              </View>
            </View>

            <Text style={styles.explanationText}>
              {result.message || analysis?.explanation}
            </Text>
          </View>
        </Animated.View>

        {/* Short-Run Rewards Card */}
        {totalPoints > 0 ? (
          <Animated.View entering={FadeInDown.duration(280)}>
            <View style={styles.rewardCard}>
              <View style={styles.rewardTopRow}>
                <View style={styles.rewardPointsWrap}>
                  <Zap size={22} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.rewardPointsText}>
                    +{totalPoints.toLocaleString()} Points
                  </Text>
                </View>
                <View style={styles.rewardTypePill}>
                  <Text style={styles.rewardTypePillText}>
                    {analysis?.short_run.reward_type} REWARD
                  </Text>
                </View>
              </View>

              {result.rewards.performance_bonus > 0 ? (
                <View style={styles.bonusRow}>
                  <Sparkles size={14} color="#059669" />
                  <Text style={styles.bonusText}>
                    Includes +{result.rewards.performance_bonus} high generation performance bonus
                  </Text>
                </View>
              ) : null}

              <Text style={styles.rewardFootnote}>
                Points immediately credited to your Karma Coin ledger and League standing.
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Multi-Dimensional Impact Card */}
        {impact ? (
          <Animated.View entering={FadeInDown.duration(280)}>
            <View style={styles.impactCard}>
              <View style={styles.impactHeader}>
                <View>
                  <Text style={styles.impactEyebrow}>MULTI-DIMENSIONAL IMPACT</Text>
                  <Text style={styles.impactTitle}>Overall Score: {impact.overall}/100</Text>
                </View>
                <View style={styles.co2Box}>
                  <Leaf size={14} color="#059669" />
                  <Text style={styles.co2Text}>
                    {impact.co2_saved_kg} kg CO₂e
                  </Text>
                </View>
              </View>

              {/* Progress Dimensions */}
              <View style={styles.dimensionsList}>
                <View style={styles.dimensionRow}>
                  <Text style={styles.dimLabel}>Carbon Reduction</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${impact.carbon_reduction}%`, backgroundColor: "#059669" },
                      ]}
                    />
                  </View>
                  <Text style={styles.dimValue}>{impact.carbon_reduction}</Text>
                </View>

                <View style={styles.dimensionRow}>
                  <Text style={styles.dimLabel}>Pollution Reduction</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${impact.pollution_reduction}%`, backgroundColor: "#10B981" },
                      ]}
                    />
                  </View>
                  <Text style={styles.dimValue}>{impact.pollution_reduction}</Text>
                </View>

                <View style={styles.dimensionRow}>
                  <Text style={styles.dimLabel}>Energy Efficiency</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${impact.energy_efficiency}%`, backgroundColor: "#0284C7" },
                      ]}
                    />
                  </View>
                  <Text style={styles.dimValue}>{impact.energy_efficiency}</Text>
                </View>

                <View style={styles.dimensionRow}>
                  <Text style={styles.dimLabel}>Resource Efficiency</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${impact.resource_efficiency}%`, backgroundColor: "#8B5CF6" },
                      ]}
                    />
                  </View>
                  <Text style={styles.dimValue}>{impact.resource_efficiency}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        ) : null}

        {/* Extracted Facts Card */}
        {analysis && !hideCards ? (() => {
          const ownerField = analysis.observations.fields.find(
            (f) => /owner|name|proprietor/i.test(f.field_name)
          );
          const vehicleField = analysis.observations.fields.find(
            (f) => /model|vehicle|make/i.test(f.field_name)
          );
          const fuelField = analysis.observations.fields.find(
            (f) => /fuel|power|energy/i.test(f.field_name)
          );
          const otherFields = analysis.observations.fields.filter(
            (f) => f !== ownerField && f !== vehicleField && f !== fuelField
          );

          return (
            <Animated.View entering={FadeInDown.duration(280)}>
              {/* Owner / Identity Banner */}
              {ownerField?.value ? (
                <View style={styles.ownerCard}>
                  <View style={styles.ownerIconBox}>
                    <ShieldCheck size={20} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ownerLabel}>REGISTERED OWNER</Text>
                    <Text style={styles.ownerName}>{String(ownerField.value)}</Text>
                    {vehicleField?.value ? (
                      <Text style={styles.ownerSub}>
                        {String(vehicleField.value)}{fuelField?.value ? ` · ${String(fuelField.value)}` : ""}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={styles.factsCard}>
                <View style={styles.factsHeader}>
                  <FileCheck2 size={18} color="#064E3B" />
                  <Text style={styles.factsTitle}>Extracted Observable Facts</Text>
                </View>

                <View style={styles.factsGrid}>
                  <View style={styles.factItem}>
                    <Text style={styles.factLabel}>Asset Category</Text>
                    <Text style={styles.factValue}>
                      {analysis.asset.type.replace(/_/g, " ").toUpperCase()}
                    </Text>
                  </View>

                  {analysis.asset.identifier ? (
                    <View style={styles.factItem}>
                      <Text style={styles.factLabel}>Identifier</Text>
                      <Text style={styles.factValue}>
                        {analysis.asset.identifier}
                      </Text>
                    </View>
                  ) : null}

                  {analysis.temporal.billing_period_start && analysis.temporal.billing_period_end ? (
                    <View style={styles.factItem}>
                      <Text style={styles.factLabel}>Billing Period</Text>
                      <Text style={styles.factValue}>
                        {analysis.temporal.billing_period_start} → {analysis.temporal.billing_period_end}
                      </Text>
                    </View>
                  ) : analysis.temporal.evidence_date ? (
                    <View style={styles.factItem}>
                      <Text style={styles.factLabel}>Document Date</Text>
                      <Text style={styles.factValue}>
                        {analysis.temporal.evidence_date}
                      </Text>
                    </View>
                  ) : null}

                  {otherFields.map((field, idx) => (
                    <View key={idx} style={styles.factItem}>
                      <Text style={styles.factLabel}>{field.field_name}</Text>
                      <Text style={styles.factValue}>{String(field.value ?? "—")}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>
          );
        })() : null}

        {/* Longitudinal Sustainability Credit Card */}
        {credit && !hideCards ? (
          <Animated.View entering={FadeInDown.duration(280)}>
            <View style={styles.creditStatusCard}>
              <View style={styles.creditStatusLeft}>
                <Text style={styles.creditStatusLabel}>SUSTAINABILITY CREDIT</Text>
                <Text style={styles.creditStatusScore}>
                  {credit.sustainability_credit}/100
                </Text>
                <Text style={styles.creditStatusTrend}>
                  Trend: {credit.trend} · Consistency factor: {credit.consistency_factor}x
                </Text>
              </View>
              <Award size={36} color="#059669" />
            </View>
          </Animated.View>
        ) : null}

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.scanAnotherButton}
            onPress={handleScanAnother}
            activeOpacity={0.85}
          >
            <RotateCcw size={18} color="#064E3B" />
            <Text style={styles.scanAnotherButtonText}>Scan Another Evidence</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleBack}
            activeOpacity={0.85}
          >
            <Text style={styles.doneButtonText}>Done</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#F4FAF6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E6F4EA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerEyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
    letterSpacing: 1.2,
    color: "#059669",
  },
  headerTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22,
    color: "#064E3B",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  statusBanner: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusBannerVerified: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  statusBannerDuplicate: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  statusBannerSuspicious: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusTitle: {
    fontFamily: "Nunito_900Black",
    fontSize: 17,
    letterSpacing: 0.5,
  },
  statusSubtitle: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    color: "#4B5563",
  },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  confidenceText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
    color: "#065F46",
  },
  explanationText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  rewardCard: {
    backgroundColor: "#064E3B",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  rewardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rewardPointsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rewardPointsText: {
    fontFamily: "Nunito_900Black",
    fontSize: 24,
    color: "#FFFFFF",
  },
  rewardTypePill: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rewardTypePillText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
    color: "#A7F3D0",
  },
  bonusRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 10,
  },
  bonusText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    color: "#D1FAE5",
  },
  rewardFootnote: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#A7F3D0",
  },
  impactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  impactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  impactEyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
    color: "#059669",
    letterSpacing: 1.1,
  },
  impactTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 17,
    color: "#111827",
    marginTop: 2,
  },
  co2Box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  co2Text: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
    color: "#059669",
  },
  dimensionsList: {
    gap: 10,
  },
  dimensionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dimLabel: {
    width: 120,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    color: "#4B5563",
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  dimValue: {
    width: 28,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: "#1F2937",
    textAlign: "right",
  },
  ownerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 12,
  },
  ownerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  ownerLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    color: "#059669",
    letterSpacing: 1.2,
  },
  ownerName: {
    fontFamily: "Nunito_900Black",
    fontSize: 18,
    color: "#064E3B",
    marginTop: 1,
  },
  ownerSub: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    color: "#065F46",
    marginTop: 2,
  },
  factsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  factsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  factsTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
    color: "#111827",
  },
  factsGrid: {
    gap: 10,
  },
  factItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  factLabel: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: "#6B7280",
  },
  factValue: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: "#111827",
    maxWidth: "55%",
    textAlign: "right",
  },
  creditStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    marginBottom: 24,
  },
  creditStatusLeft: {
    flex: 1,
  },
  creditStatusLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
    color: "#059669",
    letterSpacing: 1.1,
  },
  creditStatusScore: {
    fontFamily: "Nunito_900Black",
    fontSize: 22,
    color: "#064E3B",
    marginTop: 2,
  },
  creditStatusTrend: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  bottomActions: {
    gap: 10,
  },
  scanAnotherButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 8,
  },
  scanAnotherButtonText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
    color: "#064E3B",
  },
  doneButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 14,
  },
  doneButtonText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#4B5563",
    marginTop: 12,
    marginBottom: 20,
  },
  scanButton: {
    backgroundColor: "#059669",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scanButtonText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
  },
});
