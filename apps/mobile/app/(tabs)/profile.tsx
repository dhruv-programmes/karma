import React, { useState } from "react";
import { Image, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { useBadges, useLeague, useMe, useScore } from "@/src/hooks/queries";
import { api } from "@/src/lib/api";
import { useAuthStore } from "@/src/store/auth";
import { useTabBarClearance } from "@/src/theme/layout";
import { formatLeagueNumber, leagueBadgeSource } from "@/src/lib/league";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabClearance = useTabBarClearance();
  const router = useRouter();
  const me = useMe();
  const score = useScore();
  const badges = useBadges();
  const league = useLeague();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const resetOnboarding = useAuthStore((s) => s.resetOnboarding);

  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  async function ask() {
    try {
      const res = await api.ask(query);
      setAnswer(res.answer);
    } catch {
      setAnswer(
        "Your best next action: Repair your old phone (~120 kg CO₂e avoided)."
      );
    }
  }

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
  const displayScore =
    score.data?.state === "verified" && score.data.verified !== null
      ? score.data.verified
      : score.data?.provisional ?? null;
  const scoreTitle =
    score.data === undefined
      ? "Loading score"
      : score.data.state === "verified" && score.data.verified !== null
        ? "Verified score"
        : "Provisional estimate";
  const scoreDetail =
    score.data === undefined
      ? "Loading your Carbon Credit Score."
      : score.data.state === "verified" && score.data.verified !== null
      ? "Calculated from your recorded footprint data."
      : "Questionnaire-based estimate until enough real footprint data is available.";
  const displayPoints = me.data?.impact_points ?? user?.impact_points ?? null;

  return (
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

      <Card variant="soft" className="p-4 border border-border">
        <HStack className="justify-between items-start">
          <VStack space="xs" className="flex-1 pr-2">
            <Text size="xs" bold className="text-primary uppercase tracking-wider font-mono">
              Active Member
            </Text>
            <Heading size="xl" className="font-heading">{displayName}</Heading>
            <Text size="xs" className="text-muted-foreground font-mono">
              {displayEmail}
            </Text>
          </VStack>
          <HStack className="gap-2">
            <Button
              size="sm"
              variant="outline"
              onPress={() => router.push("/auth/signin" as import("expo-router").Href)}
            >
              Switch User
            </Button>
          </HStack>
        </HStack>

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
          {displayPoints ?? "—"}
        </Text>
        <Text size="xs" className="text-muted-foreground mt-1 font-body">
          Loop Level {me.data?.loop_level ?? user?.loop_level ?? "—"} · Streak{" "}
          {me.data?.streak_days ?? user?.streak_days ?? "—"} days · Offsets ~
          {me.data?.offset_kg_total == null && user?.offset_kg_total == null
            ? "—"
            : `${Math.round(me.data?.offset_kg_total ?? user?.offset_kg_total ?? 0)} kg`}
        </Text>
      </Card>

      <Card variant="soft" className="p-4 border border-border">
        <HStack className="items-center justify-between gap-3">
          <HStack className="items-center gap-3 flex-1">
            <Box className="h-10 w-10 rounded-xl bg-amber-100 items-center justify-center">
              {league.data ? (
                <Image source={leagueBadgeSource(league.data.tier)} style={{ width: 32, height: 32 }} resizeMode="contain" />
              ) : (
                <Text className="text-amber-700 font-bold">{league.isLoading ? "…" : "—"}</Text>
              )}
            </Box>
            <VStack space="xs" className="flex-1">
              <Text size="xs" bold className="text-muted-foreground uppercase tracking-wider font-mono">Karma League</Text>
              <Text bold className="font-heading">
                {league.data ? `${league.data.league_name} · ${formatLeagueNumber(league.data.league_points)} pts` : league.isLoading ? "Checking your league…" : "League unavailable"}
              </Text>
              <Text size="xs" className="text-muted-foreground font-body">
                {league.data
                  ? league.data.promotion_threshold == null
                    ? `${formatLeagueNumber(league.data.weekly_actions_completed)} verified actions this week`
                    : `${formatLeagueNumber(Math.max(0, Number(league.data.promotion_threshold) - Number(league.data.league_points)))} points to next · ${formatLeagueNumber(league.data.weekly_actions_completed)}/${formatLeagueNumber(league.data.weekly_actions_target)} actions`
                  : "Your current league will appear when the server responds."}
              </Text>
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
              />
            </Animated.View>
          ))}
        </Box>
      </VStack>

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

      <VStack space="sm">
        <Text size="sm" bold className="font-heading">
          Ask (tools only)
        </Text>
        <TextInput
          className="h-12 rounded-2xl border border-border bg-card px-4 text-foreground font-body text-sm"
          placeholder="Offsets? Streak? Energy hotspot?"
          placeholderTextColor="rgb(100,120,110)"
          value={query}
          onChangeText={setQuery}
        />
        <Button onPress={() => void ask()}>Ask</Button>
        {answer ? (
          <Text className="text-muted-foreground text-xs font-body mt-1">{answer}</Text>
        ) : null}
      </VStack>
    </ScrollView>
  );
}
