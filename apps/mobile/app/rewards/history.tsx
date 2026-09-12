import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ArrowDownLeft, ArrowUpRight, Coins } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "@/components/custom/back-button";
import { Text } from "@/components/ui/text";
import { usePointsLedger } from "@/src/hooks/queries";

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function RewardsHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ledger = usePointsLedger();
  const [filter, setFilter] = useState<"all" | "earned" | "spent" | "events">("all");
  const entries = useMemo(
    () => (ledger.data?.entries ?? []).filter((entry) => filter === "all" || entry.type === (filter === "events" ? "event" : filter)),
    [filter, ledger.data?.entries]
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BackButton label="Back" fallbackRoute="/rewards" />
          <Text style={styles.title}>Transaction history</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceIcon}><Coins size={18} color="#FBBF24" /></View>
          <View style={styles.balanceCopy}>
            <Text style={styles.balanceLabel}>KARMA COINS BALANCE</Text>
            {ledger.isLoading ? <ActivityIndicator color="#5EEAD4" /> : <Text style={styles.balance}>{ledger.data?.balance ?? "—"}</Text>}
          </View>
          <Pressable onPress={() => router.replace("/rewards")}><Text style={styles.done}>Done</Text></Pressable>
        </View>

        <Text style={styles.sectionLabel}>KARMA COINS & ACCOUNT ACTIVITY</Text>
        <View style={styles.filters}>
          {(["all", "earned", "spent", "events"] as const).map((value) => (
            <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>
              <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
                {value === "all" ? "All" : value === "earned" ? "Received" : value === "spent" ? "Spent" : "Activity"}
              </Text>
            </Pressable>
          ))}
        </View>
        {ledger.isError ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>History unavailable</Text>
            <Text style={styles.stateText}>Reconnect to load your saved points history.</Text>
          </View>
        ) : ledger.isLoading ? (
          <View style={styles.stateCard}><ActivityIndicator color="#2EA86E" /></View>
        ) : entries.length ? (
          <View style={styles.list}>
            {entries.map((entry) => {
              const earned = entry.type === "earned";
              const spent = entry.type === "spent";
              return (
                <View key={entry.id} style={styles.row}>
                  <View style={[styles.eventIcon, earned ? styles.earnedIcon : spent ? styles.spentIcon : styles.activityIcon]}>
                    {earned ? <ArrowDownLeft size={16} color="#047857" /> : spent ? <ArrowUpRight size={16} color="#B45309" /> : <Coins size={15} color="#52685B" />}
                  </View>
                  <View style={styles.eventCopy}>
                    <Text style={styles.eventTitle}>{entry.title}</Text>
                    <Text style={styles.eventSubtitle}>{entry.subtitle}</Text>
                    <Text style={styles.eventMeta}>{entry.source.replaceAll("_", " ")} · {formatTimestamp(entry.timestamp)}</Text>
                  </View>
                  <View style={styles.amountCopy}>
                    <Text style={[styles.amount, earned ? styles.earnedText : spent ? styles.spentText : styles.activityText]}>
                      {earned ? "+" : spent ? "" : "·"}{earned || spent ? entry.points_delta : ""}
                    </Text>
                    <Text style={styles.after}>After {entry.balance_after}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No points activity yet</Text>
            <Text style={styles.stateText}>Complete an action or redeem a partner perk to see it here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4FAF6" },
  header: { minHeight: 54, paddingHorizontal: 20, flexDirection: "row", alignItems: "center" },
  title: { flex: 1, textAlign: "center", color: "#183222", fontSize: 19, fontWeight: "800" },
  headerSpacer: { width: 56 },
  balanceCard: { marginHorizontal: 20, marginTop: 8, padding: 18, borderRadius: 20, backgroundColor: "#0C2518", flexDirection: "row", alignItems: "center" },
  balanceIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#254832", alignItems: "center", justifyContent: "center" },
  balanceCopy: { flex: 1, marginLeft: 12 },
  balanceLabel: { color: "#A7C7B3", fontSize: 10, letterSpacing: 1.1, fontWeight: "700" },
  balance: { color: "#FFFFFF", fontSize: 28, fontWeight: "900", marginTop: 2 },
  done: { color: "#5EEAD4", fontWeight: "800", fontSize: 13 },
  sectionLabel: { marginHorizontal: 20, marginTop: 28, marginBottom: 10, color: "#789185", fontSize: 11, letterSpacing: 1.2, fontWeight: "800" },
  list: { marginHorizontal: 20, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D8E9DE", overflow: "hidden" },
  row: { minHeight: 84, padding: 14, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#EDF4EF" },
  eventIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  earnedIcon: { backgroundColor: "#DDF5E8" },
  spentIcon: { backgroundColor: "#FFF1D8" },
  activityIcon: { backgroundColor: "#EAF0EC" },
  eventCopy: { flex: 1, minWidth: 0, marginHorizontal: 10 },
  eventTitle: { color: "#183222", fontSize: 14, fontWeight: "800" },
  eventSubtitle: { color: "#62786B", fontSize: 12, marginTop: 2 },
  eventMeta: { color: "#93A69A", fontSize: 10, marginTop: 5, textTransform: "capitalize" },
  amountCopy: { alignItems: "flex-end" },
  amount: { fontSize: 16, fontWeight: "900" },
  earnedText: { color: "#059669" },
  spentText: { color: "#B45309" },
  activityText: { color: "#52685B" },
  filters: { flexDirection: "row", gap: 8, marginHorizontal: 20, marginBottom: 10 },
  filter: { borderWidth: 1, borderColor: "#D8E9DE", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#FFFFFF" },
  filterActive: { backgroundColor: "#0C2518", borderColor: "#0C2518" },
  filterText: { color: "#62786B", fontSize: 11, fontWeight: "800" },
  filterTextActive: { color: "#FFFFFF" },
  after: { color: "#93A69A", fontSize: 10, marginTop: 4 },
  stateCard: { marginHorizontal: 20, padding: 24, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D8E9DE", alignItems: "center" },
  stateTitle: { color: "#183222", fontSize: 15, fontWeight: "800" },
  stateText: { color: "#62786B", fontSize: 12, textAlign: "center", marginTop: 6 },
});
