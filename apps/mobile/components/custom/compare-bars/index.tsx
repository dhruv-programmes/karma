import React from "react";
import { BarChart } from "react-native-gifted-charts";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

export function CompareBars({
  previousKg,
  thisKg,
}: {
  previousKg: number;
  thisKg: number;
}) {
  const data = [
    {
      value: previousKg,
      label: "Feb",
      frontColor: "rgb(56,152,196)",
      topLabelComponent: () => (
        <Text size="xs" className="font-mono text-muted-foreground">
          {Math.round(previousKg)}
        </Text>
      ),
    },
    {
      value: thisKg,
      label: "Mar",
      frontColor: "rgb(46,168,110)",
      topLabelComponent: () => (
        <Text size="xs" className="font-mono text-primary">
          {Math.round(thisKg)}
        </Text>
      ),
    },
  ];

  return (
    <Card variant="soft" className="gap-3">
      <Text bold>Month vs month</Text>
      <Text size="xs" className="text-muted-foreground -mt-1">
        Estimated kg CO₂e
      </Text>
      <BarChart
        data={data}
        barWidth={48}
        spacing={48}
        roundedTop
        roundedBottom
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        noOfSections={3}
        height={140}
        width={260}
        yAxisTextStyle={{ color: "rgb(100,120,110)", fontSize: 10 }}
        xAxisLabelTextStyle={{ color: "rgb(100,120,110)", fontSize: 12 }}
      />
    </Card>
  );
}
