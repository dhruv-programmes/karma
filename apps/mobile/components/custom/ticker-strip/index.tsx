import React from "react";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Badge } from "@/components/ui/badge";

type Props = {
  points: number;
  streak: number;
  trend: number;
  level?: number;
};

export function TickerStrip({ points, streak, trend, level = 1 }: Props) {
  return (
    <Card variant="softPop" className="py-3">
      <HStack className="justify-around items-center">
        <TickerCell label="Karma Coins" value={`${points}`} />
        <TickerCell label="Streak" value={`${streak}d`} highlight={streak >= 5} />
        <TickerCell label="Level" value={`L${level}`} />
        <TickerCell label="Trend" value={`+${trend}`} highlight />
      </HStack>
      {streak >= 5 ? (
        <Badge
          action="playful"
          label={streak >= 7 ? "Week streak unlocked!" : "Streak heating up"}
          className="self-center mt-2"
        />
      ) : null}
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
          highlight ? "font-mono text-primary" : "font-mono text-foreground"
        }
      >
        {value}
      </Text>
    </VStack>
  );
}
