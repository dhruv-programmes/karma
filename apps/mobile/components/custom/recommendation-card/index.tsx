import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import {
  Leaf,
  Zap,
  Sun,
  Smartphone,
  Shirt,
  Coins,
  ArrowRight,
  MapPin,
  Sparkles,
  ShoppingBag,
} from "lucide-react-native";
import { Text } from "@/components/ui/text";
import type { Recommendation } from "@/src/types/api";

type Props = {
  item: Recommendation;
  onPress?: () => void;
  hero?: boolean;
};

function getCategoryIcon(cat: string) {
  const c = (cat || "").toLowerCase();
  if (c.includes("elec") || c.includes("phone")) {
    return <Smartphone size={12} color="#059669" strokeWidth={2.4} />;
  }
  if (c.includes("cloth") || c.includes("fashion") || c.includes("apparel")) {
    return <Shirt size={12} color="#059669" strokeWidth={2.4} />;
  }
  if (c.includes("solar") || c.includes("energy")) {
    return <Sun size={12} color="#D97706" strokeWidth={2.4} />;
  }
  if (c.includes("food") || c.includes("grocer")) {
    return <ShoppingBag size={12} color="#059669" strokeWidth={2.4} />;
  }
  return <Leaf size={12} color="#059669" strokeWidth={2.4} />;
}

export function RecommendationCard({ item, onPress, hero }: Props) {
  const points = Math.max(
    25,
    Math.round((item.co2e_avoided_kg || 15) * 0.6 + (item.score || 70) * 0.3)
  );

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.card, hero ? styles.heroCard : null]}
    >
      {/* Top Header: Category Tag & Karma Coin Reward Badge */}
      <View style={styles.headerRow}>
        <View style={styles.categoryBadge}>
          {getCategoryIcon(item.category)}
          <Text style={styles.categoryBadgeText}>
            {(item.category || "General").toUpperCase()}
          </Text>
        </View>

        <View style={styles.pointsBadge}>
          <Coins size={12} color="#B45309" strokeWidth={2.4} />
          <Text style={styles.pointsBadgeText}>+{points} KARMA COINS</Text>
        </View>
      </View>

      {/* Title & Pitch */}
      <View style={styles.titleSection}>
        {hero ? (
          <View style={styles.bestTodayPill}>
            <Sparkles size={11} color="#059669" strokeWidth={2.4} />
            <Text style={styles.bestTodayText}>RECOMMENDED FIRST</Text>
          </View>
        ) : null}
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle || item.explanation}</Text>
      </View>

      {/* Impact Metric Tiles Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricTile}>
          <Text style={styles.metricLabel}>CO₂E AVOIDED</Text>
          <Text style={styles.metricValueGreen}>
            ~{Math.round(item.co2e_avoided_kg || 0)} kg
          </Text>
          <Text style={styles.metricSub}>Direct reduction</Text>
        </View>

        <View style={styles.metricTile}>
          <Text style={styles.metricLabel}>VALUE POTENTIAL</Text>
          <Text style={styles.metricValueDark}>
            ₹{Math.round(item.money_impact_inr || 0).toLocaleString("en-IN")}
          </Text>
          <Text style={styles.metricSub}>Household savings</Text>
        </View>
      </View>

      {/* Meta Pills (Effort & Availability) */}
      <View style={styles.metaPillsRow}>
        <View style={styles.metaPill}>
          <Zap size={11} color="#526658" strokeWidth={2.2} />
          <Text style={styles.metaPillText}>
            {(item.effort || "Low").toUpperCase()} EFFORT
          </Text>
        </View>

        <View style={styles.metaPill}>
          <MapPin size={11} color="#526658" strokeWidth={2.2} />
          <Text style={styles.metaPillText} numberOfLines={1}>
            {item.local_availability || "Local options available"}
          </Text>
        </View>
      </View>

      {/* CTA Button */}
      <View style={styles.ctaButton}>
        <Text style={styles.ctaButtonText}>
          {item.product_id ? "View Circular Options" : "Take Action"}
        </Text>
        <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.2} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.18)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  heroCard: {
    borderColor: "rgba(46,168,110,0.35)",
    backgroundColor: "#FFFFFF",
    shadowColor: "#059669",
    shadowOpacity: 0.08,
  },
  headerRow: {
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
    fontSize: 9.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
    letterSpacing: 0.6,
  },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  pointsBadgeText: {
    fontSize: 9.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#B45309",
    letterSpacing: 0.3,
  },
  titleSection: {
    gap: 3,
  },
  bestTodayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  bestTodayText: {
    fontSize: 9,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    lineHeight: 17,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricTile: {
    flex: 1,
    backgroundColor: "#F8FAF9",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },
  metricLabel: {
    fontSize: 8.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#7A9082",
    letterSpacing: 0.5,
  },
  metricValueGreen: {
    fontSize: 17,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#059669",
    marginTop: 2,
  },
  metricValueDark: {
    fontSize: 17,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
    marginTop: 2,
  },
  metricSub: {
    fontSize: 9.5,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
    marginTop: 1,
  },
  metaPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F3",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
  },
  metaPillText: {
    fontSize: 9.5,
    fontFamily: "Nunito_700Bold",
    color: "#526658",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0D1811",
    paddingVertical: 11,
    borderRadius: 14,
    marginTop: 2,
  },
  ctaButtonText: {
    fontSize: 12.5,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
