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
    return <Smartphone size={13} color="#059669" strokeWidth={2.4} />;
  }
  if (c.includes("cloth") || c.includes("fashion") || c.includes("apparel")) {
    return <Shirt size={13} color="#059669" strokeWidth={2.4} />;
  }
  if (c.includes("solar") || c.includes("energy")) {
    return <Sun size={13} color="#D97706" strokeWidth={2.4} />;
  }
  if (c.includes("food") || c.includes("grocer")) {
    return <ShoppingBag size={13} color="#059669" strokeWidth={2.4} />;
  }
  return <Leaf size={13} color="#059669" strokeWidth={2.4} />;
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
      {/* Top Header: Pure Typography & Meta (NO PILLBOXES) */}
      <View style={styles.headerRow}>
        <View style={styles.categoryMeta}>
          {getCategoryIcon(item.category)}
          <Text style={styles.categoryText}>
            {(item.category || "General").toUpperCase()}
          </Text>
          {hero ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.topPickText}>TOP PICK</Text>
            </>
          ) : null}
        </View>

        <View style={styles.pointsMeta}>
          <Coins size={13} color="#B45309" strokeWidth={2.2} />
          <Text style={styles.pointsText}>+{points} Karma Coins</Text>
        </View>
      </View>

      {/* Title & Pitch */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle || item.explanation}</Text>
      </View>

      {/* Unified Impact Metrics Panel (Clean Split, No Pillboxes) */}
      <View style={styles.metricsPanel}>
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>CO₂E AVOIDED</Text>
          <Text style={styles.metricValueGreen}>
            ~{Math.round(item.co2e_avoided_kg || 0)} kg
          </Text>
          <Text style={styles.metricSub}>Direct reduction</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>VALUE POTENTIAL</Text>
          <Text style={styles.metricValueDark}>
            ₹{Math.round(item.money_impact_inr || 0).toLocaleString("en-IN")}
          </Text>
          <Text style={styles.metricSub}>Household savings</Text>
        </View>
      </View>

      {/* Meta Row: Effort & Local Availability (Clean text with icons, NO PILLBOXES) */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Zap size={12} color="#059669" strokeWidth={2.2} />
          <Text style={styles.metaText}>{item.effort || "Low"} effort</Text>
        </View>
        <Text style={styles.metaDot}>·</Text>
        <View style={styles.metaItem}>
          <MapPin size={12} color="#64748B" strokeWidth={2.2} />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.local_availability || "Local options available"}
          </Text>
        </View>
      </View>

      {/* Modern Minimalist Action Button */}
      <View style={styles.ctaButton}>
        <Text style={styles.ctaButtonText}>
          {item.product_id ? "View Circular Options" : "Take Action"}
        </Text>
        <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.4} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5ECE8",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.03)",
    elevation: 2,
    gap: 12,
  },
  heroCard: {
    borderColor: "rgba(46,168,110,0.35)",
    boxShadow: "0px 4px 14px rgba(5,150,105,0.06)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  categoryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#059669",
    letterSpacing: 0.8,
  },
  metaDot: {
    fontSize: 12,
    color: "#94A3B8",
  },
  topPickText: {
    fontSize: 9.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
    letterSpacing: 0.6,
  },
  pointsMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pointsText: {
    fontSize: 12,
    fontFamily: "Nunito_800ExtraBold",
    color: "#B45309",
  },
  titleSection: {
    gap: 3,
  },
  title: {
    fontSize: 17,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: "Nunito_400Regular",
    color: "#64748B",
    lineHeight: 17,
  },
  metricsPanel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAF8",
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#EEF3F0",
  },
  metricColumn: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  metricLabel: {
    fontSize: 8.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#799184",
    letterSpacing: 0.6,
  },
  metricValueGreen: {
    fontSize: 16,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#059669",
    marginTop: 1,
  },
  metricValueDark: {
    fontSize: 16,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
    marginTop: 1,
  },
  metricSub: {
    fontSize: 9.5,
    fontFamily: "Nunito_400Regular",
    color: "#799184",
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E2E8E4",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#64748B",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0D251A",
    height: 42,
    borderRadius: 12,
    marginTop: 2,
  },
  ctaButtonText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
