import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Sparkles, Trophy, X } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { leagueBadgeSource } from "@/src/lib/league";
import type { LeagueSummary, LeagueTier } from "@/src/types/api";

// A promotion is a server event. Remembering the event key for this app
// session prevents the home screen and league screen from showing the same
// celebration twice after a query refresh.
const seenPromotions = new Set<string>();

const TIER_NAMES: Record<LeagueTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

const TIER_COLORS: Record<LeagueTier, string> = {
  bronze: "#C9824A",
  silver: "#9AA5AE",
  gold: "#E5A72D",
  platinum: "#7B8CFF",
};

export function LeagueTransitionCelebration({ league }: { league?: LeagueSummary }) {
  const [promotion, setPromotion] = useState<{ from: LeagueTier; to: LeagueTier } | null>(null);
  const scale = useRef(new Animated.Value(0.72)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const from = league?.last_promotion_from;
    const to = league?.last_promotion_to;
    const at = league?.last_promotion_at;
    if (!from || !to || !at || from === to || to !== league?.tier) return;
    const key = `${at}:${from}:${to}`;
    if (seenPromotions.has(key)) return;
    seenPromotions.add(key);
    setPromotion({ from, to });
  }, [league?.last_promotion_at, league?.last_promotion_from, league?.last_promotion_to, league?.tier]);

  useEffect(() => {
    if (!promotion) return;
    scale.setValue(0.72);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 13, stiffness: 150 }),
      Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [opacity, promotion, scale]);

  if (!promotion) return null;
  const color = TIER_COLORS[promotion.to];

  return (
    <Modal transparent visible onRequestClose={() => setPromotion(null)} animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <Pressable accessibilityLabel="Close promotion celebration" onPress={() => setPromotion(null)} style={styles.close}>
            <X size={18} color="#789185" />
          </Pressable>
          <View style={[styles.sparkle, { backgroundColor: `${color}24` }]}>
            <Sparkles size={19} color={color} />
          </View>
          <Text style={styles.eyebrow}>LEAGUE PROMOTION</Text>
          <Text style={styles.title}>You moved up!</Text>
          <Text style={styles.subtitle}>
            Your verified green actions promoted you from {TIER_NAMES[promotion.from]} to {TIER_NAMES[promotion.to]} League.
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.oldBadge}><Image source={leagueBadgeSource(promotion.from)} style={styles.smallBadge} resizeMode="contain" /></View>
            <Text style={[styles.arrow, { color }]}>→</Text>
            <View style={[styles.newBadge, { borderColor: color, backgroundColor: `${color}18` }]}><Image source={leagueBadgeSource(promotion.to)} style={styles.largeBadge} resizeMode="contain" /></View>
          </View>
          <View style={[styles.status, { backgroundColor: `${color}18` }]}>
            <Trophy size={16} color={color} />
            <Text style={[styles.statusText, { color }]}>New badge unlocked</Text>
          </View>
          <Pressable onPress={() => setPromotion(null)} style={[styles.button, { backgroundColor: color }]}>
            <Text style={styles.buttonText}>Keep climbing</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(4, 20, 12, 0.58)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 390, backgroundColor: "#fff", borderRadius: 26, padding: 24, alignItems: "center", shadowColor: "#061B10", shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  close: { position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F6F2" },
  sparkle: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  eyebrow: { color: "#2EA86E", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: "#0E2A1E", fontSize: 28, fontWeight: "900", marginTop: 5 },
  subtitle: { color: "#668074", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 8 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 14, marginVertical: 20 },
  oldBadge: { width: 58, height: 58, borderRadius: 18, backgroundColor: "#F1F6F2", alignItems: "center", justifyContent: "center", opacity: 0.65 },
  newBadge: { width: 82, height: 82, borderRadius: 25, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  smallBadge: { width: 42, height: 42 },
  largeBadge: { width: 67, height: 67 },
  arrow: { fontSize: 28, fontWeight: "800" },
  status: { borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 7 },
  statusText: { fontSize: 12, fontWeight: "900" },
  button: { width: "100%", borderRadius: 13, paddingVertical: 13, alignItems: "center", marginTop: 18 },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
});
