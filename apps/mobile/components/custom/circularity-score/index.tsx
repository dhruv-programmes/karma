import React from "react";
import { CircularityRing } from "@/components/custom/circularity-ring";
import { Card } from "@/components/ui/card";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type Props = {
  score: number | null;
  minScore?: number;
  maxScore?: number;
  title?: string;
  detail?: string;
  onPress?: () => void;
};

export function CircularityScore({
  score,
  minScore,
  maxScore,
  title = "Carbon Credit Score",
  detail,
  onPress,
}: Props) {
  return (
    <Pressable onPress={onPress}>
      <Card variant="soft" className="flex-row items-center gap-4">
        <CircularityRing
          score={score}
          size={104}
          label={score === null ? "loading" : "KCS"}
          minScore={minScore}
          maxScore={maxScore}
        />
        <VStack space="xs" className="flex-1">
          <Text size="xs" bold className="text-primary">
            Carbon Credit Score
          </Text>
          <Text size="xl" bold>
            {title}
          </Text>
          {detail ? (
            <Text size="sm" className="text-muted-foreground">
              {detail}
            </Text>
          ) : null}
        </VStack>
      </Card>
    </Pressable>
  );
}
