import React, { useState } from "react";
import { TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInRight } from "react-native-reanimated";
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
import { useBadges, useMe } from "@/src/hooks/queries";
import { api } from "@/src/lib/api";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useMe();
  const badges = useBadges();
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

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 24,
        gap: 24,
      }}
    >
      <Heading size="2xl">Profile</Heading>
      <CircularityScore
        score={me.data?.circularity_score ?? 74}
        trendDelta={me.data?.trend_delta ?? 6}
      />

      <Card variant="soft">
        <HStack className="justify-between items-start">
          <VStack space="xs">
            <Text size="xs" bold className="text-primary uppercase tracking-wider">
              Active Member
            </Text>
            <Heading size="xl">{me.data?.name ?? "Aisha Sharma"}</Heading>
            <Text size="xs" className="text-muted-foreground font-mono">
              {me.data?.email ?? "aisha@example.com"}
            </Text>
          </VStack>
          <Button
            size="sm"
            variant="outline"
            onPress={() => router.push("/auth/signin" as import("expo-router").Href)}
          >
            Switch User
          </Button>
        </HStack>
      </Card>

      <Card variant="soft">
        <Text size="sm" bold className="text-secondary-foreground">
          Impact points
        </Text>
        <Text size="4xl" bold className="font-mono mt-2">
          {me.data?.impact_points ?? 420}
        </Text>
        <Text size="sm" className="text-muted-foreground mt-2">
          Loop Level {me.data?.loop_level ?? 2} · Streak{" "}
          {me.data?.streak_days ?? 5} days · Offsets ~
          {Math.round(me.data?.offset_kg_total ?? 0)} kg
        </Text>
      </Card>

      <VStack space="md">
        <Text bold>Badges</Text>
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
          className="flex-1"
          onPress={() => router.push("/offsets" as import("expo-router").Href)}
        >
          Offsets
        </Button>
      </Box>

      <VStack space="md">
        <Text size="md" bold>
          Ask (tools only)
        </Text>
        <TextInput
          className="h-12 rounded-2xl border border-border bg-card px-4 text-foreground"
          placeholder="Offsets? Streak? Energy hotspot?"
          placeholderTextColor="rgb(100,120,110)"
          value={query}
          onChangeText={setQuery}
        />
        <Button onPress={() => void ask()}>Ask</Button>
        {answer ? (
          <Text className="text-muted-foreground">{answer}</Text>
        ) : null}
      </VStack>
    </ScrollView>
  );
}
