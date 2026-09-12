import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  ChevronLeft,
  Coins,
  Award,
  Sparkles,
  Flame,
  Leaf,
  Check,
  Copy,
  TicketPercent,
  Tag,
  ArrowRight,
  Gift,
  TreePine,
  ShieldCheck,
  Clock,
  Wrench,
  ExternalLink,
  History,
} from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { BackButton } from "@/components/custom/back-button";
import { PointsCounter } from "@/components/custom/points-counter";
import { ProductImage } from "@/components/custom/product-image";
import { useActivity, useMe, useRedeemReward, useRewards } from "@/src/hooks/queries";
import { useAppStore } from "@/src/store/app";
import { useAuthStore } from "@/src/store/auth";

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useMe();
  const rewards = useRewards();
  const redeem = useRedeemReward();
  const lastPoints = useAppStore((s) => s.lastPointsAwarded);
  const authUser = useAuthStore((s) => s.user);
  const activity = useActivity();

  const [claimCode, setClaimCode] = useState<string | null>(null);
  const [claimedTitle, setClaimedTitle] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const pointsBalance = me.data?.impact_points ?? authUser?.impact_points ?? null;
  const streakDays = me.data?.streak_days ?? authUser?.streak_days ?? null;
  const loopLevel = me.data?.loop_level ?? authUser?.loop_level ?? null;
  const offsetKg = me.data?.offset_kg_total ?? authUser?.offset_kg_total ?? null;
  const latestActivityPoints = activity.data?.find((event) => event.points_delta > 0)?.points_delta ?? null;
  const latestEarnedPoints = lastPoints ?? latestActivityPoints;

  const brandRewards = (rewards.data ?? []).filter((r) => r.brand);

  // Fallback demo rewards if query is still loading or empty
  const displayRewards =
    brandRewards.length > 0
      ? brandRewards
      : [
          {
            id: "rw-repair-350",
            title: "₹350 Master Repair Subsidy",
            brand: "Local Repair Café Network",
            points_required: 300,
            description:
              "Certified credit towards phone battery replacement, shoe resoling, or jacket seam repair.",
            cover_image_url: null,
            expires_on: "In 60 days",
          },
          {
            id: "rw-solar-500",
            title: "Rooftop Solar Inspection Voucher",
            brand: "Clean Energy Alliance",
            points_required: 400,
            description:
              "Complimentary thermal roof audit and DISCOM empanelled installation guidance.",
            cover_image_url: null,
            expires_on: "In 45 days",
          },
          {
            id: "rw-zerowaste-400",
            title: "₹400 Off Package-Free Pantry",
            brand: "Bare Necessities Zero Waste",
            points_required: 250,
            description:
              "Redeemable on bulk food grains, solid shampoo bars, and refillable botanical cleaners.",
            cover_image_url: null,
            expires_on: "In 30 days",
          },
          {
            id: "rw-patagonia-worn",
            title: "30% Off Garment Care & Gear",
            brand: "Patagonia Worn Wear",
            points_required: 350,
            description:
              "Special circular discount on certified repair services and recycled outerwear lines.",
            cover_image_url: null,
            expires_on: "In 30 days",
          },
        ];

  async function onRedeem(id: string, title: string, cost: number) {
    if (pointsBalance === null) {
      alert("Your Karma Coin balance is still loading. Please try again.");
      return;
    }
    if (pointsBalance < cost) {
      alert(`You need ${cost - pointsBalance} more Karma Coins to unlock this reward!`);
      return;
    }

    try {
      const result = await redeem.mutateAsync(id);
      if (!result.claim_code) {
        throw new Error("The server did not return a claim code.");
      }
      setClaimCode(result.claim_code);
      setClaimedTitle(title);
      setFlash(true);
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {
        /* simulator */
      }
      setTimeout(() => setFlash(false), 1800);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to redeem this reward right now.");
    }
  }

  const copyCode = async (code: string) => {
    try {
      if (Platform.OS === "web") {
        navigator.clipboard.writeText(code);
      } else {
        await Share.share({
          message: `Here is my Carbon Loop reward claim code: ${code}`,
        });
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 36,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* Navigation Bar                                            */}
        {/* ========================================================= */}
        <View style={styles.navBar}>
          <BackButton label="Back" fallbackRoute="/(tabs)" />
          <View style={styles.navTitleWrap}>
            <Text style={styles.navTitle}>Green Rewards</Text>
          </View>
          <TouchableOpacity
            style={styles.leaderboardLink}
            onPress={() => router.push("/community")}
          >
            <Text style={styles.leaderboardLinkText}>Community</Text>
          </TouchableOpacity>
        </View>

        {/* ========================================================= */}
        {/* Hero Impact Balance Card (Exact Offers Style)             */}
        {/* ========================================================= */}
        <LinearGradient
          colors={["#0C2518", "#143C28", "#0B1D14"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroGlowOrb} />

          {/* Top Header Row */}
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroPill}>
              <Coins size={13} color="#5EEAD4" strokeWidth={2.4} />
              <Text style={styles.heroPillText}>IMPACT BALANCE</Text>
            </View>
            <View style={styles.levelBadge}>
              <Award size={13} color="#FBBF24" strokeWidth={2.2} />
              <Text style={styles.levelBadgeText}>Level {loopLevel} Member</Text>
            </View>
          </View>

          {/* Big Balance Readout */}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceNumber}>{pointsBalance ?? "—"}</Text>
            <View style={styles.balanceMeta}>
              <Text style={styles.balanceUnit}>Karma Coins</Text>
              <Text style={styles.balanceSubtext}>Karma Coins Available to Spend</Text>
            </View>
          </View>

          {/* 3-Column Stats Row */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <View style={styles.heroStatIconRow}>
                <Flame size={12} color="#FB923C" strokeWidth={2.4} />
                <Text style={styles.heroStatValue}>
                  {streakDays === null ? "—" : `${streakDays}d Active`}
                </Text>
              </View>
              <Text style={styles.heroStatLabel}>Daily Streak</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <View style={styles.heroStatIconRow}>
                <Leaf size={12} color="#5EEAD4" strokeWidth={2.4} />
                <Text style={styles.heroStatValue}>
                  {offsetKg === null ? "—" : `${Math.round(offsetKg)} kg`}
                </Text>
              </View>
              <Text style={styles.heroStatLabel}>Carbon Offset</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <View style={styles.heroStatIconRow}>
                <Sparkles size={12} color="#FBBF24" strokeWidth={2.4} />
                <Text style={styles.heroStatValue}>
                  {latestEarnedPoints === null ? "—" : `+${latestEarnedPoints} Karma Coins`}
                </Text>
              </View>
              <Text style={styles.heroStatLabel}>Last Earned</Text>
            </View>
          </View>
        </LinearGradient>

        <TouchableOpacity
          style={styles.historyLink}
          onPress={() => router.push("/rewards/history")}
          activeOpacity={0.8}
        >
          <History size={16} color="#047857" strokeWidth={2.2} />
          <View style={styles.historyCopy}>
            <Text style={styles.historyTitle}>View points history</Text>
            <Text style={styles.historySubtitle}>See every earned and spent Karma Coin</Text>
          </View>
          <ArrowRight size={15} color="#047857" strokeWidth={2.2} />
        </TouchableOpacity>

        {/* ========================================================= */}
        {/* Active Claimed Voucher Banner                             */}
        {/* ========================================================= */}
        {claimCode ? (
          <View style={styles.claimedCard}>
            <View style={styles.claimedHeader}>
              <View style={styles.claimedBadge}>
                <Check size={12} color="#059669" strokeWidth={2.4} />
                <Text style={styles.claimedBadgeText}>READY IN YOUR WALLET</Text>
              </View>
              <Text style={styles.claimedMeta}>Present at checkout</Text>
            </View>

            {claimedTitle ? (
              <Text style={styles.claimedTitleText}>{claimedTitle}</Text>
            ) : null}

            <View style={styles.promoCodeBox}>
              <Text style={styles.promoCodeLabel}>VOUCHER CLAIM CODE</Text>
              <Text style={styles.promoCodeText}>{claimCode}</Text>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => copyCode(claimCode)}
                activeOpacity={0.8}
              >
                {copied ? (
                  <Check size={13} color="#059669" strokeWidth={2.2} />
                ) : (
                  <Copy size={13} color="#183222" strokeWidth={2.2} />
                )}
                <Text
                  style={[
                    styles.copyBtnText,
                    copied ? styles.copyBtnTextCopied : null,
                  ]}
                >
                  {copied ? "Copied to Clipboard!" : "Copy Code"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.claimedFootnote}>
              Valid at authorized partner locations and online checkouts. Show this screen or copy the code.
            </Text>
          </View>
        ) : null}

        {/* ========================================================= */}
        {/* Curated Partner Offers Catalog                            */}
        {/* ========================================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Partner Perks & Subsidies</Text>
            <Text style={styles.sectionSubtitle}>
              Direct discounts on circular products, repairs & clean energy
            </Text>
          </View>
        </View>

        <View style={styles.rewardsList}>
          {displayRewards.map((reward) => {
            const cost = reward.points_required ?? 250;
            const canAfford = pointsBalance !== null && pointsBalance >= cost;

            return (
              <View key={reward.id} style={styles.rewardCard}>
                {/* Header: Category Badge + Points Required */}
                <View style={styles.rewardCardHeader}>
                  <View style={styles.rewardCategoryBadge}>
                    <Tag size={11} color="#047857" strokeWidth={2.4} />
                    <Text style={styles.rewardCategoryBadgeText}>
                      CIRCULAR REWARD
                    </Text>
                  </View>

                  <View style={styles.rewardPointsBadge}>
                    <Coins size={12} color="#B45309" strokeWidth={2.2} />
                    <Text style={styles.rewardPointsBadgeText}>
                      {cost} Karma Coins Required
                    </Text>
                  </View>
                </View>

                {/* Body */}
                <View style={styles.rewardBody}>
                  {reward.brand ? (
                    <Text style={styles.rewardBrand}>{reward.brand}</Text>
                  ) : null}
                  <Text style={styles.rewardTitle}>{reward.title}</Text>
                  <Text style={styles.rewardDescription}>
                    {reward.description}
                  </Text>

                  {/* Impact Highlight Box (Offers Style) */}
                  <View style={styles.rewardImpactBox}>
                    <Leaf size={12} color="#166534" strokeWidth={2.2} />
                    <Text style={styles.rewardImpactText}>
                      Verified circular action · Diverts landfill waste
                    </Text>
                  </View>
                </View>

                {/* Footer: Points pill + Clean Action Button */}
                <View style={styles.rewardFooter}>
                  <View style={styles.rewardCostPill}>
                    <Coins size={14} color="#B45309" strokeWidth={2.4} />
                    <Text style={styles.rewardCostText}>{cost} Karma Coins</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.redeemBtn,
                      !canAfford ? styles.redeemBtnDisabled : null,
                    ]}
                    onPress={() => onRedeem(reward.id, reward.title, cost)}
                    disabled={!canAfford || redeem.isPending}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.redeemBtnText,
                        !canAfford ? styles.redeemBtnTextDisabled : null,
                      ]}
                    >
                      {canAfford
                        ? "Redeem Perk"
                        : pointsBalance === null
                          ? "Balance unavailable"
                          : `Need ${cost - pointsBalance} Karma Coins`}
                    </Text>
                    {canAfford ? (
                      <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.2} />
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* ========================================================= */}
        {/* Direct Link to Government Subsidies & Offsets             */}
        {/* ========================================================= */}
        <View style={styles.shortcutsCard}>
          <View style={styles.shortcutHeader}>
            <View style={styles.iconCircle}>
              <TreePine size={18} color="#2EA86E" strokeWidth={2.2} />
            </View>
            <View style={styles.shortcutInfo}>
              <Text style={styles.shortcutTitle}>Looking for More Offers?</Text>
              <Text style={styles.shortcutSubtitle}>
                Explore nationwide government subsidies and Gold Standard offsets
              </Text>
            </View>
          </View>

          <View style={styles.shortcutsRow}>
            <TouchableOpacity
              style={styles.shortcutSubBtn}
              onPress={() => router.push("/offers")}
              activeOpacity={0.8}
            >
              <TicketPercent size={15} color="#183222" strokeWidth={2.2} />
              <Text style={styles.shortcutSubBtnText}>All Govt Offers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutPrimaryBtn}
              onPress={() => router.push("/offsets" as import("expo-router").Href)}
              activeOpacity={0.8}
            >
              <TreePine size={15} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.shortcutPrimaryBtnText}>Donate Offsets</Text>
            </TouchableOpacity>
          </View>
        </View>

        <PointsCounter
          points={0}
          visible={flash}
          label="Reward Unlocked & Added to Wallet!"
        />
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

  // Navigation Bar
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.22)",
    boxShadow: "0px 1px 4px rgba(0,0,0,0.04)",
    elevation: 1,
  },
  navTitleWrap: {
    flex: 1,
  },
  navBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(46,168,110,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  navBadgeText: {
    fontSize: 9.5,
    fontFamily: "Nunito_700Bold",
    color: "#047857",
    letterSpacing: 0.8,
  },
  navTitle: {
    fontSize: 26,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    letterSpacing: -0.5,
  },
  leaderboardLink: {
    backgroundColor: "#E3F5EA",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  leaderboardLinkText: {
    color: "#0E2A1E",
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
  },

  // Hero Card (Matching Offers Hero)
  heroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.25)",
    overflow: "hidden",
    position: "relative",
    boxShadow: "0px 8px 16px rgba(5,150,105,0.15)",
    elevation: 6,
  },
  historyLink: {
    marginTop: -6,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CFE6D8",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyCopy: { flex: 1 },
  historyTitle: { color: "#183222", fontSize: 13, fontFamily: "Nunito_800ExtraBold" },
  historySubtitle: { color: "#789185", fontSize: 11, fontFamily: "Nunito_600SemiBold", marginTop: 2 },
  heroGlowOrb: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(46,168,110,0.18)",
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(46,168,110,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroPillText: {
    fontSize: 10,
    fontFamily: "Nunito_800ExtraBold",
    color: "#5EEAD4",
    letterSpacing: 0.8,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(251,191,36,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
  },
  levelBadgeText: {
    fontSize: 11,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FBBF24",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 18,
  },
  balanceNumber: {
    fontSize: 42,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  balanceMeta: {
    gap: 2,
    flex: 1,
  },
  balanceUnit: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#5EEAD4",
  },
  balanceSubtext: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "rgba(255,255,255,0.5)",
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 14,
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
  },
  heroStatIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroStatValue: {
    fontSize: 14,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#FFFFFF",
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },

  // Active Claimed Voucher
  claimedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.3)",
    boxShadow: "0px 2px 8px rgba(5,150,105,0.06)",
    elevation: 2,
    gap: 10,
  },
  claimedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  claimedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  claimedBadgeText: {
    fontSize: 9.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
    letterSpacing: 0.5,
  },
  claimedMeta: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#7A9082",
  },
  claimedTitleText: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  promoCodeBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#2EA86E",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  promoCodeLabel: {
    fontSize: 9,
    fontFamily: "Nunito_800ExtraBold",
    color: "#047857",
    letterSpacing: 0.8,
  },
  promoCodeText: {
    fontSize: 20,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
    letterSpacing: 1.5,
    marginVertical: 6,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.3)",
  },
  copyBtnText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
  copyBtnTextCopied: {
    color: "#059669",
  },
  claimedFootnote: {
    fontSize: 10.5,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
    lineHeight: 14,
    textAlign: "center",
  },

  // Section Header
  sectionHeader: {
    marginTop: 4,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    marginTop: 1,
  },

  // Rewards List
  rewardsList: {
    gap: 12,
  },
  rewardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
    elevation: 2,
  },
  rewardCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  rewardCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(4,120,87,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rewardCategoryBadgeText: {
    fontSize: 9,
    fontFamily: "Nunito_700Bold",
    color: "#047857",
    letterSpacing: 0.5,
  },
  rewardPointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
  },
  rewardPointsBadgeText: {
    fontSize: 9.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#B45309",
    letterSpacing: 0.3,
  },
  rewardBody: {
    marginBottom: 12,
  },
  rewardBrand: {
    fontSize: 11.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#7A9082",
    marginBottom: 2,
  },
  rewardTitle: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    lineHeight: 20,
  },
  rewardDescription: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    lineHeight: 16,
    marginTop: 4,
  },
  rewardImpactBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  rewardImpactText: {
    fontSize: 10.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#166534",
  },
  rewardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 10,
  },
  rewardCostPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rewardCostText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#B45309",
  },
  redeemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0D1811",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  redeemBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  redeemBtnText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  redeemBtnTextDisabled: {
    color: "#F3F4F6",
  },

  // Shortcuts Card
  shortcutsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
    elevation: 2,
    gap: 14,
  },
  shortcutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.2)",
  },
  shortcutInfo: {
    flex: 1,
  },
  shortcutTitle: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  shortcutSubtitle: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    marginTop: 1,
  },
  shortcutsRow: {
    flexDirection: "row",
    gap: 10,
  },
  shortcutSubBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.25)",
  },
  shortcutSubBtnText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
  shortcutPrimaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0D1811",
    paddingVertical: 10,
    borderRadius: 12,
  },
  shortcutPrimaryBtnText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
