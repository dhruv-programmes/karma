import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ArrowDownLeft, ArrowUpRight, Coins, Clock, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
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
    () =>
      (ledger.data?.entries ?? []).filter(
        (entry) => filter === "all" || entry.type === (filter === "events" ? "event" : filter)
      ),
    [filter, ledger.data?.entries]
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 36,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with BackButton */}
        <View style={styles.header}>
          <BackButton label="Back" fallbackRoute="/(tabs)/offers" />
          <Text style={styles.title}>Transaction history</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Elevated Karma Coin Balance Card */}
        <LinearGradient
          colors={["#0C2518", "#143C28", "#0B1D14"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceGlowOrb} />

          {/* Top Row: Icon Badge + Label */}
          <View style={styles.balanceTopRow}>
            <View style={styles.balanceIconWrap}>
              <Coins size={15} color="#5EEAD4" strokeWidth={2.4} />
            </View>
            <Text style={styles.balanceLabel}>KARMA COINS BALANCE</Text>
          </View>

          {/* Primary Metric: Big Balance Number + Karma Coins */}
          <View style={styles.balanceRow}>
            {ledger.isLoading ? (
              <ActivityIndicator color="#5EEAD4" size="small" />
            ) : (
              <>
                <Text style={styles.balanceNumber}>
                  {ledger.data?.balance ?? "—"}
                </Text>
                <Text style={styles.balanceUnit}>Karma Coins</Text>
              </>
            )}
          </View>

          {/* Context Subtitle */}
          <Text style={styles.balanceSubtext}>
            Verified ledger of climate actions, rewards, and redemptions
          </Text>
        </LinearGradient>

        {/* Filter Tabs */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>ACTIVITY LEDGER</Text>
        </View>

        <View style={styles.filters}>
          {(["all", "earned", "spent", "events"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setFilter(value)}
              style={[styles.filter, filter === value && styles.filterActive]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === value && styles.filterTextActive,
                ]}
              >
                {value === "all"
                  ? "All"
                  : value === "earned"
                    ? "Earned (+)"
                    : value === "spent"
                      ? "Spent (−)"
                      : "Events"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Content List */}
        {ledger.isError ? (
          <View style={styles.stateCard}>
            <Clock size={32} color="#94A3B8" strokeWidth={1.8} />
            <Text style={styles.stateTitle}>History Unavailable</Text>
            <Text style={styles.stateText}>
              Unable to load your saved wallet ledger. Please reconnect.
            </Text>
          </View>
        ) : ledger.isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#2EA86E" size="large" />
          </View>
        ) : entries.length ? (
          <View style={styles.list}>
            {entries.map((entry, index) => {
              const earned = entry.type === "earned";
              const spent = entry.type === "spent";
              const isLast = index === entries.length - 1;

              return (
                <View
                  key={entry.id}
                  style={[styles.row, isLast && styles.rowLast]}
                >
                  <View
                    style={[
                      styles.eventIcon,
                      earned
                        ? styles.earnedIcon
                        : spent
                          ? styles.spentIcon
                          : styles.activityIcon,
                    ]}
                  >
                    {earned ? (
                      <ArrowDownLeft size={17} color="#059669" strokeWidth={2.4} />
                    ) : spent ? (
                      <ArrowUpRight size={17} color="#D97706" strokeWidth={2.4} />
                    ) : (
                      <Coins size={16} color="#64748B" strokeWidth={2.2} />
                    )}
                  </View>

                  <View style={styles.eventCopy}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {entry.title}
                    </Text>
                    <Text style={styles.eventSubtitle} numberOfLines={2}>
                      {entry.subtitle}
                    </Text>
                    <Text style={styles.eventMeta}>
                      {entry.source.replaceAll("_", " ")} ·{" "}
                      {formatTimestamp(entry.timestamp)}
                    </Text>
                  </View>

                  <View style={styles.amountCopy}>
                    <Text
                      style={[
                        styles.amount,
                        earned
                          ? styles.earnedText
                          : spent
                            ? styles.spentText
                            : styles.activityText,
                      ]}
                    >
                      {earned ? "+" : spent ? "−" : "·"}
                      {earned || spent ? Math.abs(entry.points_delta) : ""}
                    </Text>
                    <Text style={styles.after}>
                      Bal: {entry.balance_after}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.stateCard}>
            <Sparkles size={32} color="#94A3B8" strokeWidth={1.8} />
            <Text style={styles.stateTitle}>No Activity Yet</Text>
            <Text style={styles.stateText}>
              Complete daily green actions or redeem eco-vouchers to build your wallet history.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4FAF6",
  },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: "#0D1811",
    fontSize: 18,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 60,
  },
  balanceCard: {
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.2,
    borderColor: "rgba(94,234,212,0.24)",
    boxShadow: "0px 8px 20px rgba(12,37,24,0.18)",
    elevation: 4,
    marginBottom: 24,
  },
  balanceGlowOrb: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(94,234,212,0.12)",
  },
  balanceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  balanceIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(94,234,212,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceLabel: {
    color: "#5EEAD4",
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: "Nunito_800ExtraBold",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 8,
  },
  balanceNumber: {
    color: "#FFFFFF",
    fontSize: 48,
    fontFamily: "Nunito_800ExtraBold",
    lineHeight: 52,
    letterSpacing: -0.5,
  },
  balanceUnit: {
    color: "#5EEAD4",
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    lineHeight: 24,
  },
  balanceSubtext: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    lineHeight: 17,
  },
  sectionHeaderRow: {
    marginBottom: 10,
  },
  sectionLabel: {
    color: "#64748B",
    fontSize: 11,
    letterSpacing: 1.1,
    fontFamily: "Nunito_800ExtraBold",
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  filter: {
    borderWidth: 1,
    borderColor: "#DCE8E0",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
  },
  filterActive: {
    backgroundColor: "#0C2518",
    borderColor: "#0C2518",
  },
  filterText: {
    color: "#526658",
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  list: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE8E0",
    overflow: "hidden",
    boxShadow: "0px 1px 4px rgba(0,0,0,0.03)",
    elevation: 1,
  },
  row: {
    minHeight: 78,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EDF4EF",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  earnedIcon: {
    backgroundColor: "#E8F7EE",
  },
  spentIcon: {
    backgroundColor: "#FFF5E5",
  },
  activityIcon: {
    backgroundColor: "#F1F5F9",
  },
  eventCopy: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 12,
    gap: 2,
  },
  eventTitle: {
    color: "#0D1811",
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
  },
  eventSubtitle: {
    color: "#64748B",
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  eventMeta: {
    color: "#94A3B8",
    fontSize: 10.5,
    fontFamily: "Nunito_600SemiBold",
    marginTop: 2,
    textTransform: "capitalize",
  },
  amountCopy: {
    alignItems: "flex-end",
    gap: 2,
  },
  amount: {
    fontSize: 16,
    fontFamily: "IBMPlexMono_600SemiBold",
  },
  earnedText: {
    color: "#059669",
  },
  spentText: {
    color: "#D97706",
  },
  activityText: {
    color: "#64748B",
  },
  after: {
    color: "#94A3B8",
    fontSize: 10.5,
    fontFamily: "IBMPlexMono_500Medium",
  },
  stateCard: {
    padding: 32,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE8E0",
    alignItems: "center",
    gap: 8,
  },
  stateTitle: {
    color: "#0D1811",
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    marginTop: 4,
  },
  stateText: {
    color: "#64748B",
    fontSize: 12.5,
    fontFamily: "Nunito_500Medium",
    textAlign: "center",
    lineHeight: 18,
  },
});
