import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { useRecommendations } from "@/src/hooks/queries";

export default function ActionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recs = useRecommendations();
  const item = recs.data?.find((r) => r.id === id) ?? recs.data?.[0];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!item) {
    return (
      <Box className="flex-1 bg-background px-6" style={{ paddingTop: insets.top + 24 }}>
        <Heading>Action</Heading>
      </Box>
    );
  }

  return (
    <Box
      className="flex-1 bg-background px-6 gap-4"
      style={{ paddingTop: insets.top + 16 }}
    >
      <Pressable onPress={() => router.back()}>
        <Text className="text-primary">Back</Text>
      </Pressable>
      <Text size="sm" bold className="text-secondary-foreground">
        {item.category}
      </Text>
      <Heading size="2xl">{item.title}</Heading>
      <Text className="text-muted-foreground">{item.explanation}</Text>
      <Card variant="softPop" className="gap-2">
        <Text bold className="font-mono">
          ~{Math.round(item.co2e_avoided_kg)} kg CO₂e avoided
        </Text>
        <Text bold className="font-mono">
          ₹{Math.round(item.money_impact_inr).toLocaleString("en-IN")} potential
        </Text>
        <Text size="sm" className="text-muted-foreground">
          {item.effort} effort · {item.local_availability}
        </Text>
      </Card>
      <Button
        onPress={() =>
          router.push({
            pathname: "/map",
            params: {
              type: item.action_type === "RECYCLE" ? "recycling" : "repair",
              actionId: item.id,
              productId: item.product_id ?? "",
            },
          })
        }
      >
        Take action nearby
      </Button>
    </Box>
  );
}
