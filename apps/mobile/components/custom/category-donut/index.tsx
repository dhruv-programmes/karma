import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { PieChart as PieChartIcon } from "lucide-react-native";
import { Text } from "@/components/ui/text";

const COLOR_MAP = {
  purchases: "#2EA86E", // Emerald Green
  transport: "#0284C7", // Sky Blue
  energy: "#F59E0B",    // Warm Solar Amber
};

export function CategoryDonut({
  purchases = 0,
  transport = 0,
  energy = 0,
}: {
  purchases: number;
  transport: number;
  energy: number;
}) {
  const [containerWidth, setContainerWidth] = useState(0);

  const safePurchases = Math.max(0, purchases);
  const safeTransport = Math.max(0, transport);
  const safeEnergy = Math.max(0, energy);

  const total = safePurchases + safeTransport + safeEnergy;
  const safeTotal = total > 0 ? total : 1;

  const purchasesPct = Math.round((safePurchases / safeTotal) * 100);
  const transportPct = Math.round((safeTransport / safeTotal) * 100);
  const energyPct = Math.max(0, 100 - purchasesPct - transportPct);

  const rows = [
    {
      key: "purchases",
      label: "Purchases",
      value: safePurchases,
      pct: purchasesPct,
      color: COLOR_MAP.purchases,
      sub: "Goods & groceries",
    },
    {
      key: "transport",
      label: "Transport",
      value: safeTransport,
      pct: transportPct,
      color: COLOR_MAP.transport,
      sub: "Commute & transit",
    },
    {
      key: "energy",
      label: "Energy",
      value: safeEnergy,
      pct: energyPct,
      color: COLOR_MAP.energy,
      sub: "Home & utilities",
    },
  ];

  // Gifted-charts pie data
  const chartData = rows.map((r) => ({
    value: Math.max(0.1, r.value),
    color: r.color,
    text: `${r.pct}%`,
  }));

  // Find dominant source
  const dominant = [...rows].sort((a, b) => b.value - a.value)[0];

  return (
    <View
      style={styles.card}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setContainerWidth(w);
      }}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <PieChartIcon size={18} color="#2EA86E" strokeWidth={2.2} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Emissions Breakdown</Text>
            <Text style={styles.subtitle}>
              Distribution across lifestyle sources
            </Text>
          </View>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeText}>~{Math.round(total)} kg</Text>
        </View>
      </View>

      {/* Main Chart + Legend Section */}
      <View style={styles.chartAndLegend}>
        {/* Donut Container with guaranteed compact dimensions */}
        <View style={styles.donutWrapper}>
          <PieChart
            data={chartData}
            donut
            radius={52}
            innerRadius={32}
            innerCircleColor="#FFFFFF"
            centerLabelComponent={() => (
              <View style={styles.centerLabel}>
                <Text style={styles.centerLabelSub}>TOTAL</Text>
                <Text style={styles.centerLabelNum}>~{Math.round(total)}</Text>
                <Text style={styles.centerLabelUnit}>kg CO₂</Text>
              </View>
            )}
          />
        </View>

        {/* Legend Rows */}
        <View style={styles.legendWrapper}>
          {rows.map((r) => (
            <View key={r.key} style={styles.legendItem}>
              <View style={styles.legendTopRow}>
                <View style={styles.legendNameWrap}>
                  <View style={[styles.colorDot, { backgroundColor: r.color }]} />
                  <Text style={styles.legendLabel}>{r.label}</Text>
                  <View
                    style={[
                      styles.pctPill,
                      { backgroundColor: `${r.color}18` },
                    ]}
                  >
                    <Text style={[styles.pctText, { color: r.color }]}>
                      {r.pct}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.legendKg}>~{Math.round(r.value)} kg</Text>
              </View>

              {/* Progress Bar Proportion */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: r.color,
                      width: `${Math.min(100, Math.max(4, r.pct))}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Footnote callout */}
      <View style={styles.footnoteRow}>
        <Text style={styles.footnoteText}>
          {dominant.label} is your top emission source ({dominant.pct}%).
          Reducing this has the fastest impact on your monthly footprint.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
    elevation: 2,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
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
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    marginTop: 1,
  },
  totalBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.2)",
  },
  totalBadgeText: {
    fontSize: 11,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#059669",
  },
  chartAndLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    width: "100%",
  },
  donutWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 108,
    height: 108,
  },
  centerLabel: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabelSub: {
    fontSize: 8,
    fontFamily: "Nunito_800ExtraBold",
    color: "#7A9082",
    letterSpacing: 0.5,
  },
  centerLabelNum: {
    fontSize: 13,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
    lineHeight: 16,
  },
  centerLabelUnit: {
    fontSize: 7.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#7A9082",
  },
  legendWrapper: {
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  legendItem: {
    gap: 4,
  },
  legendTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legendNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12.5,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
  pctPill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  pctText: {
    fontSize: 9.5,
    fontFamily: "Nunito_800ExtraBold",
  },
  legendKg: {
    fontSize: 11.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#526658",
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "#F1F5F3",
    borderRadius: 2,
    overflow: "hidden",
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  footnoteRow: {
    backgroundColor: "#F8FAF9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },
  footnoteText: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#166534",
    lineHeight: 15,
  },
});
