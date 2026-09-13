import React, { useState } from "react";
import { View, Platform, StyleSheet } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { Text } from "@/components/ui/text";

const POINT_COLOR = "#2EA86E";
const POINT_SIZE = 6;

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

  const data = points.map((p) => ({
    value: p.kg,
    label: p.label,
  }));

  const maxVal = Math.max(...points.map((p) => p.kg), 100);
  const chartMax = Math.ceil(maxVal * 1.2);

  const chartWidth = Math.max(180, containerWidth - 32);
  const yAxisLabelWidth = 32;
  const availableWidth = Math.max(120, chartWidth - yAxisLabelWidth);
  const initialSpacing = 14;
  const endSpacing = 14;
  const spacing =
    data.length > 1
      ? Math.max(
          20,
          Math.floor((availableWidth - initialSpacing - endSpacing) / (data.length - 1))
        )
      : 40;

  const latestVal = data.length > 0 ? Math.round(data[data.length - 1].value) : null;

  return (
    <View style={styles.card}>
      {/* Clean Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Weekly Trajectory</Text>
          <Text style={styles.subtitle}>
            Estimated weekly footprint (kg CO₂e)
          </Text>
        </View>
        
      </View>

      {/* Chart Viewport */}
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
            height={135}
            width={chartWidth}
            maxValue={chartMax}
            color={POINT_COLOR}
            thickness={2.2}
            startFillColor="rgba(46,168,110,0.14)"
            endFillColor="rgba(46,168,110,0.00)"
            startOpacity={0.7}
            endOpacity={0.0}
            areaChart
            hideRules={false}
            rulesType="dashed"
            rulesColor="rgba(0,0,0,0.06)"
            yAxisColor="transparent"
            xAxisColor="rgba(0,0,0,0.08)"
            yAxisLabelWidth={yAxisLabelWidth}
            yAxisTextStyle={{
              color: "#94A3B8",
              fontSize: 9.5,
              fontFamily: "IBMPlexMono_500Medium",
            }}
            xAxisLabelTextStyle={{
              color: "#94A3B8",
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
            Gathering weekly footprint data...
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5ECE8",
    boxShadow: "0px 1px 4px rgba(0,0,0,0.03)",
    elevation: 1,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Nunito_500Medium",
    color: "#64748B",
    marginTop: 2,
  },
  chartWrapper: {
    width: "100%",
    paddingTop: 6,
    overflow: "hidden",
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#94A3B8",
    paddingVertical: 20,
    textAlign: "center",
  },
});
