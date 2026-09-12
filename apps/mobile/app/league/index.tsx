import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ChevronRight, Crown, Flame, Shield, TrendingUp, Users } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { api } from "@/src/lib/api";
import type { LeagueSummary, LeagueTier } from "@/src/types/api";

const green = "#0E2A1E";
const mint = "#2EA86E";
const DEMO: LeagueSummary = {
  tier: "silver",
  league_name: "Silver League",
  league_points: 640,
  promotion_threshold: 800,
  weekly_actions_completed: 3,
  weekly_actions_target: 5,
  promotion_status: "holding",
  season_label: "September season",
  demotion_note: "On the first day of each month, every league drops one tier. Bronze is protected.",
  standings: [
    { id: "rohan", display_name: "Rohan Mehta", username: "rohan.loop", league_points: 910, rank: 1 },
    { id: "maya", display_name: "Maya Green", username: "maya.green", league_points: 760, rank: 2 },
    { id: "aisha", display_name: "Aisha Sharma", username: "aisha.loop", league_points: 640, rank: 3, is_current_user: true },
    { id: "dev", display_name: "Dev Kapoor", username: "dev.reuse", league_points: 520, rank: 4 },
  ],
};

const tierColors: Record<LeagueTier, { accent: string; soft: string }> = {
  bronze: { accent: "#C9824A", soft: "#F8E5D6" },
  silver: { accent: "#93A8B6", soft: "#E7EEF2" },
  gold: { accent: "#E5A72D", soft: "#FFF2CF" },
  platinum: { accent: "#7B8CFF", soft: "#E9EBFF" },
};

const leagueTiers: LeagueTier[] = ["bronze", "silver", "gold", "platinum"];

function badgeSource(tier: LeagueTier) {
  if (tier === "bronze") return require("@/assets/league-badges/bronze.png");
  if (tier === "silver") return require("@/assets/league-badges/silver.png");
  if (tier === "gold") return require("@/assets/league-badges/gold.png");
  return require("@/assets/league-badges/platinum.png");
}

export default function LeagueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [league, setLeague] = useState<LeagueSummary>(DEMO);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLeague(await api.getLeague());
  }

  useEffect(() => { void load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const palette = tierColors[league.tier];
  const promotionRatio = league.promotion_threshold
    ? Math.min(1, league.league_points / league.promotion_threshold)
    : 1;
  const weeklyRatio = Math.min(1, league.weekly_actions_completed / Math.max(1, league.weekly_actions_target));
  const statusCopy = league.promotion_status === "promoted"
    ? "Promotion secured"
    : league.promotion_status === "at_risk"
      ? "A few more actions to stay up"
      : "In the promotion race";

  const standings = useMemo(() => [...league.standings].sort((a, b) => a.rank - b.rank), [league.standings]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 36 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={mint} />}
    >
      <Pressable style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace("/community")}>
        <ArrowLeft size={18} color={green} />
        <Text style={styles.backText}>Community</Text>
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}><Crown size={21} color="#F6CC67" /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>KARMA LEAGUES</Text>
            <Text style={styles.title}>Climb together</Text>
            <Text style={styles.subtitle}>{league.season_label} · Verified weekly actions move you up.</Text>
          </View>
        </View>
        <View style={styles.seasonNote}><Flame size={14} color="#F6CC67" /><Text style={styles.seasonNoteText}>Monthly reset: one-tier demotion on the first day of each month.</Text></View>
      </View>

      <View style={styles.ladder}>
        {leagueTiers.map((tier, index) => (
          <React.Fragment key={tier}>
            <View style={[styles.ladderTier, league.tier === tier && styles.ladderTierActive]}>
              <Image source={badgeSource(tier)} style={styles.ladderBadge} resizeMode="contain" />
              <Text style={[styles.ladderLabel, league.tier === tier && { color: tierColors[tier].accent }]}>{tier[0].toUpperCase() + tier.slice(1)}</Text>
            </View>
            {index < leagueTiers.length - 1 ? <View style={styles.ladderLine} /> : null}
          </React.Fragment>
        ))}
      </View>

      <View style={[styles.leagueCard, { borderColor: palette.accent }]}>
        <View style={styles.leagueCardTop}>
          <View style={[styles.badgeWrap, { backgroundColor: palette.soft }]}>
            <Image source={badgeSource(league.tier)} style={styles.badge} resizeMode="contain" />
          </View>
          <View style={styles.leagueIdentity}>
            <Text style={styles.cardLabel}>CURRENT LEAGUE</Text>
            <Text style={styles.leagueName}>{league.league_name}</Text>
            <Text style={styles.leagueDescription}>{statusCopy}</Text>
          </View>
          <Shield size={19} color={palette.accent} />
        </View>

        <View style={styles.pointsRow}>
          <View><Text style={styles.pointsValue}>{league.league_points.toLocaleString()}</Text><Text style={styles.pointsLabel}>league points</Text></View>
          <View style={styles.nextTier}><TrendingUp size={15} color={mint} /><Text style={styles.nextTierText}>{league.promotion_threshold ? `${Math.max(0, league.promotion_threshold - league.league_points)} to promote` : "Top league"}</Text></View>
        </View>
        <View style={styles.track}><View style={[styles.fill, { width: `${promotionRatio * 100}%`, backgroundColor: palette.accent }]} /></View>
        <Text style={styles.trackCaption}>{league.promotion_threshold ? `${league.league_points.toLocaleString()} / ${league.promotion_threshold.toLocaleString()} points to the next league` : "You are at the highest league"}</Text>
      </View>

      <View style={styles.weeklyCard}>
        <View style={styles.sectionHeader}><View><Text style={styles.cardLabel}>THIS WEEK</Text><Text style={styles.sectionTitle}>Verified action progress</Text></View><Text style={styles.weeklyCount}>{league.weekly_actions_completed}/{league.weekly_actions_target}</Text></View>
        <View style={styles.track}><View style={[styles.fill, { width: `${weeklyRatio * 100}%` }]} /></View>
        <Text style={styles.weeklyHint}>Complete verified circular actions to earn league points. KCS and Karma Coins remain separate.</Text>
      </View>

      <View style={styles.standingsCard}>
        <View style={styles.sectionHeader}><View><Text style={styles.cardLabel}>SEASON STANDINGS</Text><Text style={styles.sectionTitle}>Your league</Text></View><Users size={18} color={mint} /></View>
        {standings.map((person) => (
          <View key={person.id} style={[styles.personRow, person.is_current_user && styles.currentPerson]}>
            <Text style={styles.rank}>{person.rank}</Text>
            <View style={styles.avatar}><Text style={styles.avatarText}>{person.display_name.slice(0, 1)}</Text></View>
            <View style={styles.personCopy}><Text style={styles.personName}>{person.display_name}{person.is_current_user ? " · You" : ""}</Text><Text style={styles.username}>@{person.username}</Text></View>
            <Text style={styles.personPoints}>{person.league_points.toLocaleString()}</Text>
          </View>
        ))}
      </View>

      <View style={styles.noteCard}><Text style={styles.noteTitle}>How leagues work</Text><Text style={styles.noteText}>{league.demotion_note}</Text><Text style={styles.noteText}>League points measure verified challenge progress only — they never replace your Carbon Credit Score or Karma Coins.</Text></View>
      <Pressable style={styles.backToCommunity} onPress={() => router.replace("/community")}><Text style={styles.backToCommunityText}>Back to Community</Text><ChevronRight size={16} color={mint} /></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4FAF6" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 20, gap: 14 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5 },
  backText: { color: green, fontSize: 14, fontWeight: "700" },
  hero: { backgroundColor: green, borderRadius: 24, padding: 20, gap: 16 },
  heroTop: { flexDirection: "row", gap: 13, alignItems: "center" },
  heroIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "#234635", alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1, gap: 3 },
  eyebrow: { color: "#8BD7A7", letterSpacing: 1.3, fontWeight: "800", fontSize: 11 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#B9D1C3", fontSize: 13, lineHeight: 18 },
  seasonNote: { flexDirection: "row", gap: 7, alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.14)", paddingTop: 12 },
  seasonNoteText: { color: "#D8E9DF", fontSize: 11, flex: 1, lineHeight: 16 },
  ladder: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#D8E9DF", padding: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ladderTier: { alignItems: "center", gap: 3, opacity: 0.58 },
  ladderTierActive: { opacity: 1 },
  ladderBadge: { width: 32, height: 32 },
  ladderLabel: { color: "#789185", fontSize: 9, fontWeight: "800" },
  ladderLine: { height: 1, flex: 1, backgroundColor: "#D8E9DF", marginHorizontal: 5, marginBottom: 14 },
  leagueCard: { backgroundColor: "#fff", borderRadius: 22, borderWidth: 1.5, padding: 17, gap: 14 },
  leagueCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  badgeWrap: { width: 70, height: 70, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  badge: { width: 57, height: 57 },
  leagueIdentity: { flex: 1, gap: 3 },
  cardLabel: { color: "#789185", fontSize: 10, letterSpacing: 1.1, fontWeight: "800" },
  leagueName: { color: green, fontSize: 21, fontWeight: "800" },
  leagueDescription: { color: mint, fontSize: 12, fontWeight: "700" },
  pointsRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  pointsValue: { color: green, fontSize: 31, fontWeight: "900" },
  pointsLabel: { color: "#789185", fontSize: 11 },
  nextTier: { flexDirection: "row", alignItems: "center", gap: 5, paddingBottom: 4 },
  nextTierText: { color: mint, fontWeight: "800", fontSize: 12 },
  track: { height: 8, backgroundColor: "#E7F0EA", borderRadius: 5, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: mint, borderRadius: 5 },
  trackCaption: { color: "#789185", fontSize: 11 },
  weeklyCard: { backgroundColor: "#EAF7EF", borderRadius: 19, padding: 16, gap: 11 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionTitle: { color: green, fontSize: 17, fontWeight: "800", marginTop: 3 },
  weeklyCount: { color: mint, fontSize: 23, fontWeight: "900" },
  weeklyHint: { color: "#668074", fontSize: 12, lineHeight: 17 },
  standingsCard: { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#D8E9DF", padding: 16 },
  personRow: { minHeight: 59, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: "#EDF3EF" },
  currentPerson: { backgroundColor: "#F0FAF4", marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 12 },
  rank: { width: 18, textAlign: "center", color: "#789185", fontWeight: "800" },
  avatar: { width: 33, height: 33, borderRadius: 17, backgroundColor: "#D7F0E1", alignItems: "center", justifyContent: "center" },
  avatarText: { color: mint, fontWeight: "800" },
  personCopy: { flex: 1 },
  personName: { color: green, fontWeight: "800", fontSize: 14 },
  username: { color: "#789185", fontSize: 11, marginTop: 2 },
  personPoints: { color: green, fontWeight: "900", fontSize: 14 },
  noteCard: { backgroundColor: "#fff", borderRadius: 17, borderWidth: 1, borderColor: "#D8E9DF", padding: 15, gap: 7 },
  noteTitle: { color: green, fontWeight: "800", fontSize: 14 },
  noteText: { color: "#789185", fontSize: 11, lineHeight: 16 },
  backToCommunity: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 },
  backToCommunityText: { color: mint, fontWeight: "800", fontSize: 13 },
});
