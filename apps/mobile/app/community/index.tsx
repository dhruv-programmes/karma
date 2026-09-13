import React from "react";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Gift, Trophy, Users } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BackButton } from "@/components/custom/back-button";
import { Text } from "@/components/ui/text";
import { useLeague } from "@/src/hooks/queries";
import { formatLeagueNumber, leagueBadgeSource } from "@/src/lib/league";
import type { LeagueTier } from "@/src/types/api";

const NEXT_TIERS: Record<LeagueTier, { tier: LeagueTier; name: string } | null> = {
  bronze: { tier: "silver", name: "Silver League" },
  silver: { tier: "gold", name: "Gold League" },
  gold: { tier: "platinum", name: "Platinum League" },
  platinum: null,
};

export default function CommunityHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const league = useLeague();

  const leagueData = league.data ?? null;
  const leaguePoints = leagueData ? Number(leagueData.league_points || 0) : 0;
  const leagueThreshold =
    leagueData && leagueData.promotion_threshold != null
      ? Number(leagueData.promotion_threshold)
      : null;
  const leagueProgressPct =
    leagueThreshold != null && leagueThreshold > 0
      ? Math.min(100, Math.max(4, Math.round((leaguePoints / leagueThreshold) * 100)))
      : 100;
  const nextTierInfo = leagueData ? NEXT_TIERS[leagueData.tier] : null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 36 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <BackButton label="Back" fallbackRoute="/(tabs)" />

      {/* ── HERO ── */}
      <LinearGradient
        colors={["#0C2518", "#143C28", "#0B1D14"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroGlowOrb} />
        <View style={styles.heroGlowOrbSecondary} />
        <View style={styles.heroIconWrap}>
          <Users size={22} color="#5EEAD4" strokeWidth={2.2} />
        </View>
        <Text style={styles.eyebrow}>KARMA COMMUNITY</Text>
        <Text style={styles.title}>Make your impact social</Text>
        <Text style={styles.subtitle}>
          Choose what you want to do today. Compete, collaborate, and earn rewards together.
        </Text>
      </LinearGradient>

      {/* ── NAVIGATION CARDS ── */}
      <View style={styles.options}>
        {/* Challenges Card */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push("/challenges")}
          activeOpacity={0.88}
        >
          <View style={[styles.optionIconWrap, { backgroundColor: "#E8F7EE" }]}>
            <Gift size={24} color="#2EA86E" strokeWidth={2.2} />
          </View>
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>Challenges</Text>
            <Text style={styles.optionDescription}>
              Complete green missions and build sustainable daily habits to earn Karma Coins.
            </Text>
          </View>
          <View style={styles.optionChevronWrap}>
            <ChevronRight size={16} color="#2A5941" strokeWidth={2.4} />
          </View>
        </TouchableOpacity>

        {/* Leaderboard Card */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push("/leaderboard")}
          activeOpacity={0.88}
        >
          <View style={[styles.optionIconWrap, { backgroundColor: "#FEF3C7" }]}>
            <Trophy size={24} color="#D97706" strokeWidth={2.2} />
          </View>
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>Leaderboard</Text>
            <Text style={styles.optionDescription}>
              Compare reward points or Carbon Credit Score globally and celebrate circular progress.
            </Text>
          </View>
          <View style={styles.optionChevronWrap}>
            <ChevronRight size={16} color="#2A5941" strokeWidth={2.4} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── YOUR SEASON LEAGUE BOX (Direct copy of Home Page League Box) ── */}
      <TouchableOpacity
        style={styles.leagueCard}
        onPress={() => router.push("/league")}
        activeOpacity={0.88}
      >
        <Image
          source={require("@/assets/home-hero-bg.jpg")}
          style={styles.leagueBgImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["#F8FCFA", "rgba(248,252,250,0.92)", "rgba(235,246,239,0.3)"]}
          start={{ x: 0.35, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.leagueBadgeWrap}>
          {leagueData ? (
            <Image
              source={leagueBadgeSource(leagueData.tier)}
              style={styles.leagueBadgeImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.leagueBadgePlaceholder}>
              {league.isLoading ? "…" : "—"}
            </Text>
          )}
        </View>

        <View style={styles.leagueCenterWrap}>
          {leagueData ? (
            <>
              <View style={styles.leagueTitleRow}>
                <Text style={styles.leagueTitle} numberOfLines={1}>
                  {leagueData.league_name}
                </Text>
                <View style={styles.leaguePointsChip}>
                  <Text style={styles.leaguePointsChipText}>
                    {formatLeagueNumber(leaguePoints)} pts
                  </Text>
                </View>
              </View>

              <View style={styles.leagueProgressTrack}>
                <View
                  style={[
                    styles.leagueProgressFill,
                    { width: `${leagueProgressPct}%` },
                  ]}
                />
              </View>

              <View style={styles.leagueBottomRow}>
                <Text style={styles.leagueBottomLeft}>
                  {formatLeagueNumber(leaguePoints)} /{" "}
                  {leagueThreshold != null ? `${formatLeagueNumber(leagueThreshold)} pts` : "Max"}
                </Text>
                {nextTierInfo ? (
                  <View style={styles.leagueBottomRight}>
                    <Text style={styles.leagueBottomRightText}>
                      Next: {nextTierInfo.name}
                    </Text>
                    <Image
                      source={leagueBadgeSource(nextTierInfo.tier)}
                      style={styles.leagueNextBadgeIcon}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <Text style={styles.leagueBottomRightText}>Top League ⭐</Text>
                )}
              </View>
            </>
          ) : (
            <Text style={styles.leagueTitle}>
              {league.isLoading ? "Checking your league…" : "League unavailable"}
            </Text>
          )}
        </View>

        <View style={styles.leagueChevronCircle}>
          <ChevronRight size={18} color="#2A5941" strokeWidth={2.4} />
        </View>
      </TouchableOpacity>

      <Text style={styles.note}>
        Karma Coins reward actions. Carbon Credit Score measures impact. They are always kept separate.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4FAF6",
  },
  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 20,
    gap: 16,
  },

  // Hero Card with Rich Gradient & Glow Orbs
  hero: {
    borderRadius: 24,
    padding: 22,
    gap: 6,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.25)",
    shadowColor: "#0D2418",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroGlowOrb: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(94,234,212,0.14)",
  },
  heroGlowOrbSecondary: {
    position: "absolute",
    bottom: -50,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(46,168,110,0.10)",
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(94,234,212,0.12)",
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  eyebrow: {
    color: "#5EEAD4",
    letterSpacing: 1.3,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 27,
    fontFamily: "Nunito_900Black",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: "#B8D4C3",
    fontSize: 13.5,
    fontFamily: "Nunito_600SemiBold",
    lineHeight: 19,
  },

  // Navigation Option Cards
  options: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: "rgba(215, 235, 222, 0.95)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#0F281B",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  optionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  optionTitle: {
    color: "#0B1D12",
    fontSize: 17,
    fontFamily: "Nunito_800ExtraBold",
  },
  optionDescription: {
    color: "#5F7768",
    fontSize: 12.5,
    fontFamily: "Nunito_600SemiBold",
    lineHeight: 17,
  },
  optionChevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F2EC",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Exact Copy of Home Page League Box UI
  leagueCard: {
    backgroundColor: "#F9FCFA",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(215, 235, 222, 0.95)",
    paddingVertical: 7,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#0F281B",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 11,
  },
  leagueBgImage: {
    position: "absolute",
    right: -15,
    top: -15,
    bottom: -15,
    width: 190,
    opacity: 0.28,
  },
  leagueBadgeWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(224, 245, 230, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(200, 235, 215, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  leagueBadgeImage: {
    width: 52,
    height: 52,
  },
  leagueBadgePlaceholder: {
    color: "#9AA89F",
    fontSize: 20,
    fontFamily: "Nunito_800ExtraBold",
  },
  leagueCenterWrap: {
    flex: 1,
    minWidth: 0,
  },
  leagueTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leagueTitle: {
    color: "#0B1D12",
    fontSize: 20,
    fontFamily: "Nunito_800ExtraBold",
  },
  leaguePointsChip: {
    backgroundColor: "#E2ECE6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  leaguePointsChipText: {
    color: "#275038",
    fontSize: 11.5,
    fontFamily: "Nunito_800ExtraBold",
  },
  leagueProgressTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#D9E8DF",
    overflow: "hidden",
    width: "100%",
    marginTop: 5,
  },
  leagueProgressFill: {
    height: "100%",
    borderRadius: 2.5,
    backgroundColor: "#52B582",
    minWidth: 14,
  },
  leagueBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 3,
  },
  leagueBottomLeft: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "#5F7768",
  },
  leagueBottomRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  leagueBottomRightText: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "#5F7768",
  },
  leagueNextBadgeIcon: {
    width: 14,
    height: 14,
  },
  leagueChevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F2EC",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  note: {
    color: "#789185",
    fontSize: 11.5,
    fontFamily: "Nunito_600SemiBold",
    lineHeight: 17,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
