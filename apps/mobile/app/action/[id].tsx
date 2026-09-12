import React from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Leaf,
  Coins,
  MapPin,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react-native";
import { BackButton } from "@/components/custom/back-button";
import { Text } from "@/components/ui/text";
import { useRecommendations } from "@/src/hooks/queries";

export default function ActionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recs = useRecommendations();
  const item = recs.data?.find((r) => r.id === id) ?? recs.data?.[0];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!item) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingHorizontal: 20 }]}>
        <BackButton label="Actions" fallbackRoute="/(tabs)/actions" />
        <Text style={styles.title}>Action Not Found</Text>
      </View>
    );
  }

  const points = Math.max(
    25,
    Math.round((item.co2e_avoided_kg || 15) * 0.6 + (item.score || 70) * 0.3)
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <View style={styles.headerTopRow}>
          <BackButton label="Actions" fallbackRoute="/(tabs)/actions" />
        </View>

        {/* Title Header Card */}
        <View style={styles.heroCard}>
          <View style={styles.categoryBadgeRow}>
            <View style={styles.categoryBadge}>
              <Leaf size={12} color="#059669" strokeWidth={2.4} />
              <Text style={styles.categoryBadgeText}>
                {(item.category || "General").toUpperCase()} · {item.action_type}
              </Text>
            </View>

            <View style={styles.pointsBadge}>
              <Coins size={13} color="#B45309" strokeWidth={2.4} />
              <Text style={styles.pointsBadgeText}>+{points} KARMA COINS</Text>
            </View>
          </View>

          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>

        {/* Impact Metrics Grid */}
        <View style={styles.metricsRow}>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>CO₂E AVOIDED</Text>
            <Text style={styles.metricValueGreen}>
              ~{Math.round(item.co2e_avoided_kg || 0)} kg
            </Text>
            <Text style={styles.metricSub}>Direct environmental gain</Text>
          </View>

          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>ECONOMIC BENEFIT</Text>
            <Text style={styles.metricValueDark}>
              ₹{Math.round(item.money_impact_inr || 0).toLocaleString("en-IN")}
            </Text>
            <Text style={styles.metricSub}>Household value saved</Text>
          </View>
        </View>

        {/* Explanation Card */}
        <View style={styles.cleanCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Sparkles size={18} color="#059669" strokeWidth={2.2} />
            </View>
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.cardHeaderTitle}>Why This Matters</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Carbon methodology & circular logic
              </Text>
            </View>
          </View>

          <Text style={styles.explanationText}>
            {item.explanation ||
              "By extending the life of products and shifting to circular practices, you eliminate the embodied manufacturing, refining, and transportation emissions required to create replacements."}
          </Text>

          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Zap size={14} color="#059669" strokeWidth={2.2} />
              <Text style={styles.metaText}>
                Effort Level: <Text style={{ fontFamily: "Nunito_700Bold" }}>{item.effort.toUpperCase()}</Text>
              </Text>
            </View>
            <View style={styles.metaRow}>
              <MapPin size={14} color="#059669" strokeWidth={2.2} />
              <Text style={styles.metaText}>{item.local_availability}</Text>
            </View>
          </View>
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/map",
              params: {
                type: item.action_type === "RECYCLE" ? "recycling" : "repair",
                actionId: item.id,
                productId: item.product_id ?? "",
              },
            })
          }
        >
          <Text style={styles.primaryBtnText}>
            Find Nearby Drop-Off & Repair
          </Text>
          <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
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
  headerTopRow: {
    marginBottom: 4,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.18)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  categoryBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.2)",
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
    letterSpacing: 0.6,
  },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  pointsBadgeText: {
    fontSize: 10,
    fontFamily: "Nunito_800ExtraBold",
    color: "#B45309",
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 22,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 13.5,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    lineHeight: 19,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricTile: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: "Nunito_800ExtraBold",
    color: "#7A9082",
    letterSpacing: 0.6,
  },
  metricValueGreen: {
    fontSize: 22,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#059669",
    marginTop: 4,
  },
  metricValueDark: {
    fontSize: 22,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
    marginTop: 4,
  },
  metricSub: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
    marginTop: 2,
  },
  cleanCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
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
  explanationText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    lineHeight: 19,
  },
  metaBox: {
    backgroundColor: "#F8FAF9",
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#183222",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D1811",
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
