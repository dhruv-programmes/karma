import React from "react";
import { ScrollView as RNScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircularityRing } from "@/components/custom/circularity-ring";
import { CompareOption } from "@/components/custom/compare-option";
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
import { DEMO_REPAIR_ACTION_ID } from "@/src/types/api";

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useCircularOptions(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const payload = data.data;
  const product = payload?.product;
  const best = payload?.best_option;

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
      <Pressable onPress={() => router.back()}>
        <Text className="text-primary">Back</Text>
      </Pressable>

      {data.isLoading || !product ? (
        <SkeletonCard height={280} />
      ) : (
        <>
          <Box className="flex-row gap-4">
            {product.image_url ? (
              <Image
                source={{ uri: product.image_url }}
                style={{ width: 96, height: 96, borderRadius: 20 }}
              />
            ) : null}
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
                <Text key={k} size="xs" className="text-muted-foreground capitalize">
                  {k.replace("_", " ")} {v}
                </Text>
              ))}
            </VStack>
          </Box>

          <Text bold>What should you do?</Text>
          <RNScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Box className="flex-row gap-3 py-2">
              {payload.options.map((opt) => (
                <CompareOption
                  key={opt.action_type}
                  option={opt}
                  selected={opt.action_type === best?.action_type}
                />
              ))}
            </Box>
          </RNScrollView>

          {best ? (
            <Animated.View entering={FadeInDown.delay(200)}>
              <Card variant="softPop" className="gap-2">
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
                <Box className="flex-row gap-3 mt-3">
                  <Button
                    className="flex-1"
                    onPress={() =>
                      router.push({
                        pathname: "/map",
                        params: {
                          type: "repair",
                          actionId: DEMO_REPAIR_ACTION_ID,
                          productId: product.id,
                        },
                      })
                    }
                  >
                    Find repair
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onPress={() => router.push("/map?type=recycling")}
                  >
                    Recycle device
                  </Button>
                </Box>
              </Card>
            </Animated.View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
