import React from "react";
import { View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

const COLORS = [
  "rgb(46,168,110)",
  "rgb(255,150,120)",
  "rgb(56,152,196)",
  "rgb(232,168,56)",
  "rgb(140,110,168)",
];

export function CategoryDonut({
  purchases,
  transport,
  energy,
}: {
  purchases: number;
  transport: number;
  energy: number;
}) {
  const rows = [
    { label: "Purchases", value: purchases },
    { label: "Transport", value: transport },
    { label: "Energy", value: energy },
  ];
  const data = rows.map((r, i) => ({
    value: Math.max(0.1, r.value),
    color: COLORS[i],
    text: r.label,
  }));

  return (
    <Card variant="soft" className="gap-3">
      <Text bold>Mix this period</Text>
      <HStack className="items-center gap-4">
        <PieChart
          data={data}
          donut
          radius={72}
          innerRadius={42}
          innerCircleColor="rgb(255,255,255)"
          centerLabelComponent={() => (
            <View className="items-center">
              <Text size="xs" className="text-muted-foreground">
                total
              </Text>
              <Text bold className="font-mono">
                ~{Math.round(purchases + transport + energy)}
              </Text>
            </View>
          )}
        />
        <VStack space="sm" className="flex-1">
          {rows.map((r, i) => (
            <HStack key={r.label} className="justify-between items-center">
              <HStack className="items-center gap-2">
                <View
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i] }}
                />
                <Text size="sm">{r.label}</Text>
              </HStack>
              <Text size="sm" bold className="font-mono">
                ~{Math.round(r.value)}
              </Text>
            </HStack>
          ))}
        </VStack>
      </HStack>
    </Card>
  );
}
