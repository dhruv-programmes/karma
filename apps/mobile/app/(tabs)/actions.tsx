import React, { useCallback } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecommendationCard } from "@/components/custom/recommendation-card";
import { SkeletonCard } from "@/components/custom/skeleton-card";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { useRecommendations } from "@/src/hooks/queries";
import type { Recommendation } from "@/src/types/api";

export default function ActionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const recs = useRecommendations();

  const renderItem = useCallback(
    ({ item }: { item: Recommendation }) => (
      <View className="mb-4">
        <RecommendationCard
          item={item}
          onPress={() =>
            router.push(
              item.product_id
                ? `/product/${item.product_id}`
                : `/action/${item.id}`
            )
          }
        />
      </View>
    ),
    [router]
  );

  return (
    <Box
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom }}
    >
      <Heading size="2xl" className="px-6">
        Actions
      </Heading>
      <Text className="px-6 text-muted-foreground mt-1">
        Concrete next moves — not generic tips.
      </Text>

      {recs.isLoading ? (
        <Box className="px-6 mt-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </Box>
      ) : (
        <FlashList
          data={recs.data ?? []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 32,
          }}
        />
      )}
    </Box>
  );
}
