import React from "react";
import type { Recommendation } from "@/src/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type Props = {
  item: Recommendation;
  onPress?: () => void;
  hero?: boolean;
};

export function RecommendationCard({ item, onPress, hero }: Props) {
  return (
    <Pressable onPress={onPress}>
      <Card variant={hero ? "softPop" : "soft"}>
        <VStack space="sm">
          <HStack className="justify-between">
            <Badge action="success" label={item.category} />
            {hero ? <Badge action="playful" label="Best today" /> : null}
          </HStack>
          <Text size="2xl" bold>
            {item.title}
          </Text>
          <Text size="sm" className="text-muted-foreground">
            {item.subtitle}
          </Text>
          <HStack space="xl" className="mt-2">
            <VStack>
              <Text size="md" bold className="font-mono text-primary">
                ~{Math.round(item.co2e_avoided_kg)} kg
              </Text>
              <Text size="xs" className="text-muted-foreground">
                CO₂e avoided
              </Text>
            </VStack>
            <VStack>
              <Text size="md" bold className="font-mono">
                ₹{Math.round(item.money_impact_inr).toLocaleString("en-IN")}
              </Text>
              <Text size="xs" className="text-muted-foreground">
                potential
              </Text>
            </VStack>
          </HStack>
          <Text size="xs" className="text-muted-foreground">
            {item.effort} effort · {item.local_availability}
          </Text>
          <Button
            size="sm"
            variant={hero ? "playful" : "secondary"}
            onPress={onPress}
            className="self-start mt-2"
          >
            Explore
          </Button>
        </VStack>
      </Card>
    </Pressable>
  );
}
