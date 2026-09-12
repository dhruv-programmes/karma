import React, { useState } from "react";
import { View, Platform, StyleSheet } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { TrendingDown } from "lucide-react-native";
import { Text } from "@/components/ui/text";

const POINT_COLOR = "#2EA86E";
const POINT_SIZE = 7;

function DataPoint() {
  return (
    <View
      style={{
        width: POINT_SIZE,
        height: POINT_SIZE,
        borderRadius: POINT_SIZE / 2,
        backgroundColor: POINT_COLOR,
        borderWidth: 1.5,
        borderColor: "#FFFFFF",
      }}
    />
  );
}

export function FootprintTrend({
  points = [],
}: {
  points: { label: string; kg: number }[];
}) {
  const [containerWidth, setContainerWidth] = useState(0);

  // Clean data points without cluttered text overlapping on the line
  const data = points.map((p) => ({
    value: p.kg,
    label: p.label,
  }));

  const maxVal = Math.max(...points.map((p) => p.kg), 100);
  const chartMax = Math.ceil(maxVal * 1.22); // 22% headroom to prevent top clipping

  // Precise dimension calculations to prevent clipping on any device
  const chartWidth = Math.max(180, containerWidth - 36);
  const yAxisLabelWidth = 36;
  const availableWidth = Math.max(120, chartWidth - yAxisLabelWidth);
  const initialSpacing = 16;
  const endSpacing = 16;
  const spacing =
    data.length > 1
      ? Math.max(
          24,
          Math.floor((availableWidth - initialSpacing - endSpacing) / (data.length - 1))
        )
      : 40;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <TrendingDown size={18} color="#2EA86E" strokeWidth={2.2} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Weekly Footprint Trajectory</Text>
            <Text style={styles.subtitle}>
              Estimated kg CO₂e from transactions & routine shifts
            </Text>
          </View>
        </View>

        {data.length > 0 ? (
          <View style={styles.latestBadge}>
            <Text style={styles.latestBadgeText}>
              Latest: ~{Math.round(data[data.length - 1].value).toLocaleString()} kg
            </Text>
          </View>
        ) : null}
      </View>

      {/* Chart Viewport with onLayout measurement to eliminate clipping */}
      <View
        style={styles.chartWrapper}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setContainerWidth(w);
        }}
      >
        {data.length && containerWidth > 0 ? (
          <LineChart
            data={data}
            height={145}
            width={chartWidth}
            maxValue={chartMax}
            color={POINT_COLOR}
            thickness={2.5}
            startFillColor="rgba(46,168,110,0.20)"
            endFillColor="rgba(46,168,110,0.01)"
            startOpacity={0.8}
            endOpacity={0.02}
            areaChart
            hideRules={false}
            rulesType="dashed"
            rulesColor="rgba(46,168,110,0.10)"
            yAxisColor="transparent"
            xAxisColor="rgba(46,168,110,0.18)"
            yAxisLabelWidth={yAxisLabelWidth}
            yAxisTextStyle={{
              color: "#7A9082",
              fontSize: 9.5,
              fontFamily: "IBMPlexMono_600SemiBold",
            }}
            xAxisLabelTextStyle={{
              color: "#7A9082",
              fontSize: 10,
              fontFamily: "Nunito_600SemiBold",
            }}
            dataPointsColor={POINT_COLOR}
            dataPointsHeight={POINT_SIZE}
            dataPointsWidth={POINT_SIZE}
            initialSpacing={initialSpacing}
            endSpacing={endSpacing}
            spacing={spacing}
            curved
            noOfSections={4}
            focusEnabled={false}
            {...(Platform.OS === "web"
              ? {
                  customDataPoint: () => <DataPoint />,
                }
              : {})}
          />
        ) : (
          <Text style={styles.emptyText}>
            Gathering more weeks of footprint data...
          </Text>
        )}
      </View>

      {/* Footnote callout */}
      <View style={styles.footnoteRow}>
        <Text style={styles.footnoteText}>
          Trajectory reflects weekly consumption and clean habits over the last {data.length || 10} weeks.
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
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
  latestBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.25)",
  },
  latestBadgeText: {
    fontSize: 10.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#059669",
  },
  chartWrapper: {
    width: "100%",
    paddingTop: 8,
    paddingBottom: 4,
    overflow: "hidden",
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
    paddingVertical: 20,
    textAlign: "center",
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
