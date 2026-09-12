import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Crown, Gift, Search, UserPlus, Users, X } from "lucide-react-native";
import { BackButton } from "@/components/custom/back-button";
import { Text } from "@/components/ui/text";
import { api } from "@/src/lib/api";
import { formatLeagueNumber } from "@/src/lib/league";
import type { Challenge, ChallengePeriod, FriendResult, LeaderboardEntry, LeaderboardMetric, LeaderboardScope } from "@/src/types/api";

const green = "#0E2A1E";
const mint = "#2EA86E";
const fallbackPeople: LeaderboardEntry[] = [
  { id: "maya", username: "maya.green", display_name: "Maya Green", impact_points: 2410, carbon_score: 774, rank: 1 },
  { id: "rohan", username: "rohan.loop", display_name: "Rohan Mehta", impact_points: 1850, carbon_score: 742, rank: 2 },
  { id: "aisha", username: "aisha.loop", display_name: "Aisha Sharma", impact_points: 1420, carbon_score: 681, rank: 3, is_current_user: true },
  { id: "dev", username: "dev.reuse", display_name: "Dev Kapoor", impact_points: 1180, carbon_score: 654, rank: 4 },
];
const fallbackFriends = fallbackPeople.filter((person) => person.id === "aisha" || person.id === "rohan");
const fallbackChallenges: Record<ChallengePeriod, Challenge[]> = {
  daily: [
    { id: "daily-walk", title: "Walk 2,000 steps", description: "Reach the target with verified phone step data.", action_label: "Sync your steps", period: "daily", progress: 0, target: 2000, reward_points: 25, completed: false },
    { id: "daily-refill", title: "Refill, don’t replace", description: "Use a refill or reusable option today.", action_label: "Record a refill", period: "daily", progress: 0, target: 1, reward_points: 35, completed: false },
  ],
  weekly: [
    { id: "weekly-repair", title: "Keep one thing in use", description: "Repair, donate, resell or refurbish one item this week.", action_label: "Complete one circular action", period: "weekly", progress: 0, target: 1, reward_points: 150, completed: false },
    { id: "weekly-steps", title: "Take 35,000 green steps", description: "Build a walking habit from verified phone step data.", action_label: "Sync your steps", period: "weekly", progress: 0, target: 35000, reward_points: 220, completed: false },
  ],
  monthly: [
    { id: "monthly-circular", title: "Complete five circular actions", description: "Make five verified choices that extend product life or avoid waste.", action_label: "Explore your actions", period: "monthly", progress: 2, target: 5, reward_points: 650, completed: false },
    { id: "monthly-footprint", title: "Beat your footprint baseline", description: "Stay below your provisional monthly carbon baseline.", action_label: "Review your impact", period: "monthly", progress: 0, target: 1, reward_points: 800, completed: false },
  ],
};

function progressLabel(challenge: Challenge) {
  return challenge.target >= 1000
    ? `${Math.round(challenge.progress).toLocaleString()} / ${challenge.target.toLocaleString()}`
    : `${challenge.progress} / ${challenge.target}`;
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [metric, setMetric] = useState<LeaderboardMetric>("impact_points");
  const [period, setPeriod] = useState<ChallengePeriod>("daily");
  const [people, setPeople] = useState<LeaderboardEntry[]>(fallbackPeople);
  const [friends, setFriends] = useState<FriendResult[]>([
    { id: "rohan", username: "rohan.loop", display_name: "Rohan Mehta", impact_points: 1850, carbon_score: 742, is_friend: true },
  ]);
  const [challenges, setChallenges] = useState(fallbackChallenges.daily);
  const [username, setUsername] = useState("");
  const [searchResults, setSearchResults] = useState<FriendResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const rows = useMemo(() => {
    const source = scope === "friends" ? friends : people;
    return [...source].sort((a, b) => (metric === "impact_points" ? b.impact_points - a.impact_points : b.carbon_score - a.carbon_score));
  }, [friends, metric, people, scope]);

  async function loadLeaderboard(nextScope = scope, nextMetric = metric) {
    try {
      const remote = await api.getLeaderboard(nextScope, nextMetric);
      if (remote.length) setPeople(remote);
    } catch { /* offline demo remains visible */ }
  }

  async function loadChallenges(nextPeriod: ChallengePeriod) {
    setPeriod(nextPeriod);
    try {
      const remote = await api.getChallenges(nextPeriod);
      setChallenges(remote.length ? remote : fallbackChallenges[nextPeriod]);
    } catch {
      setChallenges(fallbackChallenges[nextPeriod]);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await Promise.all([loadLeaderboard(), loadChallenges(period)]);
    setRefreshing(false);
  }

  async function search() {
    if (!username.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const remote = await api.searchFriends(username.trim());
      setSearchResults(remote);
    } catch {
      const found = fallbackPeople.filter((person) => person.username.toLowerCase().includes(username.trim().toLowerCase()) && !friends.some((friend) => friend.id === person.id)).map((person) => ({ ...person, is_friend: false }));
      setSearchResults(found);
      if (!found.length) setNotice("No matching username found yet.");
    } finally { setBusy(false); }
  }

  async function addFriend(person: FriendResult) {
    try { await api.addFriend(person.username); } catch { /* local demo mode */ }
    setFriends((current) => current.some((friend) => friend.id === person.id) ? current : [...current, { ...person, is_friend: true }]);
    setSearchResults((current) => current.filter((item) => item.id !== person.id));
    setNotice(`${person.display_name} added to your friends leaderboard.`);
  }

  async function removeFriend(person: FriendResult) {
    try { await api.removeFriend(person.username); } catch { /* local demo mode */ }
    setFriends((current) => current.filter((friend) => friend.id !== person.id));
  }

  async function complete(challenge: Challenge) {
    if (challenge.completed) return;
    try {
      const updated = { ...challenge, ...(await api.claimChallenge(challenge.id)), claimed: true };
      setChallenges((current) => current.map((item) => item.id === challenge.id ? updated : item));
      setNotice(`Challenge complete · +${challenge.reward_points} Karma Coins earned.`);
    } catch {
      await loadChallenges(period);
      setNotice("Not ready yet — complete the measured action before claiming this challenge.");
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 36 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={mint} />}>
        <View style={styles.container}>
          <BackButton label="Back" fallbackRoute="/(tabs)" />
          <View style={styles.hero}>
            <View style={styles.heroIcon}><Crown size={22} color="#FBBF24" /></View>
            <View style={{ flex: 1 }}><Text style={styles.eyebrow}>KARMA COMMUNITY</Text><Text style={styles.title}>Leaderboard & Challenges</Text><Text style={styles.subtitle}>Compete on everyday green actions, together.</Text></View>
          </View>

          <View style={styles.segment}><Pressable onPress={() => { setScope("global"); void loadLeaderboard("global", metric); }} style={[styles.segmentItem, scope === "global" && styles.segmentActive]}><Text style={[styles.segmentText, scope === "global" && styles.segmentActiveText]}>Global</Text></Pressable><Pressable onPress={() => { setScope("friends"); void loadLeaderboard("friends", metric); }} style={[styles.segmentItem, scope === "friends" && styles.segmentActive]}><Users size={14} color={scope === "friends" ? "#fff" : "#668074"} /><Text style={[styles.segmentText, scope === "friends" && styles.segmentActiveText]}>Friends</Text></Pressable></View>
          <View style={styles.metricRow}><Text style={styles.sectionTitle}>Rank by</Text><View style={styles.metricPills}><Pressable onPress={() => { setMetric("impact_points"); void loadLeaderboard(scope, "impact_points"); }} style={[styles.metricPill, metric === "impact_points" && styles.metricPillActive]}><Text style={[styles.metricText, metric === "impact_points" && styles.metricTextActive]}>Karma Coins</Text></Pressable><Pressable onPress={() => { setMetric("kcs"); void loadLeaderboard(scope, "kcs"); }} style={[styles.metricPill, metric === "kcs" && styles.metricPillActive]}><Text style={[styles.metricText, metric === "kcs" && styles.metricTextActive]}>Carbon Score</Text></Pressable></View></View>

          <View style={styles.card}><View style={styles.cardHeader}><Text style={styles.cardTitle}>{scope === "global" ? "Global rankings" : "Your circle"}</Text><Text style={styles.cardHint}>{metric === "impact_points" ? "Karma Coins" : "Provisional / verified score"}</Text></View>{rows.map((row, index) => <View key={row.id} style={[styles.rankRow, row.is_current_user && styles.currentRow]}><Text style={[styles.rank, index === 0 && styles.topRank]}>{index + 1}</Text><View style={styles.avatar}><Text style={styles.avatarText}>{row.display_name.slice(0, 1)}</Text></View><View style={{ flex: 1 }}><Text style={styles.person}>{row.display_name}{row.is_current_user ? " · You" : ""}</Text><Text style={styles.username}>@{row.username}</Text></View><View style={{ alignItems: "flex-end" }}><Text style={styles.rankValue}>{metric === "impact_points" ? formatLeagueNumber(row.impact_points) : formatLeagueNumber(row.carbon_score)}</Text><Text style={styles.rankUnit}>{metric === "impact_points" ? "coins" : "score"}</Text></View></View>)}</View>

          <View style={styles.card}><View style={styles.cardHeader}><Text style={styles.cardTitle}>Add friends</Text><Text style={styles.cardHint}>Username only</Text></View><View style={styles.searchRow}><Search size={17} color="#789185" /><TextInput value={username} onChangeText={setUsername} onSubmitEditing={() => void search()} placeholder="Search @username" placeholderTextColor="#91A59A" style={styles.input} autoCapitalize="none" /><Pressable onPress={() => void search()} style={styles.searchButton}>{busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchButtonText}>Find</Text>}</Pressable></View>{notice ? <Text style={styles.notice}>{notice}</Text> : null}{searchResults.map((person) => <View key={person.id} style={styles.friendRow}><View style={{ flex: 1 }}><Text style={styles.person}>{person.display_name}</Text><Text style={styles.username}>@{person.username}</Text></View><Pressable onPress={() => void addFriend(person)} style={styles.addButton}><UserPlus size={15} color="#fff" /><Text style={styles.addText}>Add</Text></Pressable></View>)}{friends.length > 0 ? <View style={styles.friendsList}><Text style={styles.miniLabel}>YOUR FRIENDS</Text>{friends.map((person) => <View key={person.id} style={styles.friendRow}><View style={{ flex: 1 }}><Text style={styles.person}>{person.display_name}</Text><Text style={styles.username}>@{person.username}</Text></View><Pressable onPress={() => void removeFriend(person)}><X size={17} color="#8BA097" /></Pressable></View>)}</View> : null}</View>

          <Pressable style={styles.challengeLink} onPress={() => router.push("/challenges")}><Gift size={18} color={mint} /><Text style={styles.challengeLinkText}>Open green challenges</Text><Text style={styles.chevron}>›</Text></Pressable>
          <Text style={styles.disclaimer}>Rankings are separate from challenges. Karma Coins reward actions; Carbon Credit Score measures impact.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4FAF6" },
  container: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 20, gap: 14 },
  hero: { backgroundColor: green, borderRadius: 24, padding: 20, flexDirection: "row", gap: 14, alignItems: "center" },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#234635", alignItems: "center", justifyContent: "center" },
  eyebrow: { color: mint, letterSpacing: 1.3, fontWeight: "800", fontSize: 11 },
  title: { color: "#fff", fontSize: 25, fontWeight: "800", marginTop: 3 },
  subtitle: { color: "#B9D1C3", fontSize: 13, marginTop: 4 },
  segment: { backgroundColor: "#E5EFE9", borderRadius: 16, flexDirection: "row", padding: 4 },
  segmentItem: { flex: 1, minHeight: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  segmentActive: { backgroundColor: green }, segmentText: { color: "#668074", fontWeight: "800", fontSize: 14 }, segmentActiveText: { color: "#fff" },
  metricRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, sectionTitle: { color: green, fontWeight: "800", fontSize: 14 },
  metricPills: { flexDirection: "row", gap: 6 }, metricPill: { borderWidth: 1, borderColor: "#CDE2D5", borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8 }, metricPillActive: { backgroundColor: "#D7F0E1", borderColor: mint }, metricText: { color: "#668074", fontSize: 12, fontWeight: "700" }, metricTextActive: { color: green },
  card: { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#D8E9DF", padding: 16 }, cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }, cardTitle: { color: green, fontWeight: "800", fontSize: 17 }, cardHint: { color: "#789185", fontSize: 11 },
  rankRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: "#EDF3EF" }, currentRow: { backgroundColor: "#F0FAF4", marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 12 }, rank: { width: 18, color: "#789185", fontWeight: "800", textAlign: "center" }, topRank: { color: "#E79D16" }, avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#D7F0E1", alignItems: "center", justifyContent: "center" }, avatarText: { color: mint, fontWeight: "800" }, person: { color: green, fontWeight: "800", fontSize: 14 }, username: { color: "#789185", fontSize: 11, marginTop: 2 }, rankValue: { color: green, fontWeight: "800", fontSize: 15 }, rankUnit: { color: "#789185", fontSize: 10 },
  searchRow: { borderWidth: 1, borderColor: "#CDE2D5", borderRadius: 13, minHeight: 46, paddingLeft: 12, flexDirection: "row", alignItems: "center", gap: 8 }, input: { flex: 1, color: green, fontSize: 14, paddingVertical: 8 }, searchButton: { backgroundColor: green, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginRight: 4 }, searchButtonText: { color: "#fff", fontWeight: "800", fontSize: 12 }, notice: { color: mint, fontSize: 12, marginTop: 8 }, friendRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#EDF3EF" }, addButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: mint, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 }, addText: { color: "#fff", fontWeight: "800", fontSize: 12 }, friendsList: { marginTop: 8 }, miniLabel: { color: "#789185", letterSpacing: 1.2, fontSize: 10, fontWeight: "800", marginBottom: 3 },
  challengeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 5 }, sectionHeading: { color: green, fontSize: 22, fontWeight: "800", marginTop: 3 }, periodRow: { flexDirection: "row", gap: 8 }, periodPill: { borderRadius: 20, borderWidth: 1, borderColor: "#CDE2D5", paddingHorizontal: 16, paddingVertical: 9 }, periodActive: { backgroundColor: mint, borderColor: mint }, periodText: { color: "#668074", fontWeight: "800", fontSize: 13 }, periodTextActive: { color: "#fff" },
  challengeLink: { backgroundColor: "#E3F5EA", borderRadius: 14, padding: 13, flexDirection: "row", alignItems: "center", gap: 8 }, challengeLinkText: { flex: 1, color: green, fontWeight: "800", fontSize: 13 }, chevron: { color: mint, fontSize: 24 },
  challengeCard: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#D8E9DF", padding: 15 }, challengeTop: { flexDirection: "row", gap: 11, alignItems: "flex-start" }, challengeIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: "#E3F5EA", alignItems: "center", justifyContent: "center" }, challengeIconText: { color: mint, fontSize: 19, fontWeight: "800" }, challengeTitle: { color: green, fontSize: 15, fontWeight: "800" }, challengeDescription: { color: "#668074", fontSize: 12, lineHeight: 17, marginTop: 3 }, reward: { color: "#D48713", fontWeight: "900", fontSize: 14 }, progressTrack: { height: 7, backgroundColor: "#E7F0EA", borderRadius: 4, marginTop: 14, overflow: "hidden" }, progressFill: { height: "100%", backgroundColor: mint, borderRadius: 4 }, challengeBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }, progressText: { color: "#789185", fontSize: 12, fontWeight: "700" }, completeButton: { backgroundColor: green, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 }, completeText: { color: "#fff", fontSize: 11, fontWeight: "800" }, completed: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E3F5EA", paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10 }, completedText: { color: mint, fontSize: 11, fontWeight: "800" }, disclaimer: { color: "#789185", fontSize: 11, lineHeight: 16, textAlign: "center", paddingHorizontal: 8, paddingTop: 2 },
});
