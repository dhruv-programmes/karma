import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
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
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 16 }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 24,
          gap: 12,
        }}
      >
        <Animated.View entering={ZoomIn.duration(320)}>
          <Badge action="playful" label="Document imported" />
        </Animated.View>
        <Heading size="2xl">Added to footprint</Heading>
        <Text size="sm" className="text-muted-foreground">
          {params.message ||
            `Imported ${params.imported ?? recent.length} line items into your footprint.`}
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
      </ScrollView>

      <Box
        className="px-6 pt-4 border-t border-border bg-background"
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <VStack className="gap-3">
          <Button onPress={() => router.replace(`/(tabs)/impact` as never)}>
            View updated impact
          </Button>
          <Button
            variant="outline"
            onPress={() => router.replace(`/product/${DEMO_PHONE_ID}`)}
          >
            Open circular decision
          </Button>
        </VStack>
      </Box>
    </Box>
  );
}
