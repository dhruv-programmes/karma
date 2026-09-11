import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { useTransactions } from "@/src/hooks/queries";
import { DEMO_PHONE_ID } from "@/src/types/api";

export default function ReceiptResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    imported?: string;
    message?: string;
    badge?: string;
  }>();
  const txns = useTransactions();
  const recent = (txns.data ?? []).slice(-6).reverse();

  return (
    <Box
      className="flex-1 bg-background px-6 gap-4"
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
    >
      <Animated.View entering={ZoomIn.duration(320)}>
        <Badge action="playful" label="Receipt parsed" />
      </Animated.View>
      <Heading size="2xl">Added to footprint</Heading>
      <Text size="sm" className="text-muted-foreground">
        {params.message ||
          `Imported ${params.imported ?? recent.length} line items (demo NLP).`}
      </Text>
      {params.badge ? (
        <Badge
          action="success"
          label={`Unlocked ${params.badge.replace(/_/g, " ")}`}
        />
      ) : null}

      {recent.map((item, i) => (
        <Animated.View key={item.id} entering={FadeInDown.delay(80 * i)}>
          <Card variant="soft">
            <Text bold>{item.merchant}</Text>
            <Text size="sm" className="text-muted-foreground mt-1">
              {item.category} · ₹{item.amount_inr.toLocaleString("en-IN")} ·{" "}
              {item.date}
            </Text>
          </Card>
        </Animated.View>
      ))}

      <Button onPress={() => router.replace(`/(tabs)/impact` as never)}>
        View updated impact
      </Button>
      <Button
        variant="outline"
        onPress={() => router.replace(`/product/${DEMO_PHONE_ID}`)}
      >
        Open circular decision
      </Button>
    </Box>
  );
}
