import React from "react";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Progress } from "@/components/ui/progress";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export function BudgetRing({
  usedPct,
  budgetKg,
  thisMonthKg,
  status,
}: {
  usedPct: number;
  budgetKg: number;
  thisMonthKg: number;
  status: string;
}) {
  const tone =
    status === "over" ? "danger" : status === "watch" ? "warning" : "primary";
  const chipTone =
    status === "over" ? "warning" : status === "watch" ? "warning" : "success";

  return (
    <Card variant="softPop" className="gap-3">
      <Text bold>Monthly carbon budget</Text>
      <Chip
        tone={chipTone}
        label={
          status === "over"
            ? "Over budget"
            : status === "watch"
              ? "Close to limit"
              : "On track"
        }
      />
      <VStack space="sm">
        <Text size="2xl" bold className="font-mono text-primary">
          ~{Math.round(thisMonthKg)} / {Math.round(budgetKg)} kg
        </Text>
        <Progress value={usedPct} tone={tone === "danger" ? "danger" : tone === "warning" ? "warning" : "primary"} />
        <Text size="xs" className="text-muted-foreground">
          {Math.round(usedPct)}% of your {Math.round(budgetKg)} kg goal used this month
        </Text>
      </VStack>
    </Card>
  );
}
