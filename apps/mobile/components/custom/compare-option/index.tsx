import React from "react";
import type { CircularOption } from "@/src/types/api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type Props = {
  option: CircularOption;
  selected?: boolean;
  onPress?: () => void;
};

export function CompareOption({ option, selected, onPress }: Props) {
  const money =
    option.money_return_inr && option.money_return_inr > 0
      ? `Return ₹${Math.round(option.money_return_inr).toLocaleString("en-IN")}`
      : `₹${Math.round(option.estimated_cost_inr).toLocaleString("en-IN")}`;

  return (
    <Pressable onPress={onPress}>
      <Card
        variant={selected ? "softPop" : "soft"}
        className="min-w-[160px]"
      >
        <VStack space="xs">
          <HStack className="justify-between">
            <Text size="md" bold className={selected ? "text-primary" : ""}>
              {option.title}
            </Text>
            {selected ? <Badge action="playful" label="Best" /> : null}
          </HStack>
          <Text size="sm" className="font-mono">
            {money}
          </Text>
          <Text size="xs" className="text-primary">
            ~{Math.round(option.co2e_avoided_kg)} kg CO₂e avoided
          </Text>
          {option.expected_lifetime_months ? (
            <Text size="xs" className="text-muted-foreground">
              +{option.expected_lifetime_months} months life
            </Text>
          ) : null}
          <Text size="xs" className="text-muted-foreground mt-1">
            {option.availability}
          </Text>
        </VStack>
      </Card>
    </Pressable>
  );
}
