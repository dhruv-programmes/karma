import React, { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Gift } from "lucide-react-native";
import { BackButton } from "@/components/custom/back-button";
import { Text } from "@/components/ui/text";
import { api } from "@/src/lib/api";
import type { Challenge, ChallengePeriod } from "@/src/types/api";

const green = "#0E2A1E";
const mint = "#2EA86E";
const fallback: Record<ChallengePeriod, Challenge[]> = {
  daily: [{ id: "daily-walk", title: "Walk 2,000 steps", description: "Your phone step data must reach the target before this can be claimed.", action_label: "Sync your steps", period: "daily", progress: 0, target: 2000, reward_points: 25, completed: false }],
  weekly: [{ id: "weekly-repair", title: "Choose repair first", description: "Complete one repair, donation, resale, or refurbishment action this week.", action_label: "Complete challenge", period: "weekly", progress: 0, target: 1, reward_points: 100, completed: false }],
  monthly: [{ id: "monthly-circular-actions", title: "A month of circular choices", description: "Complete five verified green actions this month.", action_label: "Complete challenge", period: "monthly", progress: 2, target: 5, reward_points: 300, completed: false }],
};

export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<ChallengePeriod>("daily");
  const [items, setItems] = useState<Challenge[]>(fallback.daily);
  const [refreshing, setRefreshing] = useState(false);

  async function load(next: ChallengePeriod = period) {
    setPeriod(next);
    try {
      const remote = await api.getChallenges(next);
      setItems(remote.length ? remote : fallback[next]);
    } catch {
      setItems(fallback[next]);
    }
  }

  useEffect(() => { void load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function complete(item: Challenge) {
    if (item.completed) return;
    try {
      const updated = await api.claimChallenge(item.id);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...updated } : entry));
    } catch {
      // The API rejects claims until persisted evidence reaches the goal.
      await load(period);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={mint} />}>
      <BackButton label="Community" fallbackRoute="/community" />
      <View style={styles.hero}><View style={styles.heroIcon}><Gift size={23} color="#FBBF24" /></View><Text style={styles.eyebrow}>PLAY YOUR PART</Text><Text style={styles.title}>Green challenges</Text><Text style={styles.subtitle}>Small renewable actions earn Karma Coins. Your Carbon Credit Score stays separate.</Text></View>
      <View style={styles.periodRow}>{(["daily", "weekly", "monthly"] as ChallengePeriod[]).map((value) => <Pressable key={value} onPress={() => void load(value)} style={[styles.period, period === value && styles.periodActive]}><Text style={[styles.periodText, period === value && styles.periodTextActive]}>{value[0].toUpperCase() + value.slice(1)}</Text></Pressable>)}</View>
      {items.map((item) => { const ratio = Math.min(1, item.progress / Math.max(1, item.target)); return <View key={item.id} style={styles.card}><View style={styles.cardTop}><View style={styles.missionIcon}><Text style={styles.missionIconText}>{period === "daily" ? "☀" : period === "weekly" ? "↗" : "✦"}</Text></View><View style={styles.copy}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.description}>{item.description}</Text></View><Text style={styles.reward}>+{item.reward_points}</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${ratio * 100}%` }]} /></View><View style={styles.bottom}><Text style={styles.progress}>{item.progress} / {item.target}</Text>{item.completed ? <View style={styles.completed}><Check size={13} color={mint} /><Text style={styles.completedText}>Completed</Text></View> : <Pressable style={styles.complete} onPress={() => void complete(item)}><Text style={styles.completeText}>{item.action_label}</Text></Pressable>}</View></View>; })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4FAF6" }, content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 20, gap: 14 },
  hero: { backgroundColor: green, borderRadius: 24, padding: 21, gap: 5 }, heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#234635", alignItems: "center", justifyContent: "center", marginBottom: 7 }, eyebrow: { color: "#8BD7A7", letterSpacing: 1.3, fontWeight: "800", fontSize: 11 }, title: { color: "#fff", fontSize: 27, fontWeight: "800" }, subtitle: { color: "#B9D1C3", fontSize: 13, lineHeight: 18 },
  periodRow: { flexDirection: "row", gap: 8 }, period: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: "#CDE2D5", borderRadius: 20, paddingVertical: 10 }, periodActive: { backgroundColor: mint, borderColor: mint }, periodText: { color: "#668074", fontWeight: "800" }, periodTextActive: { color: "#fff" },
  card: { backgroundColor: "#fff", borderRadius: 19, borderWidth: 1, borderColor: "#D8E9DF", padding: 16 }, cardTop: { flexDirection: "row", gap: 11, alignItems: "flex-start" }, missionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#E3F5EA", alignItems: "center", justifyContent: "center" }, missionIconText: { color: mint, fontSize: 19, fontWeight: "800" }, copy: { flex: 1, gap: 3 }, cardTitle: { color: green, fontSize: 16, fontWeight: "800" }, description: { color: "#668074", fontSize: 12, lineHeight: 17 }, reward: { color: "#D48713", fontWeight: "900" }, track: { height: 7, backgroundColor: "#E7F0EA", borderRadius: 4, marginTop: 15, overflow: "hidden" }, fill: { height: "100%", backgroundColor: mint, borderRadius: 4 }, bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 11 }, progress: { color: "#789185", fontSize: 12, fontWeight: "700" }, complete: { backgroundColor: green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }, completeText: { color: "#fff", fontSize: 11, fontWeight: "800" }, completed: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E3F5EA", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 }, completedText: { color: mint, fontSize: 11, fontWeight: "800" },
});
