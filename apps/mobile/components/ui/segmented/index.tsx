import React from "react";
import { View } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-row bg-muted rounded-full p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-1 py-2 rounded-full items-center ${active ? "bg-card" : ""}`}
          >
            <Text size="sm" bold className={active ? "text-primary" : "text-muted-foreground"}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
