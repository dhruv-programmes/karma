import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowRight,
  ChevronRight,
  Footprints,
  Leaf,
  TrendingUp,
  Wrench,
} from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Text } from "@/components/ui/text";
import {
  useActivity,
  useCloset,
  useImpact,
  useImpactTimeseries,
  useLeaderboard,
  useMe,
  useRecommendations,
  useScore,
  useSteps,
} from "@/src/hooks/queries";
import { useStepTracking } from "@/src/hooks/use-step-tracking";
import { useAuthStore } from "@/src/store/auth";
import { DEMO_REPAIR_ACTION_ID } from "@/src/types/api";
import { useTabBarClearance } from "@/src/theme/layout";
import { FootprintTrend } from "@/components/custom/footprint-trend";
import { ProductImage } from "@/components/custom/product-image";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const KCS_MIN = 480;
const KCS_MAX = 820;

function kcsProgress(score: number) {
  return Math.min(
    1,
    Math.max(0, (score - KCS_MIN) / (KCS_MAX - KCS_MIN))
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Returns color + glowColor + label + message based on the 480–820 KCS range. */
function ratingInfo(score: number): {
  color: string;
  glowColor: string;
  trackColor: string;
  label: string;
  message: string;
  gradient: [string, string];
} {
  const pct = kcsProgress(score);
  if (pct < 0.45) {
    return {
      color: "#F87171",
      glowColor: "#FCA5A5",
      trackColor: "rgba(248,113,113,0.18)",
      label: "Needs Attention",
      message: "High Carbon Intensity",
      gradient: ["#1A0A0A", "#0F1510"],
    };
  } else if (pct < 0.70) {
    return {
      color: "#FBBF24",
      glowColor: "#FDE68A",
      trackColor: "rgba(251,191,36,0.18)",
      label: "Making Progress",
      message: "On The Right Path",
      gradient: ["#141008", "#0F1510"],
    };
  } else {
    return {
      color: "#5EEAD4",
      glowColor: "#6EE7B7",
      trackColor: "rgba(94,234,212,0.20)",
      label: "Carbon Champion",
      message: "Great Sustainable Pace",
      gradient: ["#081410", "#0A1510"],
    };
  }
}

function ScoreRing({
  score,
  color,
  glowColor = "#5EEAD4",
  trackColor,
  insight,
  label,
}: {
  score: number | null;
  color: string;
  glowColor?: string;
  trackColor: string;
  insight: string;
  label: string;
}) {
  const size = 260;
  const stroke = 2.2;
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const targetProgress = score === null ? 0 : kcsProgress(score);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(targetProgress, {
      duration: 1400,
      easing: Easing.out(Easing.cubic),
    });
  }, [targetProgress, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - progress.value),
  }));

  const beadStyle = useAnimatedStyle(() => {
    "worklet";
    const angle = (-90 + progress.value * 360) * (Math.PI / 180);
    const bx = cx + r * Math.cos(angle);
    const by = cy + r * Math.sin(angle);
    return {
      transform: [
        { translateX: bx - 9 },
        { translateY: by - 9 },
      ],
      opacity: progress.value > 0.01 ? 1 : 0,
    };
  });

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.10,
        shadowRadius: 20,
        elevation: 5,
      }}
    >
      {/* SVG Streak + Track */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Base faint glass circle perimeter */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="rgba(255, 255, 255, 0.28)"
          strokeWidth={1.5}
          fill="none"
        />

        {/* Outer atmospheric aura */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={r}
          stroke={glowColor}
          strokeWidth={8}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={0.22}
        />

        {/* Luminous colored bloom */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={r}
          stroke={glowColor}
          strokeWidth={4.5}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={0.55}
        />

        {/* Ultra-crisp bright core streak */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={r}
          stroke="#FFFFFF"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={0.96}
        />
      </Svg>

      {/* Glowing Bead at the tip of the streak */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            width: 18,
            height: 18,
            alignItems: "center",
            justifyContent: "center",
          },
          beadStyle,
        ]}
      >
        {/* Outer halo */}
        <View
          style={{
            position: "absolute",
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: glowColor,
            opacity: 0.45,
          }}
        />
        {/* Mid bloom */}
        <View
          style={{
            position: "absolute",
            width: 11,
            height: 11,
            borderRadius: 5.5,
            backgroundColor: "#FFFFFF",
            opacity: 0.8,
          }}
        />
        {/* Solid white bead */}
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: "#FFFFFF",
            shadowColor: "#FFFFFF",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 4,
            elevation: 4,
          }}
        />
      </Animated.View>

      {/* Inner orb typography & icons */}
      <View
        style={{
          width: size - 28,
          maxWidth: size - 28,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 10,
        }}
      >
        {/* Top Leaf Icon */}
        <View style={{ marginBottom: 6, opacity: 0.95 }}>
          <Leaf size={22} color="#FFFFFF" strokeWidth={2.2} />
        </View>

        {/* Insight text */}
        <Text
          numberOfLines={2}
          style={{
            fontSize: 15,
            fontFamily: "Nunito_600SemiBold",
            color: "#FFFFFF",
            textAlign: "center",
            lineHeight: 20,
            opacity: 0.92,
            maxWidth: 190,
          }}
        >
          {insight}
        </Text>

        {/* Big score */}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{
            fontSize: 66,
            fontFamily: "Nunito_800ExtraBold",
            color: "#FFFFFF",
            lineHeight: 72,
            marginVertical: 2,
            maxWidth: 210,
          }}
        >
          {score === null ? "—" : Math.round(score)}
        </Text>

        {/* Level label */}
        <Text
          numberOfLines={2}
          style={{
            fontSize: 13,
            fontFamily: "Nunito_600SemiBold",
            color: "rgba(255,255,255,0.78)",
            letterSpacing: 0.4,
            lineHeight: 17,
            textAlign: "center",
            maxWidth: 206,
            marginBottom: 10,
          }}
        >
          {label}
        </Text>

        {/* Pagination dots */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: "#FFFFFF",
            }}
          />
          <View
            style={{
              width: 4.5,
              height: 4.5,
              borderRadius: 2.25,
              backgroundColor: "rgba(255,255,255,0.4)",
            }}
          />
          <View
            style={{
              width: 4.5,
              height: 4.5,
              borderRadius: 2.25,
              backgroundColor: "rgba(255,255,255,0.4)",
            }}
          />
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabClearance = useTabBarClearance();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const startingFootprintKg = useAuthStore((s) => s.startingFootprintKg);
  const goal = useAuthStore((s) => s.goal);

  const me = useMe();
  const score = useScore();
  const impact = useImpact();
  const series = useImpactTimeseries();
  const recs = useRecommendations();
  const closet = useCloset();
  const activity = useActivity();
  const steps = useSteps();
  const stepTracking = useStepTracking(steps.data?.todaySteps ?? 0);
  const best = recs.data?.[0];

  const displayName = me.data?.name || user?.name || "Member";
  const firstName = displayName.split(" ")[0];
  const displayScore =
    score.data?.state === "verified" && score.data.verified !== null
      ? score.data.verified
      : score.data?.provisional ?? null;
  const scoreState =
    score.data === undefined
      ? "Loading score"
      : score.data.state === "verified" && score.data.verified !== null
        ? "Verified score"
        : "Provisional estimate";
  const displayTrend = me.data?.trend_delta ?? user?.trend_delta ?? 14;

  const currentMonthFootprint = Math.round(impact.data?.this_month_kg ?? 0);
  const baselineFootprint = startingFootprintKg ?? 74;
  const footprint =
    currentMonthFootprint > 0 && currentMonthFootprint < 500
      ? currentMonthFootprint
      : baselineFootprint;

  const targetReduction = goal.reductionPct ?? 15;
  const targetFootprint = Math.round(footprint * (1 - targetReduction / 100));

  const rating = ratingInfo(displayScore ?? KCS_MIN);
  const impactPoints = me.data?.impact_points ?? user?.impact_points ?? 0;
  const stepData = steps.data;
  const isWeb = Platform.OS === "web";
  const hasNativeStepData = !isWeb && !!stepData;
  const stepProgress = stepData
    ? Math.min(100, Math.round((stepData.todaySteps / stepData.targetSteps) * 100))
    : 0;
  const maxSeriesSteps = Math.max(
    1,
    ...(stepData?.series.map((point) => point.steps) ?? [])
  );
  const stepNotice = isWeb
    ? "Step tracking is available on iPhone and Android. Open Carbon Loop on your phone to enable it."
    : steps.isError
      ? "Walking rewards are unavailable right now. Try again when you are online."
      : stepTracking.state === "denied"
        ? "Motion permission is off. Enable it in Settings to earn walking points."
        : stepTracking.state === "unavailable"
          ? "This phone does not expose a pedometer to Carbon Loop."
          : stepTracking.state === "error"
            ? "Could not sync steps. Your saved rewards have not changed."
            : stepTracking.state === "enabled" && Platform.OS === "android"
              ? "Android tracks steps while Carbon Loop is open."
              : stepTracking.state === "enabled"
                ? "Today's phone steps are synced to your rewards."
                : "Enable on your phone to start earning Impact Points for walking.";
  const stepCta = isWeb
    ? "Use on phone"
    : stepTracking.isSyncing
      ? "Syncing…"
      : stepTracking.state === "enabled"
        ? "Sync steps"
        : "Enable step tracking";

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: tabClearance,
        }}
      >
        {/* ── HERO SECTION ─────────────────────────────── */}
        <LinearGradient
          colors={["#5DC994", "#3DB876", "#2EA86E"]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 20 }]}
        >
          {/* Wide light ray from upper-left sweeping diagonally */}
          <LinearGradient
            colors={["rgba(255,255,255,0.38)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]}
            locations={[0, 0.45, 1]}
            start={{ x: 0.05, y: 0 }}
            end={{ x: 0.75, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          {/* Thin bright ray crossing from upper-right */}
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.28)", "rgba(255,255,255,0)"]}
            locations={[0, 0.5, 1]}
            start={{ x: 0.85, y: 0 }}
            end={{ x: 0.15, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          {/* Bottom highlight — bright white fade up for depth */}
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.15)"]}
            start={{ x: 0.5, y: 0.4 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          {/* Frosted softness — very light, keeps green dominant */}
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(255,255,255,0.08)" },
            ]}
            pointerEvents="none"
          />



          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Image
                source={require("@/assets/karma-text.png")}
                style={{ width: 72, height: 20 }}
                resizeMode="contain"
                tintColor="rgba(255,255,255,0.95)"
              />
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  fontSize: 22,
                  fontFamily: "Nunito_700Bold",
                  color: "#FFFFFF",
                  marginTop: 4,
                }}
              >
                {greeting()}, {firstName}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Nunito_400Regular",
                  color: "rgba(255,255,255,0.72)",
                  marginTop: 2,
                }}
              >
                {rating.message.split(".")[0]}.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Nunito_700Bold",
                  color: "#FFFFFF",
                }}
              >
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Score ring — insight + glow streak */}
          <View style={styles.ringContainer}>
            <ScoreRing
              score={displayScore}
              color={rating.color}
              glowColor={rating.glowColor}
              trackColor={rating.trackColor}
              insight="Carbon Credit Score"
              label={`${rating.label} · ${scoreState}`}
            />

            <View style={styles.heroPillRow}>
              {displayTrend > 0 && (
                <View style={styles.trendPill}>
                  <TrendingUp size={12} color="rgba(255,255,255,0.9)" strokeWidth={2.5} />
                  <Text style={styles.heroPillText}>+{displayTrend} this month</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.pointsPill}
                onPress={() => router.push("/rewards")}
                activeOpacity={0.82}
              >
                <Text style={styles.pointsPillValue}>{impactPoints}</Text>
                <Text style={styles.heroPillText}>Impact Points</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stat pills row */}
          <View style={styles.statRow}>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>Footprint</Text>
              <Text style={[styles.statValue, { color: "#FFFFFF" }]}>
                {footprint}{" "}
                <Text style={styles.statUnit}>kg CO₂e</Text>
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>Target</Text>
              <Text style={[styles.statValue, { color: "#FFFFFF" }]}>
                {targetFootprint}{" "}
                <Text style={styles.statUnit}>kg</Text>
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>Streak</Text>
              <Text style={[styles.statValue, { color: rating.color }]}>
                {me.data?.streak_days ?? user?.streak_days ?? 5}
                <Text style={styles.statUnit}> days</Text>
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── CONTENT SHEET ─────────────────────────────── */}
        <View style={styles.sheet}>
          {/* ── WALK & EARN ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Walk & Earn</Text>
            <View style={styles.walkCard}>
              <View style={styles.walkHeader}>
                <View style={styles.walkIconBox}>
                  <Footprints size={20} color="#2EA86E" strokeWidth={2} />
                </View>
                <View style={styles.walkHeaderCopy}>
                  <Text style={styles.walkTitle}>Turn steps into Impact Points</Text>
                  <Text style={styles.walkRating}>
                    {hasNativeStepData ? stepData.rating : "Phone-only metric"}
                  </Text>
                </View>
                {hasNativeStepData ? (
                  <View style={styles.walkPointsBadge}>
                    <Text style={styles.walkPointsText}>+{stepData.todayPoints} pts</Text>
                  </View>
                ) : null}
              </View>

              {hasNativeStepData ? (
                <>
                  <View style={styles.walkStepRow}>
                    <Text style={styles.walkSteps}>{stepData.todaySteps.toLocaleString()}</Text>
                    <Text style={styles.walkTarget}> / {stepData.targetSteps.toLocaleString()} steps</Text>
                  </View>
                  <View style={styles.walkProgressTrack}>
                    <View style={[styles.walkProgressFill, { width: `${stepProgress}%` }]} />
                  </View>
                  <Text style={styles.walkDetail}>
                    {stepData.nextThreshold === null
                      ? "Daily walking reward unlocked."
                      : `${Math.max(0, stepData.nextThreshold - stepData.todaySteps).toLocaleString()} steps to your next reward`}
                  </Text>
                  {stepData.series.length > 0 ? (
                    <View style={styles.stepSeries}>
                      {stepData.series.slice(-7).map((point) => (
                        <View key={`${point.date}-${point.label}`} style={styles.stepSeriesItem}>
                          <View
                            style={[
                              styles.stepSeriesBar,
                              { height: 6 + Math.round((point.steps / maxSeriesSteps) * 24) },
                            ]}
                          />
                          <Text style={styles.stepSeriesLabel}>{point.label}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}

              <Text style={styles.walkNotice}>{stepNotice}</Text>
              <TouchableOpacity
                style={[styles.walkCta, (isWeb || stepTracking.isSyncing) && styles.walkCtaMuted]}
                onPress={stepTracking.enableOrSync}
                disabled={stepTracking.isSyncing}
                activeOpacity={0.82}
              >
                <Text style={styles.walkCtaText}>{stepCta}</Text>
                {!isWeb ? <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.5} /> : null}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── NEXT BEST ACTION ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your Next Best Action</Text>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                router.push({
                  pathname: "/map",
                  params: {
                    type: "repair",
                    actionId: best?.id || DEMO_REPAIR_ACTION_ID,
                    actionType: best?.action_type || "REPAIR",
                  },
                })
              }
              activeOpacity={0.9}
            >
              <View style={styles.actionImpactBadge}>
                <Text style={styles.actionImpactText}>
                  −4.2 kg CO₂e potential
                </Text>
              </View>
              <View style={styles.actionBody}>
                <View style={styles.actionIconBox}>
                  <Wrench size={20} color="#2EA86E" strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>
                    {best?.title || "Repair your old headphones"}
                  </Text>
                  <Text style={styles.actionSubtitle}>
                    {best?.subtitle || "Keep durable audio hardware out of landfills"}
                  </Text>
                </View>
              </View>
              <View style={styles.actionCTA}>
                <Text style={styles.actionCTAText}>Find a repair partner</Text>
                <ArrowRight size={14} color="#0D1811" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── STAT TILES ── */}
          <View style={styles.tileRow}>
            <View style={[styles.tile, { flex: 1 }]}>
              <Text style={styles.tileLabel}>Points</Text>
              <Text style={[styles.tileValue, { color: "#2EA86E" }]}>
                {me.data?.impact_points ?? user?.impact_points ?? 420}
              </Text>
              <Text style={styles.tileHint}>impact pts</Text>
            </View>
            <View style={[styles.tile, { flex: 1 }]}>
              <Text style={styles.tileLabel}>Residual</Text>
              <Text style={[styles.tileValue, { color: "#FFFFFF" }]}>
                ~{Math.round(impact.data?.residual_kg ?? 58)}
              </Text>
              <Text style={styles.tileHint}>kg left this month</Text>
            </View>
            <TouchableOpacity
              style={[styles.tile, { flex: 1 }]}
              onPress={() => router.push("/rewards")}
              activeOpacity={0.8}
            >
              <Text style={styles.tileLabel}>Rewards</Text>
              <Text style={[styles.tileValue, { color: "#E8A838" }]}>2</Text>
              <Text style={[styles.tileHint, { color: "#E8A838" }]}>
                unlocked
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── FOOTPRINT TREND ── */}
          {(series.data?.points ?? []).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Footprint Trend</Text>
              <View style={styles.trendCard}>
                <FootprintTrend
                  points={(series.data?.points ?? []).map((p) => ({
                    label: p.label,
                    kg: p.kg,
                  }))}
                />
              </View>
            </View>
          )}

          {/* ── LOOP CLOSET ── */}
          {(closet.data ?? []).length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Loop Closet</Text>
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/actions")}
                  style={styles.seeAllBtn}
                >
                  <Text style={styles.seeAllText}>See all</Text>
                  <ChevronRight size={13} color="#2EA86E" />
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {(closet.data ?? []).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push(`/product/${item.id}`)}
                    activeOpacity={0.85}
                    style={styles.closetCard}
                  >
                    <ProductImage uri={item.image_url} size="full" radius={12} />
                    <Text style={styles.closetName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.closetChip}>
                      <Text style={styles.closetChipText}>
                        {item.next_action_label || item.category}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── RECENT ACTIVITY ── */}
          {(activity.data ?? []).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Recent Activity</Text>
              <View style={styles.activityCard}>
                {(activity.data ?? []).slice(0, 4).map((ev, idx) => (
                  <View
                    key={ev.id}
                    style={[
                      styles.activityRow,
                      idx < Math.min((activity.data ?? []).length, 4) - 1
                        ? styles.activityRowBorder
                        : undefined,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle}>{ev.title}</Text>
                      {ev.subtitle ? (
                        <Text style={styles.activitySubtitle}>
                          {ev.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {ev.points_delta ? (
                      <Text
                        style={[
                          styles.activityPoints,
                          {
                            color:
                              ev.points_delta > 0 ? "#2EA86E" : "#E05252",
                          },
                        ]}
                      >
                        {ev.points_delta > 0 ? "+" : ""}
                        {ev.points_delta}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          )}

<<<<<<< HEAD
          {/* ── QUICK TOOLS ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Loop Tools</Text>
            <View style={styles.toolGrid}>
              <ToolCard
                icon={<Camera size={20} color="#2EA86E" strokeWidth={1.8} />}
                label="Scan Product"
                onPress={() => router.push("/scan")}
              />
              <ToolCard
                icon={<Receipt size={20} color="#2EA86E" strokeWidth={1.8} />}
                label="Import bill / receipt"
                onPress={() => router.push("/receipt")}
              />
              <ToolCard
                icon={<Recycle size={20} color="#2EA86E" strokeWidth={1.8} />}
                label="Recycling Hubs"
                onPress={() => router.push("/map?type=recycling")}
              />
              <ToolCard
                icon={<Leaf size={20} color="#2EA86E" strokeWidth={1.8} />}
                label="Offset Carbon"
                onPress={() =>
                  router.push("/offsets" as import("expo-router").Href)
                }
              />
            </View>
          </View>
=======
>>>>>>> 1e27da45c8e1dead582321527ef6a32640e09474
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAF8",
  },
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    overflow: "hidden",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  headerCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    marginRight: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    flexShrink: 0,
  },
  ringContainer: {
    alignItems: "center",
    marginBottom: 28,
    gap: 12,
  },
  heroPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  ratingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  pointsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(13,24,17,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    gap: 5,
  },
  pointsPillValue: {
    color: "#FFFFFF",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
  },
  heroPillText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "rgba(255,255,255,0.9)",
  },
  statRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statPill: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
  },
  statUnit: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "rgba(255,255,255,0.55)",
  },

  // Sheet
  sheet: {
    backgroundColor: "#F8FAF8",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -12,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
  },

  // Walking rewards
  walkCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  walkHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  walkIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(46,168,110,0.11)",
  },
  walkHeaderCopy: { flex: 1, minWidth: 0 },
  walkTitle: { fontSize: 14, fontFamily: "Nunito_700Bold", color: "#183222" },
  walkRating: { marginTop: 1, fontSize: 11, fontFamily: "Nunito_600SemiBold", color: "#2EA86E" },
  walkPointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(46,168,110,0.1)",
  },
  walkPointsText: { fontSize: 11, fontFamily: "Nunito_700Bold", color: "#2EA86E" },
  walkStepRow: { flexDirection: "row", alignItems: "baseline" },
  walkSteps: { fontSize: 28, fontFamily: "Nunito_800ExtraBold", color: "#183222" },
  walkTarget: { fontSize: 12, fontFamily: "Nunito_600SemiBold", color: "#8BA898" },
  walkProgressTrack: { height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: "#E5EDE8" },
  walkProgressFill: { height: "100%", borderRadius: 3, backgroundColor: "#2EA86E" },
  walkDetail: { fontSize: 11, fontFamily: "Nunito_600SemiBold", color: "#6A8372" },
  stepSeries: { height: 42, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 2 },
  stepSeriesItem: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 3 },
  stepSeriesBar: { width: 12, borderRadius: 6, backgroundColor: "#A7E5C2" },
  stepSeriesLabel: { fontSize: 9, fontFamily: "Nunito_600SemiBold", color: "#8BA898" },
  walkNotice: { fontSize: 11, lineHeight: 16, fontFamily: "Nunito_400Regular", color: "#7A9082" },
  walkCta: {
    height: 38,
    borderRadius: 12,
    backgroundColor: "#2EA86E",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  walkCtaMuted: { backgroundColor: "#6C8374" },
  walkCtaText: { fontSize: 12, fontFamily: "Nunito_700Bold", color: "#FFFFFF" },

  // Sections
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#8BA898",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#2EA86E",
  },

  // Action card
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  actionImpactBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(46,168,110,0.1)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actionImpactText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#2EA86E",
  },
  actionBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(46,168,110,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#0D1811",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
    lineHeight: 17,
  },
  actionCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2EA86E",
    borderRadius: 14,
    height: 44,
    gap: 8,
  },
  actionCTAText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },

  // Stat tiles
  tileRow: {
    flexDirection: "row",
    gap: 10,
  },
  tile: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    gap: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tileLabel: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "#8BA898",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tileValue: {
    fontSize: 22,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  tileHint: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#8BA898",
  },

  // Trend chart wrapper
  trendCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  // Closet
  closetCard: {
    width: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  closetName: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#0D1811",
  },
  closetChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(46,168,110,0.1)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  closetChipText: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "#2EA86E",
  },

  // Activity
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  activityRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8F0EA",
  },
  activityTitle: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: "#0D1811",
  },
  activitySubtitle: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#8BA898",
    marginTop: 1,
  },
  activityPoints: {
    fontSize: 14,
    fontFamily: "Nunito_800ExtraBold",
    marginLeft: 12,
  },

});
