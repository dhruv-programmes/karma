<<<<<<< HEAD
import React, { useCallback } from "react";
import { StyleSheet, View } from "react-native";
=======
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
>>>>>>> 0a89030986d80ed0ce11f6ef943295ed1c5723ac
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Coins,
  ArrowRight,
  Sparkles,
  Zap,
  Leaf,
  Layers,
} from "lucide-react-native";
import { BackButton } from "@/components/custom/back-button";
import { RecommendationCard } from "@/components/custom/recommendation-card";
import { ScreenHeader } from "@/components/custom/screen-header";
import { SkeletonCard } from "@/components/custom/skeleton-card";
<<<<<<< HEAD
import { useRecommendations } from "@/src/hooks/queries";
=======
import { Text } from "@/components/ui/text";
import { useRecommendations, useScore } from "@/src/hooks/queries";
>>>>>>> 0a89030986d80ed0ce11f6ef943295ed1c5723ac
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
  const score = useScore();

<<<<<<< HEAD
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
=======
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
>>>>>>> 0a89030986d80ed0ce11f6ef943295ed1c5723ac
    [router]
  );

  return (
<<<<<<< HEAD
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
=======
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: tabClearance + 24,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* Top Header: BackButton + Title & Subtitle                 */}
        {/* ========================================================= */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <BackButton label="Home" fallbackRoute="/(tabs)" />
          </View>
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
              <Coins size={17} color="#B45309" strokeWidth={2.4} />
            </View>
            <View style={styles.rewardsBarMeta}>
              <View style={styles.rewardsPointsRow}>
                <Text style={styles.rewardsPointsVal}>+{totalCoins}</Text>
                <Text style={styles.rewardsPointsLabel}>Karma Coins Ready</Text>
              </View>
              <Text style={styles.rewardsSubCopy}>
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
            <ArrowRight size={12} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* ========================================================= */}
        {/* Category Sub-Filter Pills                                 */}
        {/* ========================================================= */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
        >
          {CATEGORIES.map((cat) => {
            const active = cat.value === activeCategory;
            return (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setActiveCategory(cat.value)}
                style={[styles.pill, active ? styles.pillActive : null]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    active ? styles.pillTextActive : null,
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
>>>>>>> 0a89030986d80ed0ce11f6ef943295ed1c5723ac
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4FAF6",
  },
<<<<<<< HEAD
  headerPad: {
    paddingHorizontal: 20,
  },
  skeletonPad: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  listItem: {
    marginBottom: 14,
=======
  scrollView: {
    flex: 1,
  },
  header: {
    gap: 4,
  },
  headerTopRow: {
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Nunito_900Black",
    color: "#0D1811",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    lineHeight: 18,
  },

  // Persuasion Bar (Matching Solar & Impact)
  rewardsPersuasionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    boxShadow: "0px 2px 6px rgba(0,0,0,0.04)",
    elevation: 1,
  },
  rewardsBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rewardsCoinIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  rewardsBarMeta: {
    gap: 1,
    flex: 1,
  },
  rewardsPointsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  rewardsPointsVal: {
    fontSize: 16,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
  },
  rewardsPointsLabel: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#B45309",
  },
  rewardsSubCopy: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
  },
  rewardsBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D1811",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  rewardsBarBtnText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },

  // Category Pills
  pillsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.2)",
  },
  pillActive: {
    backgroundColor: "#0D1811",
    borderColor: "#0D1811",
  },
  pillText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#526658",
  },
  pillTextActive: {
    color: "#FFFFFF",
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
>>>>>>> 0a89030986d80ed0ce11f6ef943295ed1c5723ac
  },
});
