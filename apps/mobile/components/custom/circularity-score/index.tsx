import React from "react";
import { CircularityRing } from "@/components/custom/circularity-ring";
import { Card } from "@/components/ui/card";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type Props = {
  score: number;
  trendDelta?: number;
  onPress?: () => void;
};

export function CircularityScore({ score, trendDelta = 0, onPress }: Props) {
  return (
    <Pressable onPress={onPress}>
      <Card variant="soft" className="flex-row items-center gap-4">
        <CircularityRing score={score} size={104} />
        <VStack space="xs" className="flex-1">
          <Text size="xs" bold className="text-primary">
            Your loop
          </Text>
          <Text size="xl" bold>
            Circularity score
          </Text>
          {trendDelta > 0 ? (
            <Text size="sm" className="font-mono text-primary">
              ↑ +{trendDelta} this month — nice!
            </Text>
          ) : (
            <Text size="sm" className="text-muted-foreground">
              Based on real actions
            </Text>
          )}
        </VStack>
      </Card>
    </Pressable>
  );
}
