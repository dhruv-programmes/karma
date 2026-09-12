import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Gift, Trophy, Users } from "lucide-react-native";
import { BackButton } from "@/components/custom/back-button";
import { Text } from "@/components/ui/text";
import { useLeague } from "@/src/hooks/queries";
import { formatLeagueNumber, leagueBadgeSource } from "@/src/lib/league";

const green = "#0E2A1E";
const mint = "#2EA86E";

export default function CommunityHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const league = useLeague();

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}>
      <BackButton label="Back" fallbackRoute="/(tabs)" />

      <View style={styles.hero}>
        <View style={styles.heroIcon}><Users size={22} color="#FBBF24" /></View>
        <Text style={styles.eyebrow}>KARMA COMMUNITY</Text>
        <Text style={styles.title}>Make your impact social</Text>
        <Text style={styles.subtitle}>Choose what you want to do today.</Text>
      </View>

      <View style={styles.options}>
        <Pressable style={styles.option} onPress={() => router.push("/challenges") }>
          <View style={[styles.optionIcon, { backgroundColor: "#E4F6EB" }]}><Gift size={24} color={mint} /></View>
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>Challenges</Text>
            <Text style={styles.optionDescription}>Complete daily, weekly, and monthly green missions to earn Karma Coins.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable style={styles.option} onPress={() => router.push("/leaderboard") }>
          <View style={[styles.optionIcon, { backgroundColor: "#FFF3D9" }]}><Trophy size={24} color="#D58B19" /></View>
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>Leaderboard</Text>
            <Text style={styles.optionDescription}>Compare reward points or Carbon Credit Score globally and with friends.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      <Pressable style={styles.leagueCard} onPress={() => router.push("/league")}>
        <View style={styles.leagueBadge}>
          {league.data ? (
            <Image source={leagueBadgeSource(league.data.tier)} style={styles.leagueBadgeImage} resizeMode="contain" />
          ) : (
            <Text style={styles.leagueBadgePlaceholder}>{league.isLoading ? "…" : "—"}</Text>
          )}
        </View>
        <View style={styles.leagueCopy}>
          <Text style={styles.leagueEyebrow}>YOUR SEASON</Text>
          <Text style={styles.leagueTitle}>
            {league.data ? `${league.data.league_name} · ${formatLeagueNumber(league.data.league_points)} pts` : league.isLoading ? "Checking your league…" : "League unavailable"}
          </Text>
          <Text style={styles.leagueDescription}>
            {league.data ? `${formatLeagueNumber(league.data.weekly_actions_completed)} verified actions this week.` : "Your current badge will appear when the server responds."}
          </Text>
        </View>
        <ChevronRight size={19} color={mint} />
      </Pressable>

      <Text style={styles.note}>Karma Coins reward actions. Carbon Credit Score measures impact. They are always kept separate.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4FAF6" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 20, gap: 16 },
  hero: { backgroundColor: green, borderRadius: 24, padding: 22, gap: 6 },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#234635", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  eyebrow: { color: "#8BD7A7", letterSpacing: 1.4, fontWeight: "800", fontSize: 11 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#B9D1C3", fontSize: 14 },
  options: { gap: 12 },
  option: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#D8E9DF", borderRadius: 20, padding: 17, flexDirection: "row", alignItems: "center", gap: 13 },
  optionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  optionCopy: { flex: 1, gap: 4 },
  optionTitle: { color: green, fontSize: 18, fontWeight: "800" },
  optionDescription: { color: "#668074", fontSize: 13, lineHeight: 18 },
  chevron: { color: mint, fontSize: 30, fontWeight: "300" },
  leagueCard: { backgroundColor: "#FFF9EC", borderWidth: 1, borderColor: "#F0D898", borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 11 },
  leagueBadge: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#FFF0C9", alignItems: "center", justifyContent: "center" },
  leagueBadgeImage: { width: 36, height: 36 },
  leagueBadgePlaceholder: { color: "#A46C13", fontSize: 17, fontWeight: "800" },
  leagueCopy: { flex: 1, gap: 2 },
  leagueEyebrow: { color: "#A46C13", fontSize: 9, letterSpacing: 1.1, fontWeight: "800" },
  leagueTitle: { color: green, fontSize: 15, fontWeight: "800" },
  leagueDescription: { color: "#8F774C", fontSize: 11 },
  note: { color: "#789185", fontSize: 12, lineHeight: 17, textAlign: "center", paddingHorizontal: 12 },
});
