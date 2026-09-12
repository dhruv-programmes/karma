import React from "react";
import { ScrollView as RNScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircularityRing } from "@/components/custom/circularity-ring";
import { CompareOption } from "@/components/custom/compare-option";
import { BackButton } from "@/components/custom/back-button";
import { ProductImage } from "@/components/custom/product-image";
import { SkeletonCard } from "@/components/custom/skeleton-card";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useCircularOptions } from "@/src/hooks/queries";
import {
  DEMO_REPAIR_ACTION_ID,
  mapActionToFacilityType,
  type ActionType,
} from "@/src/types/api";

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useCircularOptions(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const payload = data.data;
  const product = payload?.product;
  const best = payload?.best_option;

  function goForAction(actionType: ActionType, actionId?: string) {
    const facilityType = mapActionToFacilityType(actionType);
    if (!facilityType) {
      if (actionType === "REDUCE") {
        router.push("/offsets" as import("expo-router").Href);
        return;
      }
      return;
    }
    router.push({
      pathname: "/map",
      params: {
        type: facilityType,
        actionId: actionId ?? DEMO_REPAIR_ACTION_ID,
        actionType,
        productId: product?.id,
      },
    });
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 24,
        gap: 16,
      }}
    >
      <BackButton label="Back" fallbackRoute="/scan" />

      {data.isLoading || !product ? (
        <SkeletonCard height={280} />
      ) : (
        <>
          <Box className="flex-row gap-4">
            <ProductImage uri={product.image_url} size={96} radius={20} />
            <VStack space="xs" className="flex-1">
              <Badge action="muted" label={product.category} />
              <Heading size="xl">{product.name}</Heading>
              <Text className="text-muted-foreground">{product.brand}</Text>
              <Text size="sm" className="font-mono text-primary">
                {payload.carbon.display} (estimated)
              </Text>
            </VStack>
          </Box>

          <Box className="flex-row gap-4 items-center">
            <CircularityRing score={product.circularity_score} size={96} />
            <VStack space="xs" className="flex-1">
              <Text bold>Product circularity</Text>
              {Object.entries(product.circularity_breakdown).map(([k, v]) => (
                <Text
                  key={k}
                  size="xs"
                  className="text-muted-foreground capitalize"
                >
                  {k.replace("_", " ")} {v}
                </Text>
              ))}
            </VStack>
          </Box>

          <Text bold>What should you do?</Text>
          <RNScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
          >
            {payload.options.map((opt) => (
              <CompareOption
                key={opt.action_type}
                option={opt}
                selected={opt.action_type === best?.action_type}
                onPress={() => goForAction(opt.action_type)}
              />
            ))}
          </RNScrollView>

          {best ? (
            <Animated.View entering={FadeInDown.delay(200)}>
              <Card variant="softPop" className="gap-3">
                <Badge action="playful" label="Best for you" />
                <Heading size="xl">{best.title}</Heading>
                <Text className="text-muted-foreground">
                  ₹{Math.round(best.estimated_cost_inr).toLocaleString("en-IN")} · ~
                  {Math.round(best.co2e_avoided_kg)} kg CO₂e avoided
                  {best.expected_lifetime_months
                    ? ` · +${best.expected_lifetime_months} months`
                    : ""}
                </Text>
                <Text size="xs" className="text-muted-foreground">
                  {best.explanation}
                </Text>
                <VStack space="sm" className="mt-1">
                  <Button onPress={() => goForAction(best.action_type)}>
                    {best.action_type === "REPAIR"
                      ? "Find repair nearby"
                      : best.action_type === "RECYCLE"
                        ? "Find recycle drop"
                        : best.action_type === "DONATE"
                          ? "Find donation point"
                          : best.action_type === "RESELL"
                            ? "Find resale desk"
                            : "Take this action"}
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => goForAction("RECYCLE")}
                  >
                    Recycle instead
                  </Button>
                </VStack>
              </Card>
            </Animated.View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
