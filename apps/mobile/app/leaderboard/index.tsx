import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronRight,
  Crown,
  Gift,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BackButton } from "@/components/custom/back-button";
import { Text } from "@/components/ui/text";
import { api } from "@/src/lib/api";
import { formatLeagueNumber } from "@/src/lib/league";
import type {
  FriendResult,
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardScope,
} from "@/src/types/api";

const fallbackPeople: LeaderboardEntry[] = [
  { id: "maya", username: "maya.green", display_name: "Maya Green", impact_points: 2410, carbon_score: 774, rank: 1 },
  { id: "rohan", username: "rohan.loop", display_name: "Rohan Mehta", impact_points: 1850, carbon_score: 742, rank: 2 },
  { id: "aisha", username: "aisha.loop", display_name: "Aisha Sharma", impact_points: 1420, carbon_score: 681, rank: 3, is_current_user: true },
  { id: "dev", username: "dev.reuse", display_name: "Dev Kapoor", impact_points: 1180, carbon_score: 654, rank: 4 },
];

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [metric, setMetric] = useState<LeaderboardMetric>("impact_points");
  const [people, setPeople] = useState<LeaderboardEntry[]>(fallbackPeople);
  const [friends, setFriends] = useState<FriendResult[]>([
    { id: "rohan", username: "rohan.loop", display_name: "Rohan Mehta", impact_points: 1850, carbon_score: 742, is_friend: true },
  ]);
  const [username, setUsername] = useState("");
  const [searchResults, setSearchResults] = useState<FriendResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const rows = useMemo(() => {
    const source = scope === "friends" ? friends : people;
    return [...source].sort((a, b) =>
      metric === "impact_points"
        ? (b.impact_points || 0) - (a.impact_points || 0)
        : (b.carbon_score || 0) - (a.carbon_score || 0)
    );
  }, [friends, metric, people, scope]);

  async function loadLeaderboard(nextScope = scope, nextMetric = metric) {
    try {
      const remote = await api.getLeaderboard(nextScope, nextMetric);
      if (!remote.length) return;
      if (nextScope === "friends") {
        setFriends(remote.map((person: LeaderboardEntry) => ({ ...person, is_friend: true })));
      } else {
        setPeople(remote);
      }
    } catch {
      /* offline fallback remains visible */
    }
  }

  async function refresh() {
    setRefreshing(true);
    await loadLeaderboard();
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
      const found = fallbackPeople
        .filter(
          (person) =>
            person.username.toLowerCase().includes(username.trim().toLowerCase()) &&
            !friends.some((friend) => friend.id === person.id)
        )
        .map((person) => ({ ...person, is_friend: false }));
      setSearchResults(found);
      if (!found.length) setNotice("No matching username found.");
    } finally {
      setBusy(false);
    }
  }

  async function addFriend(person: FriendResult) {
    let added = person;
    try {
      const remote = await api.addFriend(person.username);
      const globalRow = people.find((entry) => entry.id === person.id);
      added = {
        ...(globalRow ?? {}),
        ...person,
        ...remote,
        display_name: remote.display_name ?? person.display_name,
        is_friend: true,
      };
    } catch {
      const globalRow = people.find((entry) => entry.id === person.id);
      added = { ...(globalRow ?? {}), ...person, is_friend: true };
    }
    setFriends((current) =>
      current.some((friend) => friend.id === added.id)
        ? current.map((friend) => (friend.id === added.id ? { ...friend, ...added, is_friend: true } : friend))
        : [...current, added]
    );
    setSearchResults((current) => current.filter((item) => item.id !== person.id));
    setNotice(`${person.display_name} added to your friends circle.`);
  }

  async function removeFriend(person: FriendResult) {
    try {
      await api.removeFriend(person.username);
    } catch {
      /* demo mode */
    }
    setFriends((current) => current.filter((friend) => friend.id !== person.id));
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 36,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2EA86E" />
        }
      >
        <View style={styles.container}>
          <BackButton label="Back" fallbackRoute="/(tabs)" />

          {/* ── HERO WITH RICH GRADIENT & GLOW ORB ── */}
          <LinearGradient
            colors={["#0C2518", "#143C28", "#0B1D14"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroGlowOrb} />
            <View style={styles.heroGlowOrbSecondary} />
            <View style={styles.heroIconWrap}>
              <Crown size={22} color="#5EEAD4" strokeWidth={2.2} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>KARMA COMMUNITY</Text>
              <Text style={styles.title}>Leaderboard & Ranks</Text>
              <Text style={styles.subtitle}>Compete on everyday green actions, together.</Text>
            </View>
          </LinearGradient>

          {/* ── SCOPE SEGMENT (Global vs Friends) ── */}
          <View style={styles.scopeSegment}>
            <TouchableOpacity
              onPress={() => {
                setScope("global");
                void loadLeaderboard("global", metric);
              }}
              style={[styles.scopeTab, scope === "global" && styles.scopeTabActive]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.scopeTabText,
                  scope === "global" && styles.scopeTabTextActive,
                ]}
              >
                Global
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setScope("friends");
                void loadLeaderboard("friends", metric);
              }}
              style={[styles.scopeTab, scope === "friends" && styles.scopeTabActive]}
              activeOpacity={0.8}
            >
              <Users
                size={15}
                color={scope === "friends" ? "#FFFFFF" : "#556E60"}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.scopeTabText,
                  scope === "friends" && styles.scopeTabTextActive,
                ]}
              >
                Friends
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── METRIC SELECTOR: NO PILLBOXES (Minimalist Segmented Switcher) ── */}
          <View style={styles.metricRow}>
            <Text style={styles.metricRowLabel}>Rank by</Text>
            <View style={styles.metricSegment}>
              <TouchableOpacity
                onPress={() => {
                  setMetric("impact_points");
                  void loadLeaderboard(scope, "impact_points");
                }}
                style={[
                  styles.metricTab,
                  metric === "impact_points" && styles.metricTabActive,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.metricTabText,
                    metric === "impact_points" && styles.metricTabTextActive,
                  ]}
                >
                  Karma Coins
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setMetric("kcs");
                  void loadLeaderboard(scope, "kcs");
                }}
                style={[
                  styles.metricTab,
                  metric === "kcs" && styles.metricTabActive,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.metricTabText,
                    metric === "kcs" && styles.metricTabTextActive,
                  ]}
                >
                  Carbon Score
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── RANKINGS CARD ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {scope === "global" ? "Global rankings" : "Friends circle"}
              </Text>
              <Text style={styles.cardHint}>
                {metric === "impact_points" ? "Karma Coins" : "Carbon Credit Score"}
              </Text>
            </View>

            <View style={styles.rowsList}>
              {rows.map((row, index) => {
                const rankNum = index + 1;
                const isTop1 = rankNum === 1;
                const isTop2 = rankNum === 2;
                const isTop3 = rankNum === 3;
                const isFriend =
                  row.is_friend || friends.some((friend) => friend.id === row.id);

                return (
                  <View
                    key={row.id}
                    style={[
                      styles.rankRow,
                      row.is_current_user && styles.currentRow,
                    ]}
                  >
                    {/* Rank Number */}
                    <View style={styles.rankNumWrap}>
                      <Text
                        style={[
                          styles.rankText,
                          isTop1 && styles.rankTextGold,
                          isTop2 && styles.rankTextSilver,
                          isTop3 && styles.rankTextBronze,
                        ]}
                      >
                        {rankNum}
                      </Text>
                    </View>

                    {/* Avatar */}
                    <View
                      style={[
                        styles.avatar,
                        isTop1 && styles.avatarGold,
                        isTop2 && styles.avatarSilver,
                        isTop3 && styles.avatarBronze,
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          isTop1 && styles.avatarTextGold,
                          isTop2 && styles.avatarTextSilver,
                          isTop3 && styles.avatarTextBronze,
                        ]}
                      >
                        {row.display_name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>

                    {/* Identity */}
                    <View style={styles.personCopy}>
                      <View style={styles.nameRow}>
                        <Text style={styles.personName} numberOfLines={1}>
                          {row.display_name}
                        </Text>
                        {row.is_current_user ? (
                          <Text style={styles.youIndicator}>· You</Text>
                        ) : null}
                      </View>
                      <Text style={styles.username} numberOfLines={1}>
                        @{row.username}
                      </Text>
                    </View>

                    {/* Value */}
                    <View style={styles.valueWrap}>
                      <Text style={styles.valueText} numberOfLines={1}>
                        {metric === "impact_points"
                          ? formatLeagueNumber(row.impact_points)
                          : formatLeagueNumber(row.carbon_score)}
                      </Text>
                      <Text style={styles.valueUnit}>
                        {metric === "impact_points" ? "coins" : "score"}
                      </Text>
                    </View>

                    {/* Add Friend Action */}
                    {scope === "global" && !row.is_current_user && !isFriend ? (
                      <TouchableOpacity
                        onPress={() => void addFriend({ ...row, is_friend: false })}
                        style={styles.addFriendBtn}
                        activeOpacity={0.8}
                      >
                        <UserPlus size={14} color="#FFFFFF" strokeWidth={2.4} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── ADD FRIENDS CARD ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Add friends</Text>
              <Text style={styles.cardHint}>Username only</Text>
            </View>

            <View style={styles.searchRow}>
              <Search size={16} color="#789185" strokeWidth={2.2} />
              <TextInput
                value={username}
                onChangeText={setUsername}
                onSubmitEditing={() => void search()}
                placeholder="Search @username"
                placeholderTextColor="#91A59A"
                style={styles.searchInput}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => void search()}
                style={styles.findButton}
                activeOpacity={0.8}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.findButtonText}>Find</Text>
                )}
              </TouchableOpacity>
            </View>

            {notice ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ) : null}

            {/* Search Results */}
            {searchResults.map((person) => (
              <View key={person.id} style={styles.friendResultRow}>
                <View style={styles.friendResultAvatar}>
                  <Text style={styles.friendResultAvatarText}>
                    {person.display_name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{person.display_name}</Text>
                  <Text style={styles.username}>@{person.username}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => void addFriend(person)}
                  style={styles.actionAddFriendBtn}
                  activeOpacity={0.8}
                >
                  <UserPlus size={13} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.actionAddFriendText}>Add</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Existing Friends List */}
            {friends.length > 0 ? (
              <View style={styles.friendsListSection}>
                <Text style={styles.friendsSectionHeader}>YOUR FRIENDS</Text>
                {friends.map((person) => (
                  <View key={person.id} style={styles.friendItemRow}>
                    <View style={styles.friendResultAvatar}>
                      <Text style={styles.friendResultAvatarText}>
                        {person.display_name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personName}>{person.display_name}</Text>
                      <Text style={styles.username}>@{person.username}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => void removeFriend(person)}
                      style={styles.removeFriendBtn}
                      activeOpacity={0.7}
                    >
                      <X size={16} color="#8BA097" strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {/* ── GREEN CHALLENGES LINK CARD ── */}
          <TouchableOpacity
            style={styles.challengesLinkCard}
            onPress={() => router.push("/challenges")}
            activeOpacity={0.88}
          >
            <View style={styles.challengesLinkIconWrap}>
              <Gift size={18} color="#2EA86E" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengesLinkTitle}>Open green challenges</Text>
              <Text style={styles.challengesLinkSubtitle}>
                Complete daily and weekly missions to earn Karma Coins
              </Text>
            </View>
            <ChevronRight size={18} color="#2EA86E" strokeWidth={2.4} />
          </TouchableOpacity>

          {/* ── DISCLAIMER ── */}
          <Text style={styles.disclaimer}>
            Rankings are separate from challenges. Karma Coins reward actions; Carbon Credit Score measures impact.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4FAF6",
  },
  container: {
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
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
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
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "rgba(94,234,212,0.12)",
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.22)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: "#5EEAD4",
    letterSpacing: 1.3,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: "Nunito_900Black",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: "#B8D4C3",
    fontSize: 12.5,
    fontFamily: "Nunito_600SemiBold",
    lineHeight: 17,
  },

  // Scope Segment (Global vs Friends)
  scopeSegment: {
    backgroundColor: "#E6EFEA",
    borderRadius: 12,
    padding: 4,
    flexDirection: "row",
    gap: 4,
  },
  scopeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: "transparent",
  },
  scopeTabActive: {
    backgroundColor: "#0D251A",
  },
  scopeTabText: {
    fontSize: 13.5,
    fontFamily: "Nunito_700Bold",
    color: "#556E60",
  },
  scopeTabTextActive: {
    color: "#FFFFFF",
    fontFamily: "Nunito_800ExtraBold",
  },

  // Metric Row: Minimalist Segmented Tabs (NO PILLBOXES)
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricRowLabel: {
    color: "#0B1D12",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
  metricSegment: {
    backgroundColor: "#E6EFEA",
    borderRadius: 10,
    padding: 3,
    flexDirection: "row",
    gap: 3,
  },
  metricTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: "transparent",
  },
  metricTabActive: {
    backgroundColor: "#0D251A",
  },
  metricTabText: {
    color: "#556E60",
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
  },
  metricTabTextActive: {
    color: "#FFFFFF",
    fontFamily: "Nunito_800ExtraBold",
  },

  // Card
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
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 4,
  },
  cardTitle: {
    color: "#0B1D12",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 17,
  },
  cardHint: {
    color: "#789185",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11.5,
  },

  // Rankings List
  rowsList: {
    gap: 2,
  },
  rankRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#EDF3EF",
  },
  currentRow: {
    backgroundColor: "#F0FAF4",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.25)",
  },
  rankNumWrap: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rankText: {
    fontSize: 14,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#789185",
  },
  rankTextGold: {
    color: "#D97706",
    fontSize: 15,
  },
  rankTextSilver: {
    color: "#475569",
    fontSize: 15,
  },
  rankTextBronze: {
    color: "#9A3412",
    fontSize: 15,
  },

  // Avatars
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8F7EE",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarGold: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  avatarSilver: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
  },
  avatarBronze: {
    backgroundColor: "#FFEDD5",
    borderColor: "#FED7AA",
  },
  avatarText: {
    color: "#2EA86E",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
  avatarTextGold: {
    color: "#B45309",
  },
  avatarTextSilver: {
    color: "#334155",
  },
  avatarTextBronze: {
    color: "#9A3412",
  },

  // Person Copy
  personCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  personName: {
    color: "#0B1D12",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14.5,
  },
  youIndicator: {
    color: "#2EA86E",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  username: {
    color: "#789185",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11.5,
  },

  // Value
  valueWrap: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  valueText: {
    color: "#0B1D12",
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 15.5,
  },
  valueUnit: {
    color: "#789185",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 10.5,
  },
  addFriendBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#0D251A",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Add Friends Section
  searchRow: {
    backgroundColor: "#F4FAF6",
    borderWidth: 1.2,
    borderColor: "rgba(215, 235, 222, 0.95)",
    borderRadius: 12,
    height: 46,
    paddingLeft: 12,
    paddingRight: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#0B1D12",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    paddingVertical: 8,
  },
  findButton: {
    backgroundColor: "#0D251A",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  findButtonText: {
    color: "#FFFFFF",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
  },
  noticeBox: {
    backgroundColor: "#E8F7EE",
    padding: 8,
    borderRadius: 8,
  },
  noticeText: {
    color: "#165534",
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    textAlign: "center",
  },

  // Friend Search Results
  friendResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "#EDF3EF",
  },
  friendResultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F7EE",
    alignItems: "center",
    justifyContent: "center",
  },
  friendResultAvatarText: {
    color: "#2EA86E",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12.5,
  },
  actionAddFriendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D251A",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionAddFriendText: {
    color: "#FFFFFF",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11.5,
  },

  // Existing Friends List
  friendsListSection: {
    marginTop: 4,
  },
  friendsSectionHeader: {
    color: "#789185",
    letterSpacing: 1.2,
    fontSize: 10,
    fontFamily: "Nunito_800ExtraBold",
    marginBottom: 4,
  },
  friendItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#EDF3EF",
  },
  removeFriendBtn: {
    padding: 6,
  },

  // Challenges Link Card
  challengesLinkCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "rgba(215, 235, 222, 0.95)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F281B",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  challengesLinkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E8F7EE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  challengesLinkTitle: {
    color: "#0B1D12",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14.5,
  },
  challengesLinkSubtitle: {
    color: "#5F7768",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11.5,
  },

  // Disclaimer
  disclaimer: {
    color: "#789185",
    fontSize: 11.5,
    fontFamily: "Nunito_600SemiBold",
    lineHeight: 16,
    textAlign: "center",
    paddingHorizontal: 12,
  },
});
