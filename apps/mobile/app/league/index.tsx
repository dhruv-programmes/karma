import React, { useMemo } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Flame, TrendingUp, Users } from "lucide-react-native";
import { BackButton } from "@/components/custom/back-button";
import { Text } from "@/components/ui/text";
import { useLeague } from "@/src/hooks/queries";
import type { LeagueTier } from "@/src/types/api";
import { formatLeagueNumber, leagueBadgeSource } from "@/src/lib/league";

const green = "#0E2A1E";
const mint = "#2EA86E";
const tierColors: Record<LeagueTier, { accent: string; soft: string }> = {
  bronze: { accent: "#C9824A", soft: "#F8E5D6" },
  silver: { accent: "#93A8B6", soft: "#E7EEF2" },
  gold: { accent: "#E5A72D", soft: "#FFF2CF" },
  platinum: { accent: "#7B8CFF", soft: "#E9EBFF" },
};

const leagueTiers: LeagueTier[] = ["bronze", "silver", "gold", "platinum"];

export default function LeagueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const leagueQuery = useLeague();
  const league = leagueQuery.data;
  const refreshing = leagueQuery.isFetching;
  // Keep hook order stable while the server-backed league query transitions
  // from loading to loaded. Sorting here must not be conditional on `league`.
  const standings = useMemo(
    () => (league ? [...league.standings].sort((a, b) => a.rank - b.rank) : []),
    [league],
  );

  if (!league) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 36 }]}
      >
        <BackButton label="Community" fallbackRoute="/community" variant="circle" />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{leagueQuery.isLoading ? "Loading your league…" : "League unavailable"}</Text>
          <Text style={styles.emptyText}>
            {leagueQuery.isLoading
              ? "Checking your current Carbon Loop league and badge."
              : "We could not verify your current league right now. Your tier will appear when the server responds."}
          </Text>
          {!leagueQuery.isLoading ? (
            <Pressable style={styles.retryButton} onPress={() => void leagueQuery.refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    );
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

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 36 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void leagueQuery.refetch()} tintColor={mint} />}
    >
      <BackButton label="Community" fallbackRoute="/community" variant="circle" />

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}><Image source={leagueBadgeSource(league.tier)} style={styles.heroBadge} resizeMode="contain" /></View>
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
              <Image source={leagueBadgeSource(tier)} style={styles.ladderBadge} resizeMode="contain" />
              <Text style={[styles.ladderLabel, league.tier === tier && { color: tierColors[tier].accent }]}>{tier[0].toUpperCase() + tier.slice(1)}</Text>
            </View>
            {index < leagueTiers.length - 1 ? <View style={styles.ladderLine} /> : null}
          </React.Fragment>
        ))}
      </View>

      <View style={[styles.leagueCard, { borderColor: palette.accent }]}>
        <View style={styles.leagueCardTop}>
          <View style={[styles.badgeWrap, { backgroundColor: palette.soft }]}>
            <Image source={leagueBadgeSource(league.tier)} style={styles.badge} resizeMode="contain" />
          </View>
          <View style={styles.leagueIdentity}>
            <Text style={styles.cardLabel}>CURRENT LEAGUE</Text>
            <Text style={styles.leagueName}>{league.league_name}</Text>
            <Text style={styles.leagueDescription}>{statusCopy}</Text>
          </View>
        </View>

        <View style={styles.pointsRow}>
          <View><Text style={styles.pointsValue}>{formatLeagueNumber(league.league_points)}</Text><Text style={styles.pointsLabel}>league points</Text></View>
          <View style={styles.nextTier}><TrendingUp size={15} color={mint} /><Text style={styles.nextTierText}>{league.promotion_threshold ? `${formatLeagueNumber(Math.max(0, Number(league.promotion_threshold) - Number(league.league_points)))} to promote` : "Top league"}</Text></View>
        </View>
        <View style={styles.track}><View style={[styles.fill, { width: `${promotionRatio * 100}%`, backgroundColor: palette.accent }]} /></View>
        <Text style={styles.trackCaption}>{league.promotion_threshold ? `${formatLeagueNumber(league.league_points)} / ${formatLeagueNumber(league.promotion_threshold)} points to the next league` : "You are at the highest league"}</Text>
      </View>

      <View style={styles.weeklyCard}>
        <View style={styles.sectionHeader}><View><Text style={styles.cardLabel}>THIS WEEK</Text><Text style={styles.sectionTitle}>Verified action progress</Text></View><Text style={styles.weeklyCount}>{formatLeagueNumber(league.weekly_actions_completed)}/{formatLeagueNumber(league.weekly_actions_target)}</Text></View>
        <View style={styles.track}><View style={[styles.fill, { width: `${weeklyRatio * 100}%` }]} /></View>
        <Text style={styles.weeklyHint}>Complete verified circular actions to earn league points. KCS and Karma Coins remain separate.</Text>
      </View>

      <View style={styles.standingsCard}>
        <View style={styles.sectionHeader}><View><Text style={styles.cardLabel}>SEASON STANDINGS</Text><Text style={styles.sectionTitle}>Your league</Text></View><Users size={18} color={mint} /></View>
        {standings.length === 0 ? (
          <Text style={styles.emptyText}>Standings are temporarily unavailable.</Text>
        ) : standings.map((person) => (
          <View key={person.id} style={[styles.personRow, person.is_current_user && styles.currentPerson]}>
            <Text style={styles.rank}>{person.rank}</Text>
            <View style={styles.avatar}><Text style={styles.avatarText}>{person.display_name.slice(0, 1)}</Text></View>
            <View style={styles.personCopy}><Text style={styles.personName}>{person.display_name}{person.is_current_user ? " · You" : ""}</Text><Text style={styles.username}>@{person.username}</Text></View>
            <Text style={styles.personPoints}>{formatLeagueNumber(person.league_points)}</Text>
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
  heroBadge: { width: 36, height: 36 },
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
  nextTierText: { color: mint, fontWeight: "800", fontSize: 12, flexShrink: 1, textAlign: "right" },
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
  personPoints: { color: green, fontWeight: "900", fontSize: 14, minWidth: 52, textAlign: "right", flexShrink: 0 },
  noteCard: { backgroundColor: "#fff", borderRadius: 17, borderWidth: 1, borderColor: "#D8E9DF", padding: 15, gap: 7 },
  noteTitle: { color: green, fontWeight: "800", fontSize: 14 },
  noteText: { color: "#789185", fontSize: 11, lineHeight: 16 },
  backToCommunity: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 },
  backToCommunityText: { color: mint, fontWeight: "800", fontSize: 13 },
  emptyCard: { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#D8E9DF", padding: 20, gap: 8 },
  emptyTitle: { color: green, fontSize: 18, fontWeight: "800" },
  emptyText: { color: "#789185", fontSize: 13, lineHeight: 18 },
  retryButton: { alignSelf: "flex-start", backgroundColor: green, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9, marginTop: 4 },
  retryText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});
