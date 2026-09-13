import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Coins,
  ArrowRight,
  Leaf,
} from "lucide-react-native";
import { BackButton } from "@/components/custom/back-button";
import { RecommendationCard } from "@/components/custom/recommendation-card";
import { SkeletonCard } from "@/components/custom/skeleton-card";
import { Text } from "@/components/ui/text";
import { useRecommendations } from "@/src/hooks/queries";
import type { Recommendation } from "@/src/types/api";
import { useTabBarClearance } from "@/src/theme/layout";

const CATEGORIES = [
  { label: "All Actions", value: "ALL" },
  { label: "Electronics", value: "Electronics" },
  { label: "Energy & Solar", value: "Energy" },
  { label: "Clothing & Textile", value: "Clothing" },
  { label: "Food & Goods", value: "Food" },
];

export default function ActionsScreen() {
  const insets = useSafeAreaInsets();
  const tabClearance = useTabBarClearance();
  const router = useRouter();
  const recs = useRecommendations();
  const [activeCategory, setActiveCategory] = useState("ALL");

  const allItems = recs.data ?? [];

  // Filter recommendations based on selected category
  const filteredItems = useMemo(() => {
    if (activeCategory === "ALL") return allItems;
    return allItems.filter(
      (r) => (r.category || "").toLowerCase() === activeCategory.toLowerCase()
    );
  }, [allItems, activeCategory]);

  // Aggregate impact metrics
  const totalCo2e = allItems.reduce(
    (sum, r) => sum + (r.co2e_avoided_kg || 0),
    0
  );
  const totalMoney = allItems.reduce(
    (sum, r) => sum + (r.money_impact_inr || 0),
    0
  );
  const totalCoins = allItems.reduce(
    (sum, r) =>
      sum +
      Math.max(
        25,
        Math.round((r.co2e_avoided_kg || 15) * 0.6 + (r.score || 70) * 0.3)
      ),
    0
  );

  const handlePressAction = useCallback(
    (item: Recommendation) => {
      if (item.product_id) {
        router.push(`/product/${item.product_id}`);
      } else {
        router.push(`/action/${item.id}`);
      }
    },
    [router]
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        // Keep the action list from stretching past its intended top edge on
        // iOS. The dock already supplies the bottom breathing room.
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: tabClearance + 24,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <BackButton label="Back" fallbackRoute="/(tabs)" />

        <View style={styles.header}>
          <Text style={styles.title}>Actions</Text>
          <Text style={styles.subtitle}>
            High-impact circular choices tailored to your lifestyle
          </Text>
        </View>

        {/* ========================================================= */}
        {/* REWARDS & TOTAL POTENTIAL PERSUASION STRIP                */}
        {/* ========================================================= */}
        <View style={styles.rewardsPersuasionBar}>
          <View style={styles.rewardsBarLeft}>
            <View style={styles.rewardsCoinIconWrap}>
              <Coins size={20} color="#D97706" strokeWidth={2.4} />
            </View>
            <View style={styles.rewardsBarMeta}>
              <View style={styles.rewardsPointsRow}>
                <Text style={styles.rewardsPointsVal}>+{totalCoins}</Text>
                <Text style={styles.rewardsPointsLabel}>Karma Coins Ready</Text>
              </View>
              <Text style={styles.rewardsSubCopy} numberOfLines={2}>
                ~{Math.round(totalCo2e)} kg CO₂e potential · ₹{Math.round(totalMoney).toLocaleString("en-IN")} savings
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.rewardsBarBtn}
            onPress={() => router.push("/offers")}
            activeOpacity={0.8}
          >
            <Text style={styles.rewardsBarBtnText}>Offers</Text>
            <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {/* ========================================================= */}
        {/* Minimalist Segmented Category Tabs (NO PILLBOXES)         */}
        {/* ========================================================= */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {CATEGORIES.map((cat) => {
            const active = cat.value === activeCategory;
            return (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setActiveCategory(cat.value)}
                style={[styles.tabItem, active ? styles.tabItemActive : null]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    active ? styles.tabItemTextActive : null,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ========================================================= */}
        {/* Recommendations List                                      */}
        {/* ========================================================= */}
        {recs.isLoading ? (
          <View style={{ gap: 14 }}>
            <SkeletonCard height={200} />
            <SkeletonCard height={200} />
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Leaf size={28} color="#2EA86E" strokeWidth={2} />
            <Text style={styles.emptyTitle}>All caught up in this sector!</Text>
            <Text style={styles.emptySubtitle}>
              Check All Actions to discover other circular opportunities.
            </Text>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {filteredItems.map((item, index) => (
              <RecommendationCard
                key={item.id}
                item={item}
                hero={index === 0 && activeCategory === "ALL"}
                onPress={() => handlePressAction(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4FAF6",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    gap: 4,
    marginTop: 2,
  },
  title: {
    fontSize: 28,
    fontFamily: "Nunito_900Black",
    color: "#0D1811",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: "#5F7768",
    lineHeight: 18,
  },

  // Persuasion Bar (Elevated Botanical Aesthetic)
  rewardsPersuasionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.2,
    borderColor: "rgba(215, 235, 222, 0.95)",
    shadowColor: "#0F281B",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 12,
  },
  rewardsBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  rewardsCoinIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "#FDE68A",
    flexShrink: 0,
  },
  rewardsBarMeta: {
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  rewardsPointsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  rewardsPointsVal: {
    fontSize: 18,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
  },
  rewardsPointsLabel: {
    fontSize: 12.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#B45309",
    flexShrink: 1,
  },
  rewardsSubCopy: {
    fontSize: 11.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#5F7768",
    lineHeight: 16,
    flexShrink: 1,
  },
  rewardsBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0D251A",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    flexShrink: 0,
  },
  rewardsBarBtnText: {
    fontSize: 12,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
  },

  // Segmented Category Tabs (Clean & Minimalist, No Pillboxes)
  tabsContainer: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "transparent",
  },
  tabItemActive: {
    backgroundColor: "#0D251A",
  },
  tabItemText: {
    fontSize: 12.5,
    fontFamily: "Nunito_700Bold",
    color: "#64748B",
  },
  tabItemTextActive: {
    color: "#FFFFFF",
    fontFamily: "Nunito_800ExtraBold",
  },

  // Cards List
  cardsList: {
    gap: 14,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
    textAlign: "center",
  },
});
