import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowRight,
  Award,
  Bike,
  Camera,
  CheckCircle2,
  ChevronRight,
  Coins,
  Flame,
  Footprints,
  Leaf,
  Navigation,
  Play,
  Receipt,
  Recycle,
  Square,
  Target,
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
  useMe,
  useRecommendations,
  useScore,
  useSteps,
  useCommuteSummary,
  useLeague,
} from "@/src/hooks/queries";
import { useStepTracking } from "@/src/hooks/use-step-tracking";
import { useCommuteTracking } from "@/src/hooks/use-commute-tracking";
import { useAuthStore } from "@/src/store/auth";
import { DEMO_REPAIR_ACTION_ID } from "@/src/types/api";
import { formatLeagueNumber, leagueBadgeSource } from "@/src/lib/league";
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

/** Punchy ring palette that still sits cleanly on the forest-green hero. */
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
      color: "#FFC857",
      glowColor: "#FFE29A",
      trackColor: "rgba(255,255,255,0.28)",
      label: "Needs Attention",
      message: "High Carbon Intensity",
      gradient: ["#0B3D2E", "#126B4A"],
    };
  } else if (pct < 0.70) {
    return {
      color: "#C6FF4D",
      glowColor: "#E7FF9A",
      trackColor: "rgba(255,255,255,0.28)",
      label: "Making Progress",
      message: "On The Right Path",
      gradient: ["#0B3D2E", "#126B4A"],
    };
  } else {
    return {
      color: "#5EFFC0",
      glowColor: "#B5FFE0",
      trackColor: "rgba(255,255,255,0.3)",
      label: "Carbon Champion",
      message: "Great Sustainable Pace",
      gradient: ["#0B3D2E", "#1A8F5C"],
    };
  }
}

function ScoreRing({
  score,
  color,
  glowColor = "#5EFFC0",
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
  // Outer box is sized so glow/bead never get clipped.
  const size = 256;
  const strokeMax = 12;
  const stroke = 2.6;
  const r = (size - strokeMax) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  const disc = size - 16;

  // Match historical ring fill (f68d78f): animate to score/850 so mid-range
  // scores like 480 still show a visible progressing arc (KCS band mapping
  // bottoms out at 0 and looked like a broken ring).
  const targetProgress =
    score === null
      ? 0
      : Math.min(1, Math.max(0.04, score > 100 ? score / 850 : score / 100));

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withTiming(targetProgress, {
        duration: 1400,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [targetProgress, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - progress.get()),
  }));

  const beadStyle = useAnimatedStyle(() => {
    "worklet";
    const p = progress.get();
    const angle = (-90 + p * 360) * (Math.PI / 180);
    const bx = cx + r * Math.cos(angle);
    const by = cy + r * Math.sin(angle);
    return {
      transform: [
        { translateX: bx - 9 },
        { translateY: by - 9 },
      ],
      opacity: p > 0.01 ? 1 : 0,
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Fill disc only — keeps borderRadius from clipping the SVG stroke */}
      <View
        style={{
          pointerEvents: "none",
          position: "absolute",
          width: disc,
          height: disc,
          borderRadius: disc / 2,
          backgroundColor: "rgba(6, 32, 24, 0.5)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.22)",
        }}
      />

      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={trackColor}
          strokeWidth={10}
          fill="none"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={1.4}
          fill="none"
        />

        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={r}
          stroke={glowColor}
          strokeWidth={12}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={0.45}
        />

        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={7}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={1}
        />

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
          opacity={1}
        />
      </Svg>

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
        <View
          style={{
            position: "absolute",
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: glowColor,
            opacity: 0.65,
          }}
        />
        <View
          style={{
            position: "absolute",
            width: 11,
            height: 11,
            borderRadius: 5.5,
            backgroundColor: "#FFFFFF",
            opacity: 0.95,
          }}
        />
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: "#FFFFFF",
            boxShadow: `0px 0px 6px ${color}`,
            elevation: 4,
          }}
        />
      </Animated.View>

      <View
        style={{
          width: disc - 24,
          maxWidth: disc - 24,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 10,
        }}
      >
        <View style={{ marginBottom: 3 }}>
          <Leaf size={22} color="#A7F3D0" strokeWidth={2.4} />
        </View>

        <Text
          numberOfLines={1}
          style={{
            fontSize: 11.5,
            fontFamily: "Nunito_800ExtraBold",
            color: "rgba(232, 255, 244, 0.9)",
            textAlign: "center",
            letterSpacing: 1.2,
            textTransform: "uppercase",
            maxWidth: 190,
          }}
        >
          {insight}
        </Text>

        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{
            fontSize: 66,
            fontFamily: "Nunito_800ExtraBold",
            color: "#FFFFFF",
            lineHeight: 70,
            marginTop: 1,
            marginBottom: 3,
            maxWidth: 210,
            letterSpacing: -0.5,
            ...Platform.select({
              ios: {
                textShadowColor: "rgba(0,0,0,0.25)",
                textShadowOffset: { width: 0, height: 3 },
                textShadowRadius: 8,
              },
              default: {},
            }),
          }}
        >
          {score === null ? "—" : Math.round(score)}
        </Text>

        {/* Status Pill */}
        <View
          style={{
            backgroundColor: "rgba(10, 36, 23, 0.72)",
            borderColor: "rgba(255, 255, 255, 0.25)",
            borderWidth: 1,
            paddingHorizontal: 14,
            paddingVertical: 4.5,
            borderRadius: 14,
            marginTop: 2,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Nunito_700Bold",
              color: "#E8FFF4",
              letterSpacing: 0.3,
            }}
          >
            {label.split("·")[0].trim() || "Making Progress"}
          </Text>
        </View>

        {/* Provisional Estimate */}
        <Text
          style={{
            fontSize: 10.5,
            fontFamily: "Nunito_600SemiBold",
            color: "rgba(232, 255, 244, 0.75)",
            marginTop: 5,
          }}
        >
          Provisional estimate ⓘ
        </Text>
      </View>
    </View>
  );
}

function ToolCard({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.toolCard, pressed && { opacity: 0.88 }]}
      onPress={onPress}
    >
      <View style={styles.toolIconBox}>{icon}</View>
      <Text style={styles.toolLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
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
  const commuteSummary = useCommuteSummary();
  const league = useLeague();
  const commuteTracking = useCommuteTracking();
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
  const hasNativeStepData = !!stepData;
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
        ? "Motion permission is off. Enable it in Settings to earn Karma Coins."
        : stepTracking.state === "unavailable"
          ? "This phone does not expose a pedometer to Carbon Loop."
          : stepTracking.state === "error"
            ? "Could not sync steps. Your saved rewards have not changed."
            : stepTracking.state === "enabled" && Platform.OS === "android"
              ? "Android tracks steps while Carbon Loop is open."
              : stepTracking.state === "enabled"
                ? "Today's phone steps are synced to your rewards."
                : "Enable on your phone to start earning Karma Coins for walking.";
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
        <View
          style={[
            styles.hero,
            { paddingTop: Math.max(insets.top + 20, 68) },
          ]}
        >
          {/* User-uploaded botanical background */}
          <Image
            source={require("@/assets/home-hero-bg.jpg")}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />

          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Image
                source={require("@/assets/karma-text.png")}
                style={{ width: 88, height: 24 }}
                resizeMode="contain"
                tintColor="#FFFFFF"
              />
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={styles.heroGreeting}
              >
                {greeting()},{" "}
                <Text style={{ color: "#A7F3D0" }}>{firstName}</Text>
              </Text>
              <Text style={styles.heroSubcopy}>
                On the right path.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarInitial}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Score ring */}
          <View style={styles.ringContainer}>
            <ScoreRing
              score={displayScore}
              color={rating.color}
              glowColor={rating.glowColor}
              trackColor={rating.trackColor}
              insight="CARBON CREDIT SCORE"
              label={`${rating.label} · ${scoreState}`}
            />
          </View>

          {/* 2 Side-by-Side Stat Cards */}
          <View style={styles.twoCardsRow}>
            {/* Left Card: Trend */}
            <View style={styles.sideCard}>
              <View style={styles.sideCardLeft}>
                <View style={styles.sideCardIconBox}>
                  <TrendingUp size={18} color="#1E5E3A" strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={styles.sideCardValue}>
                    +{displayTrend > 0 ? displayTrend : 14}
                  </Text>
                  <Text style={styles.sideCardLabel}>this month</Text>
                </View>
              </View>
              {/* Mini bar graph */}
              <View style={styles.miniBarGraph}>
                {[9, 15, 12, 19, 16].map((barH, i) => (
                  <View
                    key={i}
                    style={[
                      styles.miniBar,
                      {
                        height: barH,
                        backgroundColor: i === 3 ? "#184A2C" : "#86EFAC",
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Right Card: Coins */}
            <TouchableOpacity
              style={styles.sideCard}
              onPress={() => router.push("/rewards")}
              activeOpacity={0.82}
            >
              <View style={styles.sideCardLeft}>
                <View style={styles.sideCardIconBox}>
                  <Coins size={18} color="#1E5E3A" strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={styles.sideCardValue}>{impactPoints || 850}</Text>
                  <Text style={styles.sideCardLabel}>Karma Coins</Text>
                </View>
              </View>
              <View style={styles.sideCardChevron}>
                <ChevronRight size={16} color="#557060" strokeWidth={2.4} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Horizontal 3-Stat Card */}
          <View style={styles.threeStatCard}>
            {/* Footprint */}
            <View style={styles.threeStatItem}>
              <View style={styles.threeStatIconBox}>
                <Footprints size={17} color="#1E5E3A" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.threeStatLabel}>FOOTPRINT</Text>
                <Text style={styles.threeStatValue} numberOfLines={1}>
                  {footprint}{" "}
                  <Text style={styles.threeStatUnit}>kg CO₂e</Text>
                </Text>
              </View>
            </View>

            <View style={styles.threeStatDivider} />

            {/* Target */}
            <View style={styles.threeStatItem}>
              <View style={styles.threeStatIconBox}>
                <Target size={17} color="#1E5E3A" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.threeStatLabel}>TARGET</Text>
                <Text style={styles.threeStatValue} numberOfLines={1}>
                  {targetFootprint}{" "}
                  <Text style={styles.threeStatUnit}>kg</Text>
                </Text>
              </View>
            </View>

            <View style={styles.threeStatDivider} />

            {/* Streak */}
            <View style={styles.threeStatItem}>
              <View style={styles.threeStatIconBox}>
                <Flame size={17} color="#1E5E3A" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.threeStatLabel}>STREAK</Text>
                <Text style={styles.threeStatValue} numberOfLines={1}>
                  {me.data?.streak_days ?? user?.streak_days ?? 19}{" "}
                  <Text style={styles.threeStatUnit}>days</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Actions Matter Banner */}
          <TouchableOpacity
            style={styles.actionsBannerCard}
            onPress={() => router.push("/(tabs)/offers")}
            activeOpacity={0.88}
          >
            <View style={styles.actionsBannerIconBox}>
              <Leaf size={18} color="#1E5E3A" strokeWidth={2.2} />
            </View>
            <View style={styles.actionsBannerCopy}>
              <Text style={styles.actionsBannerTitle}>Your actions matter</Text>
              <Text style={styles.actionsBannerSubtitle}>
                Keep going to unlock new rewards and a cleaner tomorrow.
              </Text>
            </View>
            <View style={styles.actionsBannerBtn}>
              <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.4} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── CONTENT SHEET ─────────────────────────────── */}
        <View style={styles.sheet}>
          {/* ── LEAGUE SNAPSHOT ── */}
          <TouchableOpacity style={styles.leagueMiniCard} onPress={() => router.push("/league")} activeOpacity={0.86}>
            <View style={styles.leagueMiniBadge}>
              {league.data ? (
                <Image source={leagueBadgeSource(league.data.tier)} style={styles.leagueMiniBadgeImage} resizeMode="contain" />
              ) : (
                <Text style={styles.leagueMiniBadgePlaceholder}>
                  {league.isLoading ? "…" : "—"}
                </Text>
              )}
            </View>
            <View style={styles.leagueMiniCopy}>
              <Text style={styles.leagueMiniEyebrow}>KARMA LEAGUE</Text>
              {league.data ? (
                <>
                  <Text style={styles.leagueMiniTitle} numberOfLines={1}>{league.data.league_name} · {formatLeagueNumber(league.data.league_points)} pts</Text>
                  <Text style={styles.leagueMiniHint} numberOfLines={1}>{league.data.promotion_threshold == null ? "Top league" : `${formatLeagueNumber(Math.max(0, Number(league.data.promotion_threshold) - Number(league.data.league_points)))} points to next tier`} · {formatLeagueNumber(league.data.weekly_actions_completed)} verified actions this week</Text>
                </>
              ) : (
                <>
                  <Text style={styles.leagueMiniTitle}>{league.isLoading ? "Checking your league…" : "League unavailable"}</Text>
                  <Text style={styles.leagueMiniHint}>{league.isLoading ? "Your current badge will appear shortly" : "Tap to try again"}</Text>
                </>
              )}
            </View>
            <ChevronRight size={18} color="#2EA86E" />
          </TouchableOpacity>

          {/* ── WALK & EARN ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Walk & Earn</Text>
            <View style={styles.walkCard}>
              <View style={styles.walkHeader}>
                <View style={styles.walkIconBox}>
                  <Footprints size={20} color="#2EA86E" strokeWidth={2} />
                </View>
                <View style={styles.walkHeaderCopy}>
                  <Text style={styles.walkTitle} numberOfLines={2}>
                    Turn steps into Impact Points
                  </Text>
                  <Text style={styles.walkRating} numberOfLines={1}>
                    {hasNativeStepData ? stepData.rating : "Phone-only metric"}
                  </Text>
                </View>
                {hasNativeStepData ? (
                  <View style={styles.walkPointsBadge}>
                    <Text style={styles.walkPointsText}>
                      +{stepData.todayPoints} pts
                    </Text>
                  </View>
                ) : null}
              </View>

              {hasNativeStepData ? (
                <>
                  <View style={styles.walkStepRow}>
                    <Text style={styles.walkSteps}>
                      {stepData.todaySteps.toLocaleString()}
                    </Text>
                    <Text style={styles.walkTarget}>
                      {" "}
                      / {stepData.targetSteps.toLocaleString()} steps
                    </Text>
                  </View>
                  <View style={styles.walkProgressTrack}>
                    <View
                      style={[
                        styles.walkProgressFill,
                        { width: `${stepProgress}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.walkDetail} numberOfLines={2}>
                    {stepData.nextThreshold === null
                      ? "Daily walking reward unlocked."
                      : `${Math.max(0, stepData.nextThreshold - stepData.todaySteps).toLocaleString()} steps to your next reward`}
                  </Text>
                  {stepData.series.length > 0 ? (
                    <View style={styles.stepSeries}>
                      {stepData.series.slice(-7).map((point) => (
                        <View
                          key={`${point.date}-${point.label}`}
                          style={styles.stepSeriesItem}
                        >
                          <View
                            style={[
                              styles.stepSeriesBar,
                              {
                                height:
                                  6 +
                                  Math.round(
                                    (point.steps / maxSeriesSteps) * 24
                                  ),
                              },
                            ]}
                          />
                          <Text style={styles.stepSeriesLabel}>
                            {point.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}

              <Text style={styles.walkNotice} numberOfLines={3}>
                {stepNotice}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.walkCta,
                  (isWeb || stepTracking.isSyncing) && styles.walkCtaMuted,
                  pressed && { opacity: 0.9 },
                ]}
                onPress={stepTracking.enableOrSync}
                disabled={stepTracking.isSyncing}
              >
                <Text style={styles.walkCtaText} numberOfLines={1}>
                  {stepCta}
                </Text>
                {!isWeb ? (
                  <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.5} />
                ) : null}
              </Pressable>
            </View>
          </View>

          {/* ── GREEN COMMUTE (GPS TRACKING) ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Green Commute (GPS)</Text>
            <View style={styles.commuteCard}>
              <View style={styles.commuteHeader}>
                <View style={styles.commuteIconBox}>
                  {commuteTracking.isTracking ? (
                    <Bike size={20} color="#2EA86E" strokeWidth={2} />
                  ) : (
                    <Navigation size={20} color="#2EA86E" strokeWidth={2} />
                  )}
                </View>
                <View style={styles.commuteHeaderCopy}>
                  <Text style={styles.commuteTitle}>
                    {commuteTracking.isTracking
                      ? "Recording Commute..."
                      : "Walk or Cycle to Earn"}
                  </Text>
                  <Text style={styles.commuteSubtitle}>
                    {commuteTracking.isTracking
                      ? `${commuteTracking.currentSpeedKmh.toFixed(1)} km/h • Auto-detecting mode`
                      : "No motor vehicle • GPS verified speed"}
                  </Text>
                </View>
                <View style={styles.commutePointsBadge}>
                  <Text style={styles.commutePointsText}>
                    +{commuteSummary.data?.todayPoints ?? 0} coins today
                  </Text>
                </View>
              </View>

              {/* Trip Result Banner */}
              {commuteTracking.lastResult ? (
                <View style={styles.tripResultBanner}>
                  <View style={styles.tripResultHeader}>
                    <CheckCircle2 size={16} color="#2EA86E" />
                    <Text style={styles.tripResultTitle}>
                      {commuteTracking.lastResult.mode === "walk"
                        ? "🚶 Walk Logged"
                        : commuteTracking.lastResult.mode === "cycle"
                        ? "🚴 Cycle Logged"
                        : "🚗 Motor Transit"}
                    </Text>
                  </View>
                  <Text style={styles.tripResultDesc}>
                    {commuteTracking.lastResult.message}
                  </Text>
                  <TouchableOpacity
                    onPress={commuteTracking.dismissResult}
                    style={styles.tripResultDismiss}
                  >
                    <Text style={styles.tripResultDismissText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Active Trip Telemetry */}
              {commuteTracking.isTracking ? (
                <View style={styles.liveTelemetryBox}>
                  <View style={styles.telemetryItem}>
                    <Text style={styles.telemetryValue}>
                      {commuteTracking.distanceKm.toFixed(2)}
                    </Text>
                    <Text style={styles.telemetryLabel}>km traveled</Text>
                  </View>
                  <View style={styles.telemetryDivider} />
                  <View style={styles.telemetryItem}>
                    <Text style={styles.telemetryValue}>
                      {Math.floor(commuteTracking.elapsedSec / 60)}:
                      {(commuteTracking.elapsedSec % 60).toString().padStart(2, "0")}
                    </Text>
                    <Text style={styles.telemetryLabel}>duration</Text>
                  </View>
                  <View style={styles.telemetryDivider} />
                  <View style={styles.telemetryItem}>
                    <Text style={styles.telemetryValue}>
                      {commuteTracking.currentSpeedKmh.toFixed(1)}
                    </Text>
                    <Text style={styles.telemetryLabel}>km/h speed</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.commuteStatsBox}>
                  <View style={styles.commuteStatsTop}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.commuteDistanceText}>
                        {(commuteSummary.data?.todayDistanceKm ?? 0).toFixed(2)} km
                      </Text>
                      <Text style={styles.commuteDistanceLabel} numberOfLines={1}>
                        Clean distance today ({commuteSummary.data?.tripsToday ?? 0} trips)
                      </Text>
                    </View>
                  </View>
                  <View style={styles.commuteTiersRow}>
                    <View style={styles.commuteTierChip}>
                      <Text style={styles.commuteTierText}>🚶 Walk: 10 coins/km</Text>
                    </View>
                    <View style={styles.commuteTierChip}>
                      <Text style={styles.commuteTierText}>🚴 Cycle: 5 coins/km</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Action Button */}
              {commuteTracking.isTracking ? (
                <TouchableOpacity
                  style={[styles.commuteCta, styles.commuteCtaStop]}
                  onPress={commuteTracking.stopTracking}
                  activeOpacity={0.85}
                >
                  <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.commuteCtaText}>End Trip & Claim Karma Coins</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.commuteCta,
                    (isWeb || commuteTracking.isSyncing) && styles.walkCtaMuted,
                  ]}
                  onPress={commuteTracking.startTracking}
                  disabled={isWeb || commuteTracking.isSyncing}
                  activeOpacity={0.85}
                >
                  <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.commuteCtaText}>
                    {commuteTracking.isSyncing
                      ? "Saving Trip..."
                      : isWeb
                      ? "Phone GPS Required"
                      : "Start Commute Tracking"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── NEXT BEST ACTION ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your Next Best Action</Text>
            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && { opacity: 0.92 },
              ]}
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
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.actionTitle} numberOfLines={2}>
                    {best?.title || "Repair your old headphones"}
                  </Text>
                  <Text style={styles.actionSubtitle} numberOfLines={2}>
                    {best?.subtitle ||
                      "Keep durable audio hardware out of landfills"}
                  </Text>
                </View>
              </View>
              <View style={styles.actionCTA}>
                <Text style={styles.actionCTAText} numberOfLines={1}>
                  Find a repair partner
                </Text>
                <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </Pressable>
          </View>

          {/* ── STAT TILES ── */}
          <View style={styles.tileRow}>
            <View style={[styles.tile, styles.tilePrimary]}>
              <Text style={styles.tileLabelOnPrimary}>Karma Coins</Text>
              <Text style={styles.tileValueOnPrimary}>{impactPoints}</Text>
              <Text style={styles.tileHintOnPrimary}>available to redeem</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Residual</Text>
              <Text style={styles.tileValue}>
                ~{Math.round(impact.data?.residual_kg ?? 58)}
              </Text>
              <Text style={styles.tileHint}>kg left</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.tile,
                pressed && { opacity: 0.88 },
              ]}
              onPress={() => router.push("/rewards")}
            >
              <Text style={styles.tileLabel}>Rewards</Text>
              <Text style={[styles.tileValue, { color: "#E8A838" }]}>2</Text>
              <Text style={[styles.tileHint, { color: "#C48A2A" }]}>
                unlocked
              </Text>
            </Pressable>
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
                <Text style={styles.sectionLabel} numberOfLines={1}>
                  Loop Closet
                </Text>
                <Pressable
                  onPress={() => router.push("/(tabs)/actions")}
                  style={styles.seeAllBtn}
                  hitSlop={8}
                >
                  <Text style={styles.seeAllText}>See all</Text>
                  <ChevronRight size={13} color="#2EA86E" />
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingRight: 4 }}
              >
                {(closet.data ?? []).map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/product/${item.id}`)}
                    style={({ pressed }) => [
                      styles.closetCard,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <View style={styles.closetImageWrap}>
                      <ProductImage
                        uri={item.image_url}
                        size="full"
                        radius={12}
                      />
                    </View>
                    <Text style={styles.closetName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.closetChip}>
                      <Text style={styles.closetChipText} numberOfLines={1}>
                        {item.next_action_label || item.category}
                      </Text>
                    </View>
                  </Pressable>
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
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {ev.title}
                      </Text>
                      {ev.subtitle ? (
                        <Text style={styles.activitySubtitle} numberOfLines={1}>
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
                label="Import receipt"
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
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    overflow: "hidden",
    position: "relative",
  },
  ringContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: 10,
    width: "100%",
  },
  ringSideLeft: {
    position: "absolute",
    left: 4,
    top: 72,
    zIndex: 10,
  },
  ringSideLeftText: {
    fontSize: 9.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 1.4,
    lineHeight: 14,
  },
  ringSideLine: {
    width: 16,
    height: 1.5,
    backgroundColor: "rgba(255,255,255,0.6)",
    marginTop: 5,
  },
  ringSideRight: {
    position: "absolute",
    right: 4,
    top: 26,
    width: 82,
    alignItems: "flex-end",
    zIndex: 10,
  },
  ringSideRightText: {
    fontSize: 9.5,
    fontFamily: "Nunito_700Bold",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 13,
    textAlign: "right",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    marginRight: 12,
  },
  heroGreeting: {
    fontSize: 24,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
    marginTop: 6,
    letterSpacing: -0.3,
    ...Platform.select({
      ios: {
        textShadowColor: "rgba(0, 30, 15, 0.7)",
        textShadowOffset: { width: 0, height: 1.5 },
        textShadowRadius: 5,
      },
      default: {},
    }),
  },
  heroSubcopy: {
    fontSize: 14.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
    marginTop: 3,
    ...Platform.select({
      ios: {
        textShadowColor: "rgba(0, 30, 15, 0.85)",
        textShadowOffset: { width: 0, height: 1.5 },
        textShadowRadius: 6,
      },
      default: {},
    }),
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    flexShrink: 0,
  },
  avatarInitial: {
    fontSize: 17,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
  },

  // 2 Side-by-side cards
  twoCardsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    width: "100%",
  },
  sideCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
    elevation: 2,
  },
  sideCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  sideCardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5EC",
    alignItems: "center",
    justifyContent: "center",
  },
  sideCardValue: {
    fontSize: 19,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0E2918",
    lineHeight: 22,
  },
  sideCardLabel: {
    fontSize: 11.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#526F5E",
    marginTop: 0.5,
  },
  miniBarGraph: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2.5,
    height: 20,
    paddingLeft: 4,
  },
  miniBar: {
    width: 3.5,
    borderRadius: 2,
  },
  sideCardChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },

  // 3 Stat Card
  threeStatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    boxShadow: "0px 2px 10px rgba(0,0,0,0.04)",
    elevation: 2,
    width: "100%",
  },
  threeStatItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 3,
  },
  threeStatIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8F5EC",
    alignItems: "center",
    justifyContent: "center",
  },
  threeStatLabel: {
    fontSize: 8.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#526F5E",
    letterSpacing: 0.8,
  },
  threeStatValue: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0E2918",
    marginTop: 1,
  },
  threeStatUnit: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "#5C7869",
  },
  threeStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(0,0,0,0.07)",
  },

  // Actions Banner Card
  actionsBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 13,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    boxShadow: "0px 2px 10px rgba(0,0,0,0.04)",
    elevation: 2,
    gap: 10,
    width: "100%",
    zIndex: 2,
  },
  actionsBannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8F5EC",
    alignItems: "center",
    justifyContent: "center",
  },
  actionsBannerCopy: {
    flex: 1,
    minWidth: 0,
  },
  actionsBannerTitle: {
    fontSize: 14,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0E2918",
  },
  actionsBannerSubtitle: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#466253",
    marginTop: 1,
    lineHeight: 15,
  },
  actionsBannerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#184A2C",
    alignItems: "center",
    justifyContent: "center",
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    marginBottom: 2,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(24,74,44,0.25)",
  },
  paginationDotActive: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#184A2C",
  },

  // Sheet
  sheet: {
    backgroundColor: "#F4FAF6",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -12,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 22,
  },
  leagueMiniCard: {
    backgroundColor: "#FFF9EC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0D898",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  leagueMiniBadge: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFF0C9", alignItems: "center", justifyContent: "center" },
  leagueMiniBadgeImage: { width: 34, height: 34 },
  leagueMiniBadgePlaceholder: { color: "#9AA89F", fontSize: 18, fontWeight: "800" },
  leagueMiniCopy: { flex: 1, gap: 2 },
  leagueMiniEyebrow: { color: "#A46C13", fontSize: 9, fontFamily: "Nunito_800ExtraBold", letterSpacing: 1.1 },
  leagueMiniTitle: { color: "#183222", fontSize: 14, fontFamily: "Nunito_800ExtraBold", flexShrink: 1 },
  leagueMiniHint: { color: "#8F774C", fontSize: 10, fontFamily: "Nunito_600SemiBold", flexShrink: 1 },

  // Walking rewards
  walkCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.16)",
  },
  walkHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  walkIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(46,168,110,0.12)",
  },
  walkHeaderCopy: { flex: 1, minWidth: 0 },
  walkTitle: { fontSize: 15, fontFamily: "Nunito_700Bold", color: "#183222" },
  walkRating: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#2EA86E",
  },
  walkPointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(46,168,110,0.12)",
  },
  walkPointsText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#1B7A4E",
  },
  walkStepRow: { flexDirection: "row", alignItems: "baseline" },
  walkSteps: {
    fontSize: 28,
    fontFamily: "Nunito_800ExtraBold",
    color: "#183222",
  },
  walkTarget: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#6B8576",
  },
  walkProgressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#E5EDE8",
  },
  walkProgressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#2EA86E",
  },
  walkDetail: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#6B8576",
  },
  stepSeries: {
    height: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 2,
  },
  stepSeriesItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
  },
  stepSeriesBar: { width: 12, borderRadius: 6, backgroundColor: "#A7E5C2" },
  stepSeriesLabel: {
    fontSize: 9,
    fontFamily: "Nunito_600SemiBold",
    color: "#6B8576",
  },
  walkNotice: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Nunito_400Regular",
    color: "#6B8576",
  },
  walkCta: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#2EA86E",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  walkCtaMuted: { backgroundColor: "#6C8374" },
  walkCtaText: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },

  // Commute Card
  commuteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
    boxShadow: "0px 2px 10px rgba(0,0,0,0.05)",
    elevation: 2,
  },
  commuteHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  commuteIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(46,168,110,0.11)",
  },
  commuteHeaderCopy: { flex: 1, minWidth: 0 },
  commuteTitle: { fontSize: 14, fontFamily: "Nunito_700Bold", color: "#183222" },
  commuteSubtitle: { marginTop: 1, fontSize: 11, fontFamily: "Nunito_600SemiBold", color: "#2EA86E" },
  commutePointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(46,168,110,0.1)",
  },
  commutePointsText: { fontSize: 11, fontFamily: "Nunito_700Bold", color: "#2EA86E" },
  commuteStatsBox: {
    backgroundColor: "#F4FAF6",
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  commuteStatsTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  commuteDistanceText: { fontSize: 20, fontFamily: "Nunito_800ExtraBold", color: "#183222" },
  commuteDistanceLabel: { fontSize: 11, fontFamily: "Nunito_600SemiBold", color: "#7A9082", marginTop: 2 },
  commuteTiersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  commuteTierChip: {
    backgroundColor: "rgba(46,168,110,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  commuteTierText: { fontSize: 10, fontFamily: "Nunito_700Bold", color: "#2EA86E" },
  liveTelemetryBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#EBF7F0",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#A7E5C2",
  },
  telemetryItem: { alignItems: "center" },
  telemetryValue: { fontSize: 20, fontFamily: "Nunito_800ExtraBold", color: "#183222" },
  telemetryLabel: { fontSize: 10, fontFamily: "Nunito_600SemiBold", color: "#6A8372", marginTop: 2 },
  telemetryDivider: { width: 1, height: 28, backgroundColor: "#C3EBD4" },
  commuteCta: {
    height: 40,
    borderRadius: 12,
    backgroundColor: "#2EA86E",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  commuteCtaStop: {
    backgroundColor: "#E04F4F",
  },
  commuteCtaText: { fontSize: 13, fontFamily: "Nunito_700Bold", color: "#FFFFFF" },
  tripResultBanner: {
    backgroundColor: "#EBF7F0",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#A7E5C2",
    gap: 6,
  },
  tripResultHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  tripResultTitle: { fontSize: 13, fontFamily: "Nunito_700Bold", color: "#183222" },
  tripResultDesc: { fontSize: 12, fontFamily: "Nunito_400Regular", color: "#45614F", lineHeight: 16 },
  tripResultDismiss: { alignSelf: "flex-end", paddingVertical: 2, paddingHorizontal: 6 },
  tripResultDismissText: { fontSize: 11, fontFamily: "Nunito_700Bold", color: "#2EA86E" },

  // Sections
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "IBMPlexMono_500Medium",
    color: "#2EA86E",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  seeAllText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#2EA86E",
  },

  // Action card
  actionCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    padding: 16,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.16)",
  },
  actionImpactBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(46,168,110,0.12)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actionImpactText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#1B7A4E",
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
    backgroundColor: "rgba(46,168,110,0.12)",
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
    color: "#6B8576",
    lineHeight: 17,
  },
  actionCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2EA86E",
    borderRadius: 14,
    minHeight: 46,
    paddingHorizontal: 14,
    gap: 8,
  },
  actionCTAText: {
    flexShrink: 1,
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
    flex: 1,
    minWidth: 0,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.14)",
  },
  tilePrimary: {
    backgroundColor: "#2EA86E",
    borderColor: "transparent",
  },
  tileLabel: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "#6B8576",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tileLabelOnPrimary: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "rgba(255,255,255,0.85)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tileValue: {
    fontSize: 22,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
  },
  tileValueOnPrimary: {
    fontSize: 22,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#FFFFFF",
  },
  tileHint: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#6B8576",
  },
  tileHintOnPrimary: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "rgba(255,255,255,0.8)",
  },

  // Trend chart wrapper
  trendCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.14)",
  },

  // Closet
  closetCard: {
    width: 164,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 18,
    padding: 12,
    gap: 8,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.14)",
  },
  closetImageWrap: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
  },
  closetName: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#0D1811",
  },
  closetChip: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    backgroundColor: "rgba(46,168,110,0.12)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  closetChipText: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "#1B7A4E",
  },

  // Activity
  activityCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.14)",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  activityRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(46,168,110,0.12)",
  },
  activityTitle: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#0D1811",
  },
  activitySubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#6B8576",
  },
  activityPoints: {
    fontSize: 13,
    fontFamily: "IBMPlexMono_600SemiBold",
    flexShrink: 0,
  },

  // Loop tools
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  toolCard: {
    width: "48%",
    flexGrow: 1,
    minWidth: "46%",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.14)",
  },
  toolIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(46,168,110,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  toolLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
});
