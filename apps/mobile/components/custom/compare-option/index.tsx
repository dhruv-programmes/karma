import React from "react";
import { StyleSheet, View } from "react-native";
import type { CircularOption } from "@/src/types/api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

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
    <Pressable onPress={onPress} style={styles.pressable}>
      <Card
        variant={selected ? "softPop" : "soft"}
        style={styles.card}
        className="justify-between"
      >
        <View style={styles.header}>
          <Text
            size="md"
            bold
            numberOfLines={2}
            className={selected ? "text-primary flex-1" : "flex-1"}
            style={styles.title}
          >
            {option.title}
          </Text>
          <View style={styles.badgeSlot}>
            {selected ? <Badge action="playful" label="Best" /> : null}
          </View>
        </View>

        <Text size="sm" bold className="font-mono">
          {money}
        </Text>
        <Text size="xs" bold className="text-primary">
          ~{Math.round(option.co2e_avoided_kg)} kg CO₂e avoided
        </Text>
        <Text size="xs" className="text-muted-foreground" style={styles.lifetime}>
          {option.expected_lifetime_months
            ? `+${option.expected_lifetime_months} months life`
            : " "}
        </Text>
        <Text size="xs" className="text-muted-foreground" numberOfLines={2}>
          {option.availability}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: 172,
    height: 196,
  },
  card: {
    width: "100%",
    height: "100%",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 44,
  },
  title: {
    flex: 1,
  },
  badgeSlot: {
    width: 52,
    height: 24,
    alignItems: "flex-end",
  },
  lifetime: {
    minHeight: 18,
  },
});
