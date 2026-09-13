import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowRight,
  Camera,
  Coins,
  Footprints,
  Leaf,
  Receipt,
  Sparkles,
  Zap,
} from "lucide-react-native";
import { BackButton } from "@/components/custom/back-button";
import { Text } from "@/components/ui/text";
import { useActivity } from "@/src/hooks/queries";
import type { ActivityEvent } from "@/src/types/api";

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const now = new Date();
  const isToday = parsed.toDateString() === now.toDateString();
  const timeStr = parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today · ${timeStr}`;
  return `${parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${timeStr}`;
}

function getActivityIcon(kind: string) {
  const k = kind.toLowerCase();
  if (k.includes("scan")) return <Camera size={16} color="#2EA86E" />;
  if (k.includes("receipt")) return <Receipt size={16} color="#2EA86E" />;
  if (k.includes("offset")) return <Leaf size={16} color="#2EA86E" />;
  if (k.includes("commute") || k.includes("walk") || k.includes("step"))
    return <Footprints size={16} color="#2EA86E" />;
  if (k.includes("solar") || k.includes("energy"))
    return <Zap size={16} color="#2EA86E" />;
  return <Sparkles size={16} color="#2EA86E" />;
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const activityQuery = useActivity();
  const [filter, setFilter] = useState<"all" | "scans" | "receipts" | "offsets">("all");

  const events: ActivityEvent[] = useMemo(() => {
    const raw = activityQuery.data ?? [];
    if (filter === "all") return raw;
    if (filter === "scans") return raw.filter((e) => e.kind.toLowerCase().includes("scan"));
    if (filter === "receipts") return raw.filter((e) => e.kind.toLowerCase().includes("receipt"));
    if (filter === "offsets") return raw.filter((e) => e.kind.toLowerCase().includes("offset"));
    return raw;
  }, [activityQuery.data, filter]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton label="Back" fallbackRoute="/(tabs)" />
        <Text style={styles.title}>Recent Activity</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={activityQuery.isRefetching}
            onRefresh={() => activityQuery.refetch()}
            tintColor="#2EA86E"
          />
        }
      >

        <Text style={styles.subtitle}>
          Track your climate actions, scans, purchases, and carbon offsets in one place.
        </Text>

        <View style={styles.filters}>
          {(
            [
              { key: "all", label: "All" },
              { key: "scans", label: "Scans" },
              { key: "receipts", label: "Receipts" },
              { key: "offsets", label: "Offsets" },
            ] as const
          ).map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === item.key && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {activityQuery.isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#2EA86E" />
            <Text style={styles.loadingText}>Loading activities…</Text>
          </View>
        ) : events.length > 0 ? (
          <View style={styles.card}>
            {events.map((ev, idx) => {
              const isLast = idx === events.length - 1;
              const hasDelta = ev.points_delta !== 0 && ev.points_delta != null;
              return (
                <View
                  key={ev.id ?? `event-${idx}`}
                  style={[styles.row, !isLast && styles.rowBorder]}
                >
                  <View style={styles.iconWrap}>{getActivityIcon(ev.kind)}</View>
                  <View style={styles.contentWrap}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {ev.title}
                    </Text>
                    {ev.subtitle ? (
                      <Text style={styles.eventSubtitle} numberOfLines={2}>
                        {ev.subtitle}
                      </Text>
                    ) : null}
                    <Text style={styles.eventTimestamp}>
                      {formatTimestamp(ev.created_at)}
                    </Text>
                  </View>
                  {hasDelta ? (
                    <View
                      style={[
                        styles.pointsBadge,
                        {
                          backgroundColor:
                            ev.points_delta > 0
                              ? "rgba(46,168,110,0.12)"
                              : "rgba(224,82,82,0.12)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pointsText,
                          {
                            color: ev.points_delta > 0 ? "#2EA86E" : "#E05252",
                          },
                        ]}
                      >
                        {ev.points_delta > 0 ? `+${ev.points_delta}` : ev.points_delta}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Sparkles size={36} color="#7A9082" />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptySubtitle}>
              Scan a product, log a commute, or upload a receipt to start building your
              activity log.
            </Text>
          </View>
        )}

        <Pressable
          style={styles.ledgerLink}
          onPress={() => router.push("/rewards/history")}
        >
          <View style={styles.ledgerLinkIcon}>
            <Coins size={18} color="#2EA86E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ledgerLinkTitle}>Coins & Transaction History</Text>
            <Text style={styles.ledgerLinkSub}>
              View points earned, spent, and balance ledger
            </Text>
          </View>
          <ArrowRight size={16} color="#2EA86E" />
        </Pressable>
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
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: "#183222",
    fontSize: 19,
    fontFamily: "Nunito_800ExtraBold",
  },
  headerSpacer: {
    width: 52,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Nunito_500Medium",
    color: "#6B8072",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#E6F3EC",
  },
  filterChipActive: {
    backgroundColor: "#183222",
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#3F5648",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.18)",
    shadowColor: "#0D2818",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(46,168,110,0.12)",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(46,168,110,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  contentWrap: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
  eventSubtitle: {
    fontSize: 12,
    fontFamily: "Nunito_500Medium",
    color: "#5C7364",
    marginTop: 2,
  },
  eventTimestamp: {
    fontSize: 11,
    fontFamily: "Nunito_500Medium",
    color: "#8FA395",
    marginTop: 4,
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  pointsText: {
    fontSize: 12,
    fontFamily: "Nunito_800ExtraBold",
  },
  loadingBox: {
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: "#5C7364",
  },
  emptyBox: {
    padding: 36,
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.15)",
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    color: "#183222",
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: "Nunito_500Medium",
    color: "#6B8072",
    textAlign: "center",
    lineHeight: 17,
  },
  ledgerLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 18,
    padding: 14,
    marginTop: 18,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.2)",
  },
  ledgerLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(46,168,110,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  ledgerLinkTitle: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
  ledgerLinkSub: {
    fontSize: 11,
    fontFamily: "Nunito_500Medium",
    color: "#6B8072",
    marginTop: 1,
  },
});
