import React from "react";
import { Platform, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

const POINT_COLOR = "rgb(46,168,110)";
const POINT_SIZE = 8;

function DataPoint() {
  return (
    <View
      style={{
        width: POINT_SIZE,
        height: POINT_SIZE,
        borderRadius: POINT_SIZE / 2,
        backgroundColor: POINT_COLOR,
      }}
    />
  );
}

export function FootprintTrend({
  points,
}: {
  points: { label: string; kg: number }[];
}) {
  const data = points.map((p) => ({
    value: p.kg,
    label: p.label,
    dataPointText: `${Math.round(p.kg)}`,
  }));

  return (
    <Card variant="soft" className="gap-3 overflow-hidden">
      <Text bold>Weekly footprint pulse</Text>
      <Text size="xs" className="text-muted-foreground -mt-1">
        Estimated kg CO₂e from your transactions
      </Text>
      {data.length ? (
        <View className="mt-2 -ml-2">
          <LineChart
            data={data}
            height={160}
            width={300}
            color={POINT_COLOR}
            thickness={3}
            startFillColor="rgba(46,168,110,0.25)"
            endFillColor="rgba(46,168,110,0.02)"
            startOpacity={0.9}
            endOpacity={0.05}
            areaChart
            hideRules={false}
            rulesColor="rgb(210,230,218)"
            yAxisColor="transparent"
            xAxisColor="rgb(210,230,218)"
            yAxisTextStyle={{ color: "rgb(100,120,110)", fontSize: 10 }}
            xAxisLabelTextStyle={{ color: "rgb(100,120,110)", fontSize: 10 }}
            dataPointsColor={POINT_COLOR}
            dataPointsHeight={POINT_SIZE}
            dataPointsWidth={POINT_SIZE}
            curved
            noOfSections={4}
            focusEnabled={false}
            // Avoid SVG circle onPress/onPressOut props that React DOM rejects on web.
            {...(Platform.OS === "web"
              ? {
                  customDataPoint: () => <DataPoint />,
                }
              : {})}
          />
        </View>
      ) : (
        <Text size="sm" className="text-muted-foreground">
          Not enough weeks yet.
        </Text>
      )}
    </Card>
  );
}
