import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Check,
  Coins,
  Footprints,
  Gift,
  Leaf,
  RefreshCw,
  Sparkles,
  Wrench,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BackButton } from "@/components/custom/back-button";
import { Text } from "@/components/ui/text";
import { api } from "@/src/lib/api";
import { formatLeagueNumber } from "@/src/lib/league";
import type { Challenge, ChallengePeriod } from "@/src/types/api";

const fallback: Record<ChallengePeriod, Challenge[]> = {
  daily: [
    {
      id: "daily-walk",
      title: "Walk 2,000 steps",
      description: "Take a short walk and turn movement into measurable green impact.",
      action_label: "Sync your steps",
      period: "daily",
      progress: 0,
      target: 2000,
      reward_points: 25,
      completed: false,
    },
  ],
  weekly: [
    {
      id: "weekly-repair",
      title: "Choose repair first",
      description: "Complete one repair, donation, resale, or refurbishment action this week.",
      action_label: "Complete challenge",
      period: "weekly",
      progress: 0,
      target: 1,
      reward_points: 100,
      completed: false,
    },
  ],
  monthly: [
    {
      id: "monthly-circular-actions",
      title: "A month of circular choices",
      description: "Complete five verified green actions this month to earn major bonus coins.",
      action_label: "Complete challenge",
      period: "monthly",
      progress: 2,
      target: 5,
      reward_points: 300,
      completed: false,
    },
  ],
};

function getMissionIcon(id: string, period: ChallengePeriod) {
  const lower = id.toLowerCase();
  if (lower.includes("walk") || lower.includes("step")) {
    return <Footprints size={20} color="#2EA86E" strokeWidth={2.2} />;
  }
  if (lower.includes("repair") || lower.includes("refurbish")) {
    return <Wrench size={20} color="#2EA86E" strokeWidth={2.2} />;
  }
  if (lower.includes("refill") || lower.includes("reuse") || lower.includes("circular")) {
    return <RefreshCw size={20} color="#2EA86E" strokeWidth={2.2} />;
  }
  if (period === "monthly") {
    return <Sparkles size={20} color="#2EA86E" strokeWidth={2.2} />;
  }
  return <Leaf size={20} color="#2EA86E" strokeWidth={2.2} />;
}

export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<ChallengePeriod>("daily");
  const [items, setItems] = useState<Challenge[]>(fallback.daily);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(next: ChallengePeriod = period) {
    setPeriod(next);
    try {
      const remote = await api.getChallenges(next);
      setItems(remote.length ? remote : fallback[next]);
    } catch {
      setItems(fallback[next]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function complete(item: Challenge) {
    if (item.completed || claimingId === item.id) return;
    setClaimingId(item.id);
    setNotice(null);
    try {
      const updated = await api.claimChallenge(item.id);
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, ...updated, completed: true } : entry))
      );
      setNotice(`Challenge completed! +${item.reward_points} Karma Coins earned.`);
    } catch {
      // The API rejects claims until persisted evidence reaches the goal.
      await load(period);
      setNotice("Keep going! Complete the required activity before claiming this challenge.");
    } finally {
      setClaimingId(null);
    }
  }

  const periods: { key: ChallengePeriod; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
  ];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 36 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2EA86E" />
      }
    >
      <BackButton label="Community" fallbackRoute="/community" />

      {/* ── HERO CARD WITH RICH GRADIENT & GLOW ORB ── */}
      <LinearGradient
        colors={["#0C2518", "#143C28", "#0B1D14"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroGlowOrb} />
        <View style={styles.heroGlowOrbSecondary} />
        <View style={styles.heroIconWrap}>
          <Gift size={22} color="#5EEAD4" strokeWidth={2.2} />
        </View>
        <Text style={styles.eyebrow}>PLAY YOUR PART</Text>
        <Text style={styles.title}>Green challenges</Text>
        <Text style={styles.subtitle}>
          Small renewable actions earn Karma Coins. Your Carbon Credit Score stays separate.
        </Text>
      </LinearGradient>

      {/* ── MINIMALIST SEGMENTED PERIOD SELECTOR (NO PILLBOXES) ── */}
      <View style={styles.periodSegment}>
        {periods.map(({ key, label }) => {
          const active = period === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => void load(key)}
              style={[styles.periodTab, active && styles.periodTabActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodTabText, active && styles.periodTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Notice Banner if any */}
      {notice ? (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      {/* ── CHALLENGES LIST ── */}
      <View style={styles.list}>
        {items.map((item) => {
          const ratio = Math.min(1, item.progress / Math.max(1, item.target));
          const pct = Math.round(ratio * 100);

          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.missionIconWrap}>
                  {getMissionIcon(item.id, period)}
                </View>
                <View style={styles.copy}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.description}>{item.description}</Text>
                </View>
                <View style={styles.rewardWrap}>
                  <Coins size={12} color="#D97706" strokeWidth={2.4} />
                  <Text style={styles.rewardText}>+{item.reward_points}</Text>
                </View>
              </View>

              {/* Progress Track */}
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(item.completed ? 100 : 3, pct)}%` }]} />
              </View>

              {/* Card Footer: NO PILLBOXES */}
              <View style={styles.bottomRow}>
                <Text style={styles.progressText}>
                  {formatLeagueNumber(item.progress)} / {formatLeagueNumber(item.target)}{" "}
                  <Text style={styles.progressUnit}>
                    {item.target > 50 ? "steps" : "completed"}
                  </Text>
                </Text>

                {item.completed ? (
                  <View style={styles.completedInline}>
                    <Check size={15} color="#2EA86E" strokeWidth={2.8} />
                    <Text style={styles.completedInlineText}>Completed</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => void complete(item)}
                    disabled={claimingId === item.id}
                    activeOpacity={0.8}
                  >
                    {claimingId === item.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>{item.action_label}</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
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

  // Minimalist Segmented Tabs (NO PILLBOXES)
  periodSegment: {
    backgroundColor: "#E6EFEA",
    borderRadius: 12,
    padding: 4,
    flexDirection: "row",
    gap: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  periodTabActive: {
    backgroundColor: "#0D251A",
  },
  periodTabText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#556E60",
  },
  periodTabTextActive: {
    color: "#FFFFFF",
    fontFamily: "Nunito_800ExtraBold",
  },

  // Notice
  noticeBanner: {
    backgroundColor: "#E8F7EE",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.25)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noticeText: {
    fontSize: 12.5,
    fontFamily: "Nunito_700Bold",
    color: "#165534",
    textAlign: "center",
  },

  // Challenge List
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: "rgba(215, 235, 222, 0.95)",
    padding: 16,
    shadowColor: "#0F281B",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 12,
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  missionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#E8F7EE",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  cardTitle: {
    color: "#0B1D12",
    fontSize: 16.5,
    fontFamily: "Nunito_800ExtraBold",
  },
  description: {
    color: "#5F7768",
    fontSize: 12.5,
    fontFamily: "Nunito_600SemiBold",
    lineHeight: 17,
  },
  rewardWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  rewardText: {
    color: "#B45309",
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 12.5,
  },

  // Track
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5ECE8",
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    height: "100%",
    backgroundColor: "#2EA86E",
    borderRadius: 3,
  },

  // Bottom row
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressText: {
    color: "#4A6053",
    fontSize: 12.5,
    fontFamily: "IBMPlexMono_600SemiBold",
  },
  progressUnit: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#789185",
  },
  completedInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  completedInlineText: {
    color: "#2EA86E",
    fontSize: 12.5,
    fontFamily: "Nunito_800ExtraBold",
  },
  actionButton: {
    backgroundColor: "#0D251A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Nunito_800ExtraBold",
  },
});
