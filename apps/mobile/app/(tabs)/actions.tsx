import React, { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecommendationCard } from "@/components/custom/recommendation-card";
import { ScreenHeader } from "@/components/custom/screen-header";
import { SkeletonCard } from "@/components/custom/skeleton-card";
import { useRecommendations } from "@/src/hooks/queries";
import type { Recommendation } from "@/src/types/api";
import { useTabBarClearance } from "@/src/theme/layout";

export default function ActionsScreen() {
  const insets = useSafeAreaInsets();
  const tabClearance = useTabBarClearance();
  const router = useRouter();
  const recs = useRecommendations();

  const renderItem = useCallback(
    ({ item }: { item: Recommendation }) => (
      <View style={styles.listItem}>
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
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <View style={styles.headerPad}>
        <ScreenHeader
          eyebrow="ACTIONS"
          title="Actions"
          subtitle="Concrete next moves — not generic tips."
        />
      </View>

      {recs.isLoading ? (
        <View style={styles.skeletonPad}>
          <SkeletonCard />
          <View style={{ height: 14 }} />
          <SkeletonCard />
        </View>
      ) : (
        <FlashList
          data={recs.data ?? []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: tabClearance,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4FAF6",
  },
  headerPad: {
    paddingHorizontal: 20,
  },
  skeletonPad: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  listItem: {
    marginBottom: 14,
  },
});
