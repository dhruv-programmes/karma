import React from "react";
import type { ImpactBreakdown } from "@/src/types/api";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export function CarbonBreakdown({ impact }: { impact: ImpactBreakdown }) {
  const rows = [
    { label: "Purchases", value: impact.purchases_kg },
    { label: "Transport", value: impact.transport_kg },
    { label: "Energy", value: impact.energy_kg },
  ];
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <Card variant="soft">
      <VStack space="md">
        <Badge action="playful" label={impact.month_label} />
        <Text size="4xl" bold className="font-mono">
          ~{Math.round(impact.total_kg)} kg
        </Text>
        <Text size="sm" className="text-muted-foreground">
          Estimated monthly footprint
        </Text>
        {rows.map((r) => (
          <VStack key={r.label} space="xs">
            <HStack className="justify-between">
              <Text>{r.label}</Text>
              <Text size="sm" className="font-mono text-muted-foreground">
                ~{Math.round(r.value)} kg
              </Text>
            </HStack>
            <Box className="h-2 bg-muted rounded-full overflow-hidden">
              <Box
                className="h-full bg-primary rounded-full"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </Box>
          </VStack>
        ))}
      </VStack>
    </Card>
  );
}
