import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
<<<<<<< HEAD
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import {
  Award,
  Gift,
  Leaf,
  LogOut,
  RefreshCw,
  UserRound,
} from "lucide-react-native";
import { ActionRow } from "@/components/custom/action-row";
import { CircularityRing } from "@/components/custom/circularity-ring";
=======
import Animated, { FadeInRight } from "react-native-reanimated";
import { BackButton } from "@/components/custom/back-button";
import { CircularityScore } from "@/components/custom/circularity-score";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
>>>>>>> 0a89030986d80ed0ce11f6ef943295ed1c5723ac
import { useBadges, useMe, useScore } from "@/src/hooks/queries";
import { useAuthStore } from "@/src/store/auth";
import { useTabBarClearance } from "@/src/theme/layout";
import { Crown } from "lucide-react-native";

const C = {
  ink: "#0D1811",
  inkSoft: "#183222",
  muted: "#6B8576",
  line: "rgba(46,168,110,0.16)",
  primary: "#2EA86E",
  primaryDeep: "#1B7A4E",
  white: "#FFFFFF",
  card: "rgba(255,255,255,0.88)",
} as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "K";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabClearance = useTabBarClearance();
  const router = useRouter();
  const me = useMe();
  const score = useScore();
  const badges = useBadges();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const resetOnboarding = useAuthStore((s) => s.resetOnboarding);

  function handleReplayOnboarding() {
    resetOnboarding();
    router.replace("/onboarding");
  }

  function handleLogout() {
    logout();
    router.replace("/onboarding");
  }

  const displayName = me.data?.name || user?.name || "Aisha Sharma";
  const displayEmail = me.data?.email || user?.email || "aisha@example.com";
  const firstName = displayName.trim().split(/\s+/)[0] || "there";
  const displayScore =
    score.data?.state === "verified" && score.data.verified !== null
      ? score.data.verified
      : (score.data?.provisional ?? null);
  const scoreTitle =
    score.data === undefined
      ? "Loading score"
      : score.data.state === "verified" && score.data.verified !== null
        ? "Verified score"
        : "Provisional estimate";
  const scoreDetail =
    score.data === undefined
      ? "Fetching your Karma Credit Score."
      : score.data.state === "verified" && score.data.verified !== null
        ? "Calculated from your recorded footprint."
        : "Estimate until more footprint data lands.";
  const displayPoints = me.data?.impact_points ?? user?.impact_points ?? 420;
  const loopLevel = me.data?.loop_level ?? 2;
  const streakDays = me.data?.streak_days ?? 5;
  const offsetKg = Math.round(me.data?.offset_kg_total ?? 0);
  const badgeList = badges.data ?? [];

  return (
<<<<<<< HEAD
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: tabClearance,
          paddingHorizontal: 20,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(320)}>
          <Text style={styles.eyebrow}>ACCOUNT</Text>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>
            Your Karma snapshot, {firstName} — score, impact, and settings.
          </Text>
        </Animated.View>
=======
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: tabClearance,
        paddingHorizontal: 24,
        gap: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      <BackButton label="Home" fallbackRoute="/(tabs)" />
      <Heading size="2xl" className="font-heading -mt-2">Profile</Heading>
      <CircularityScore
        score={displayScore}
        minScore={480}
        maxScore={820}
        title={scoreTitle}
        detail={scoreDetail}
      />
>>>>>>> 0a89030986d80ed0ce11f6ef943295ed1c5723ac

        {/* Identity hero */}
        <Animated.View entering={FadeInDown.delay(40).duration(320)}>
          <LinearGradient
            colors={["#1B7A4E", "#2EA86E", "#3BC98A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(displayName)}</Text>
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroBadge}>ACTIVE MEMBER</Text>
                <Text style={styles.heroName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.heroEmail} numberOfLines={1}>
                  {displayEmail}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() =>
                router.push("/auth/signin" as import("expo-router").Href)
              }
              style={({ pressed }) => [
                styles.heroBtn,
                pressed && { opacity: 0.88 },
              ]}
            >
              <UserRound size={16} color={C.primaryDeep} strokeWidth={2.2} />
              <Text style={styles.heroBtnText}>Switch account</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>

<<<<<<< HEAD
        {/* Score */}
        <Animated.View entering={FadeInDown.delay(80).duration(320)}>
          <View style={styles.card}>
            <View style={styles.scoreRow}>
              <CircularityRing
                score={displayScore}
                size={108}
                label={displayScore === null ? "…" : "KCS"}
                minScore={480}
                maxScore={820}
=======
        <HStack className="gap-2 mt-4 pt-3 border-t border-border/60">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1"
            onPress={handleReplayOnboarding}
          >
            Replay Onboarding
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1"
            onPress={handleLogout}
          >
            Sign Out
          </Button>
        </HStack>
      </Card>

      <Card variant="soft" className="p-4 border border-border">
        <Text size="xs" bold className="text-muted-foreground uppercase tracking-wider font-mono">
          Karma Coins
        </Text>
        <Text size="4xl" bold className="font-mono mt-1 text-foreground">
          {displayPoints}
        </Text>
        <Text size="xs" className="text-muted-foreground mt-1 font-body">
          Loop Level {me.data?.loop_level ?? 2} · Streak{" "}
          {me.data?.streak_days ?? 5} days · Offsets ~
          {Math.round(me.data?.offset_kg_total ?? 0)} kg
        </Text>
      </Card>

      <Card variant="soft" className="p-4 border border-border">
        <HStack className="items-center justify-between gap-3">
          <HStack className="items-center gap-3 flex-1">
            <Box className="h-10 w-10 rounded-xl bg-amber-100 items-center justify-center">
              <Crown size={18} color="#B7791F" />
            </Box>
            <VStack space="xs" className="flex-1">
              <Text size="xs" bold className="text-muted-foreground uppercase tracking-wider font-mono">Karma League</Text>
              <Text bold className="font-heading">Silver League · 640 pts</Text>
              <Text size="xs" className="text-muted-foreground font-body">160 points to Gold · 3/5 actions</Text>
            </VStack>
          </HStack>
          <Button size="sm" variant="outline" onPress={() => router.push("/league")}>View</Button>
        </HStack>
      </Card>

      <VStack space="sm">
        <Text bold size="sm" className="font-heading">Badges</Text>
        <Box className="flex-row flex-wrap gap-2">
          {(badges.data ?? []).map((b, i) => (
            <Animated.View key={b.id} entering={FadeInRight.delay(i * 40)}>
              <Badge
                action={b.unlocked ? "playful" : "muted"}
                label={b.unlocked ? b.title : `Locked · ${b.title}`}
>>>>>>> 0a89030986d80ed0ce11f6ef943295ed1c5723ac
              />
              <View style={styles.scoreCopy}>
                <Text style={styles.cardEyebrow}>KARMA CREDIT SCORE</Text>
                <Text style={styles.scoreTitle}>{scoreTitle}</Text>
                <Text style={styles.scoreDetail}>{scoreDetail}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

<<<<<<< HEAD
        {/* Impact metrics */}
        <Animated.View entering={FadeInDown.delay(110).duration(320)}>
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, styles.metricPrimary]}>
              <Text style={styles.metricLabel}>Impact Points</Text>
              <Text style={styles.metricValue}>{displayPoints}</Text>
              <Text style={styles.metricHint}>Loop Level {loopLevel}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabelMuted}>Streak</Text>
              <Text style={styles.metricValueDark}>{streakDays}</Text>
              <Text style={styles.metricHintDark}>days active</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabelMuted}>Offsets</Text>
              <Text style={styles.metricValueDark}>{offsetKg}</Text>
              <Text style={styles.metricHintDark}>kg CO₂e</Text>
            </View>
          </View>
        </Animated.View>
=======
      <Box className="flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onPress={() => router.push("/rewards")}
        >
          Rewards
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onPress={() => router.push("/community")}
        >
          Community
        </Button>
        <Button
          className="flex-1"
          onPress={() => router.push("/offsets" as import("expo-router").Href)}
        >
          Offsets
        </Button>
      </Box>
>>>>>>> 0a89030986d80ed0ce11f6ef943295ed1c5723ac

        {/* Badges */}
        <Animated.View entering={FadeInDown.delay(140).duration(320)}>
          <View style={styles.card}>
            <View style={styles.sectionHead}>
              <Award size={16} color={C.primary} strokeWidth={2.2} />
              <Text style={styles.sectionTitle}>Badges</Text>
            </View>
            <View style={styles.badgeWrap}>
              {badgeList.length === 0 ? (
                <Text style={styles.emptyBadges}>
                  Earn badges as you scan, repair, and offset.
                </Text>
              ) : (
                badgeList.map((b, i) => (
                  <Animated.View
                    key={b.id}
                    entering={FadeInRight.delay(i * 35)}
                  >
                    <View
                      style={[
                        styles.badgeChip,
                        !b.unlocked && styles.badgeChipLocked,
                      ]}
                    >
                      <Leaf
                        size={12}
                        color={b.unlocked ? C.primary : C.muted}
                        strokeWidth={2.2}
                      />
                      <Text
                        style={[
                          styles.badgeText,
                          !b.unlocked && styles.badgeTextLocked,
                        ]}
                        numberOfLines={1}
                      >
                        {b.unlocked ? b.title : `Locked · ${b.title}`}
                      </Text>
                    </View>
                  </Animated.View>
                ))
              )}
            </View>
          </View>
        </Animated.View>

        {/* Actions — full-width rows, no clipped labels */}
        <Animated.View entering={FadeInDown.delay(170).duration(320)}>
          <View style={styles.card}>
            <Text style={styles.sectionTitleSolo}>Explore & settings</Text>
            <View style={styles.actionList}>
              <ActionRow
                icon={Gift}
                label="Rewards"
                hint="Browse redeemable perks"
                onPress={() => router.push("/rewards")}
                showDivider
              />
              <ActionRow
                icon={Leaf}
                label="Offsets"
                hint="Support verified climate projects"
                onPress={() =>
                  router.push("/offsets" as import("expo-router").Href)
                }
                showDivider
              />
              <ActionRow
                icon={RefreshCw}
                label="Replay onboarding"
                hint="Walk through setup again"
                onPress={handleReplayOnboarding}
                showDivider
              />
              <ActionRow
                icon={LogOut}
                label="Sign out"
                hint="Return to welcome screen"
                onPress={handleLogout}
                tone="danger"
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4FAF6",
  },
  scroll: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: "IBMPlexMono_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
    color: C.primary,
  },
  title: {
    marginTop: 4,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 30,
    letterSpacing: -0.6,
    color: C.ink,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: C.muted,
  },
  hero: {
    borderRadius: 24,
    padding: 18,
    gap: 16,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
    color: C.white,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  heroBadge: {
    fontFamily: "IBMPlexMono_500Medium",
    fontSize: 10,
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.82)",
  },
  heroName: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 20,
    color: C.white,
    letterSpacing: -0.3,
  },
  heroEmail: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.82)",
  },
  heroBtn: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: C.white,
  },
  heroBtnText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: C.primaryDeep,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  scoreCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  cardEyebrow: {
    fontFamily: "IBMPlexMono_500Medium",
    fontSize: 10,
    letterSpacing: 1.1,
    color: C.primary,
  },
  scoreTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
    color: C.ink,
    letterSpacing: -0.2,
  },
  scoreDetail: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: C.muted,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  metricPrimary: {
    backgroundColor: C.primary,
    borderColor: "transparent",
  },
  metricLabel: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
  },
  metricLabelMuted: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    color: C.muted,
  },
  metricValue: {
    marginTop: 6,
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 22,
    color: C.white,
  },
  metricValueDark: {
    marginTop: 6,
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 22,
    color: C.ink,
  },
  metricHint: {
    marginTop: 2,
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
  },
  metricHintDark: {
    marginTop: 2,
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: C.muted,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
    color: C.ink,
  },
  sectionTitleSolo: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
    color: C.ink,
    marginBottom: 8,
  },
  badgeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 200,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(46,168,110,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.22)",
  },
  badgeChipLocked: {
    backgroundColor: "rgba(13,24,17,0.04)",
    borderColor: "rgba(13,24,17,0.08)",
  },
  badgeText: {
    flexShrink: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: C.primaryDeep,
  },
  badgeTextLocked: {
    color: C.muted,
  },
  emptyBadges: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: C.muted,
  },
  actionList: {
    gap: 0,
  },
});
