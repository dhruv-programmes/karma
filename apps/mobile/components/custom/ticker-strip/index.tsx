import React from "react";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type Props = {
  points: number;
  streak: number;
  trend: number;
};

export function TickerStrip({ points, streak, trend }: Props) {
  return (
    <Card variant="softPop" className="py-3">
      <HStack className="justify-around">
        <TickerCell label="Points" value={`${points}`} />
        <TickerCell label="Streak" value={`${streak}d`} />
        <TickerCell label="Trend" value={`+${trend}`} highlight />
      </HStack>
    </Card>
  );
}

function TickerCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <VStack space="xs" className="items-center">
      <Text size="xs" className="text-muted-foreground">
        {label}
      </Text>
      <Text
        size="lg"
        bold
        className={
          highlight ? "font-mono text-accent-foreground" : "font-mono text-foreground"
        }
      >
        {value}
      </Text>
    </VStack>
  );
}
