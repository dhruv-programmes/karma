import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  ArrowRight,
  Award,
  Camera,
  Car,
  ChevronRight,
  Coins,
  Flame,
  Footprints,
  Leaf,
  Receipt,
  Recycle,
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
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Text } from "@/components/ui/text";
import {
  useActivity,
  useImpact,
  useImpactTimeseries,
  useMe,
  useRecommendations,
  useScore,
  useSteps,
  useLeague,
} from "@/src/hooks/queries";
import { useStepTracking } from "@/src/hooks/use-step-tracking";
import { useAuthStore } from "@/src/store/auth";
import { DEMO_REPAIR_ACTION_ID, LeagueTier } from "@/src/types/api";
import { formatLeagueNumber, leagueBadgeSource } from "@/src/lib/league";
import { useTabBarClearance } from "@/src/theme/layout";
import { FootprintTrend } from "@/components/custom/footprint-trend";
import { LeagueTransitionCelebration } from "@/components/custom/league-transition-celebration";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const KCS_MIN = 480;
const KCS_MAX = 820;

const NEXT_TIERS: Record<LeagueTier, { tier: LeagueTier; name: string } | null> = {
  bronze: { tier: "silver", name: "Silver League" },
  silver: { tier: "gold", name: "Gold League" },
  gold: { tier: "platinum", name: "Platinum League" },
  platinum: null,
};

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
  size = 256,
}: {
  score: number | null;
  color: string;
  glowColor?: string;
  trackColor: string;
  insight: string;
  label: string;
  size?: number;
}) {
  // Outer box is sized so glow/bead never get clipped.
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
            textAlign: "center",
            alignSelf: "center",
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
  const { width: viewportWidth } = useWindowDimensions();
  const isCompactPhone = viewportWidth < 360;

  const user = useAuthStore((s) => s.user);
  const startingFootprintKg = useAuthStore((s) => s.startingFootprintKg);
  const goal = useAuthStore((s) => s.goal);

  const me = useMe();
  const score = useScore();
  const impact = useImpact();
  const series = useImpactTimeseries();
  const recs = useRecommendations();
  const activity = useActivity();
  const steps = useSteps();
  const stepTracking = useStepTracking(steps.data?.todaySteps ?? 0);
  const league = useLeague();
  const best = recs.data?.[0];

  const leagueData = league.data;
  const leaguePoints = Number(leagueData?.league_points ?? 0);
  const leagueThreshold =
    leagueData?.promotion_threshold != null
      ? Number(leagueData.promotion_threshold)
      : null;
  const leaguePointsToNext =
    leagueThreshold != null ? Math.max(0, leagueThreshold - leaguePoints) : 0;
  const leagueProgressPct =
    leagueThreshold != null && leagueThreshold > 0
      ? Math.min(100, Math.max(4, Math.round((leaguePoints / leagueThreshold) * 100)))
      : 100;
  const nextTierInfo = leagueData ? NEXT_TIERS[leagueData.tier] : null;

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
  const displayTodaySteps = stepData?.todaySteps ?? 0;
  const displayTargetSteps = stepData?.targetSteps ?? 10000;
  const stepProgress = Math.min(
    100,
    Math.max(0, Math.round((displayTodaySteps / displayTargetSteps) * 100))
  );
  const stepAngleRad = (-90 + (stepProgress / 100) * 360) * (Math.PI / 180);
  const stepDotX = 75 + 62 * Math.cos(stepAngleRad);
  const stepDotY = 75 + 62 * Math.sin(stepAngleRad);
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
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
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
              size={isCompactPhone ? Math.min(232, viewportWidth - 48) : 256}
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
              <BlurView intensity={Platform.OS === "ios" ? 50 : 85} tint="light" style={StyleSheet.absoluteFill} />
              <LinearGradient
                colors={["rgba(255,255,255,0.68)", "rgba(255,255,255,0.32)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
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
              <BlurView intensity={Platform.OS === "ios" ? 50 : 85} tint="light" style={StyleSheet.absoluteFill} />
              <LinearGradient
                colors={["rgba(255,255,255,0.68)", "rgba(255,255,255,0.32)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
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
            <BlurView intensity={Platform.OS === "ios" ? 50 : 85} tint="light" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={["rgba(255,255,255,0.68)", "rgba(255,255,255,0.32)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Footprint */}
            <View style={[styles.threeStatItem, isCompactPhone && styles.threeStatItemCompact]}>
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
            <View style={[styles.threeStatItem, isCompactPhone && styles.threeStatItemCompact]}>
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
            <View style={[styles.threeStatItem, isCompactPhone && styles.threeStatItemCompact]}>
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
            <BlurView intensity={Platform.OS === "ios" ? 50 : 85} tint="light" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={["rgba(255,255,255,0.68)", "rgba(255,255,255,0.32)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
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
          <TouchableOpacity
            style={styles.leagueCard}
            onPress={() => router.push("/league")}
            activeOpacity={0.88}
          >
            <Image
              source={require("@/assets/home-hero-bg.jpg")}
              style={styles.leagueBgImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["#F8FCFA", "rgba(248,252,250,0.92)", "rgba(235,246,239,0.3)"]}
              start={{ x: 0.35, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View style={styles.leagueBadgeWrap}>
              {leagueData ? (
                <Image
                  source={leagueBadgeSource(leagueData.tier)}
                  style={styles.leagueBadgeImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.leagueBadgePlaceholder}>
                  {league.isLoading ? "…" : "—"}
                </Text>
              )}
            </View>

            <View style={styles.leagueCenterWrap}>
              {leagueData ? (
                <>
                  <View style={styles.leagueTitleRow}>
                    <Text style={styles.leagueTitle} numberOfLines={1}>
                      {leagueData.league_name}
                    </Text>
                    <View style={styles.leaguePointsChip}>
                      <Text style={styles.leaguePointsChipText}>
                        {formatLeagueNumber(leaguePoints)} pts
                      </Text>
                    </View>
                  </View>

                  <View style={styles.leagueProgressTrack}>
                    <View
                      style={[
                        styles.leagueProgressFill,
                        { width: `${leagueProgressPct}%` },
                      ]}
                    />
                  </View>

                  <View style={styles.leagueBottomRow}>
                    <Text style={styles.leagueBottomLeft}>
                      {formatLeagueNumber(leaguePoints)} / {leagueThreshold != null ? `${formatLeagueNumber(leagueThreshold)} pts` : "Max"}
                    </Text>
                    {nextTierInfo ? (
                      <View style={styles.leagueBottomRight}>
                        <Text style={styles.leagueBottomRightText}>
                          Next: {nextTierInfo.name}
                        </Text>
                        <Image
                          source={leagueBadgeSource(nextTierInfo.tier)}
                          style={styles.leagueNextBadgeIcon}
                          resizeMode="contain"
                        />
                      </View>
                    ) : (
                      <Text style={styles.leagueBottomRightText}>Top League ⭐</Text>
                    )}
                  </View>
                </>
              ) : (
                <Text style={styles.leagueTitle}>
                  {league.isLoading ? "Checking your league…" : "League unavailable"}
                </Text>
              )}
            </View>

            <View style={styles.leagueChevronCircle}>
              <ChevronRight size={18} color="#2A5941" strokeWidth={2.4} />
            </View>
          </TouchableOpacity>

          {/* ── WALK TO LEARN (STEP COUNTER) ── */}
          <View style={styles.walkCard}>
            <Image
              source={require("@/assets/home-hero-bg.jpg")}
              style={styles.walkBgLeaf}
              resizeMode="cover"
            />
            {/* Top Header */}
            <View style={styles.walkHeader}>
              <View style={styles.walkIconBox}>
                <Footprints size={22} color="#1E5E3A" strokeWidth={2.2} />
              </View>
              <View style={styles.walkHeaderCopy}>
                <Text style={styles.walkTitle} numberOfLines={2}>
                  Walk to Learn
                </Text>
                <Text style={styles.walkSubtitle}>
                  {stepData?.rating ? stepData.rating : "Starting"}
                </Text>
              </View>
              <View style={styles.walkPointsBadge}>
                <Text style={styles.walkPointsText}>
                  +{stepData?.todayPoints ?? 0} pts
                </Text>
              </View>
            </View>

            {/* Circular Gauge Center */}
            <View style={styles.walkGaugeRow}>
              {/* Left Column */}
              <View style={styles.stepDecoCol}>
                <Text style={styles.stepDecoText}>MOVE</Text>
                <Text style={styles.stepDecoText}>CLEANER</Text>
                <Text style={styles.stepDecoText}>LIVE</Text>
                <Text style={styles.stepDecoText}>BRIGHTER</Text>
                <View style={styles.stepDecoLine} />
              </View>

              {/* Circular Gauge */}
              <View style={styles.stepRingWrap}>
                <Svg width={150} height={150} viewBox="0 0 150 150">
                  <Circle
                    cx="75"
                    cy="75"
                    r="62"
                    stroke="#E2EFE7"
                    strokeWidth="6.5"
                    fill="none"
                  />
                  <Circle
                    cx="75"
                    cy="75"
                    r="62"
                    stroke="#4EB782"
                    strokeWidth="6.5"
                    fill="none"
                    strokeDasharray={389.5}
                    strokeDashoffset={389.5 * (1 - Math.min(1, Math.max(0, stepProgress / 100)))}
                    strokeLinecap="round"
                    transform="rotate(-90 75 75)"
                  />
                  <Circle
                    cx={stepDotX}
                    cy={stepDotY}
                    r="4.5"
                    fill="#27643E"
                  />
                </Svg>
                <View style={styles.stepRingCenter}>
                  <Footprints size={24} color="#1E5E3A" strokeWidth={2.2} />
                  <Text style={styles.stepRingSteps}>
                    {displayTodaySteps.toLocaleString()}
                  </Text>
                  <Text style={styles.stepRingTarget}>
                    / {displayTargetSteps.toLocaleString()} steps
                  </Text>
                </View>
              </View>

              {/* Right Column */}
              <View style={styles.stepDecoColRight}>
                <Text style={styles.stepDecoText}>SMALL</Text>
                <Text style={styles.stepDecoText}>STEPS</Text>
                <Text style={styles.stepDecoText}>BIGGER</Text>
                <Text style={styles.stepDecoText}>CHANGE</Text>
                <View style={styles.stepDecoLine} />
              </View>
            </View>

            {/* Progress Track & Subtext */}
            <View style={styles.walkProgressTrack}>
              <View
                style={[
                  styles.walkProgressFill,
                  { width: `${Math.max(4, Math.min(100, stepProgress))}%` },
                ]}
              />
            </View>
            <Text style={styles.walkDetail}>
              {stepData?.nextThreshold != null
                ? `${Math.max(0, stepData.nextThreshold - displayTodaySteps).toLocaleString()} steps to your next reward`
                : "2,000 steps to your next reward"}
            </Text>

            {/* Bottom Notice */}
            <View style={styles.walkNoticeRow}>
              <View style={styles.walkNoticeIconBox}>
                <Leaf size={16} color="#1E5E3A" strokeWidth={2.2} />
              </View>
              <Text style={styles.walkNoticeText}>
                Enable on your phone to start earning{"\n"}Karma Coins for walking.
              </Text>
            </View>

            {/* Action Capsule CTA */}
            <TouchableOpacity
              style={styles.greenCapsuleBtn}
              onPress={stepTracking.enableOrSync}
              disabled={stepTracking.isSyncing}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={["#275E3B", "#174428"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.greenCapsuleContent}>
                <Svg
                  width={22}
                  height={22}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M4 17 L6 12 L9 11 L11.5 14.5 L16.5 12.5 L21 17 L20 19 L4 19 Z" />
                  <Path d="M11 10.5 L9.5 13" />
                  <Path d="M14 10 L12.5 12.5" />
                  <Path d="M3.5 19 L21 19" />
                </Svg>
                <Text style={styles.greenCapsuleText}>{stepCta}</Text>
                <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.4} />
              </View>
            </TouchableOpacity>
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


          {/* ── RECENT ACTIVITY ── */}
          {(activity.data ?? []).length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Recent Activity</Text>
                <Pressable
                  onPress={() => router.push("/activity" as import("expo-router").Href)}
                  style={styles.seeAllBtn}
                  hitSlop={8}
                >
                  <Text style={styles.seeAllText}>See all</Text>
                  <ChevronRight size={13} color="#2EA86E" />
                </Pressable>
              </View>
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
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Loop Tools</Text>
              <Pressable
                onPress={() => router.push("/(tabs)/tools")}
                style={styles.seeAllBtn}
                hitSlop={8}
              >
                <Text style={styles.seeAllText}>See all</Text>
                <ChevronRight size={13} color="#2EA86E" />
              </Pressable>
            </View>
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
                icon={<Car size={20} color="#2EA86E" strokeWidth={1.8} />}
                label="Electric Vehicle"
                onPress={() =>
                  router.push("/tools/verify-sustainable-purchase" as import("expo-router").Href)
                }
              />
            </View>
          </View>
        </View>
      </ScrollView>
      <LeagueTransitionCelebration league={leagueData} />
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
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.78)",
    overflow: "hidden",
    shadowColor: "#0A2415",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sideCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minWidth: 0,
  },
  sideCardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  sideCardValue: {
    fontSize: 19,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0E2918",
    lineHeight: 22,
    flexShrink: 1,
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
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },

  // 3 Stat Card
  threeStatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginTop: 10,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.78)",
    overflow: "hidden",
    shadowColor: "#0A2415",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    width: "100%",
  },
  threeStatItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 3,
  },
  threeStatItemCompact: {
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 1,
  },
  threeStatIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
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
    height: 28,
    backgroundColor: "rgba(24, 74, 44, 0.12)",
  },

  // Actions Banner Card
  actionsBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 13,
    marginTop: 10,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.78)",
    overflow: "hidden",
    shadowColor: "#0A2415",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 10,
    width: "100%",
    zIndex: 2,
  },
  actionsBannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
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
  leagueCard: {
    backgroundColor: "#F9FCFA",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(215, 235, 222, 0.95)",
    paddingVertical: 7,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#0F281B",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 11,
  },
  leagueBgImage: {
    position: "absolute",
    right: -15,
    top: -15,
    bottom: -15,
    width: 190,
    opacity: 0.28,
  },
  leagueBadgeWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(224, 245, 230, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(200, 235, 215, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  leagueBadgeImage: {
    width: 52,
    height: 52,
  },
  leagueBadgePlaceholder: {
    color: "#9AA89F",
    fontSize: 20,
    fontFamily: "Nunito_800ExtraBold",
  },
  leagueCenterWrap: {
    flex: 1,
    minWidth: 0,
  },
  leagueTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leagueTitle: {
    color: "#0B1D12",
    fontSize: 20,
    fontFamily: "Nunito_800ExtraBold",
  },
  leaguePointsChip: {
    backgroundColor: "#E2ECE6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  leaguePointsChipText: {
    color: "#275038",
    fontSize: 11.5,
    fontFamily: "Nunito_800ExtraBold",
  },
  leagueProgressTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#D9E8DF",
    overflow: "hidden",
    width: "100%",
    marginTop: 5,
  },
  leagueProgressFill: {
    height: "100%",
    borderRadius: 2.5,
    backgroundColor: "#52B582",
    minWidth: 14,
  },
  leagueBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 3,
  },
  leagueBottomLeft: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "#5F7768",
  },
  leagueBottomRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  leagueBottomRightText: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "#5F7768",
  },
  leagueNextBadgeIcon: {
    width: 13,
    height: 13,
  },
  leagueChevronCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderWidth: 1.2,
    borderColor: "rgba(185, 218, 198, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Walking rewards
  walkCard: {
    backgroundColor: "#F9FCFA",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "rgba(215, 235, 222, 0.95)",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#0F281B",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  walkBgLeaf: {
    position: "absolute",
    right: -25,
    top: 50,
    width: 170,
    height: 170,
    opacity: 0.12,
    borderRadius: 85,
  },
  walkHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  walkIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E3F3EB",
    borderWidth: 1,
    borderColor: "rgba(185, 218, 198, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  walkHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  walkTitle: {
    fontSize: 16.5,
    lineHeight: 21,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0B1D12",
  },
  walkSubtitle: {
    fontSize: 12.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#5C7869",
    marginTop: 1.5,
  },
  walkPointsBadge: {
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 14,
    backgroundColor: "#E2F2E8",
    borderWidth: 1,
    borderColor: "rgba(185, 218, 198, 0.5)",
  },
  walkPointsText: {
    fontSize: 12.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#1E653D",
  },
  walkGaugeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 6,
  },
  stepDecoCol: {
    width: 65,
    alignItems: "flex-start",
  },
  stepDecoColRight: {
    width: 65,
    alignItems: "flex-end",
  },
  stepDecoText: {
    fontSize: 8.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#7B9687",
    letterSpacing: 1.4,
    lineHeight: 12.5,
  },
  stepDecoLine: {
    width: 22,
    height: 1.5,
    backgroundColor: "#8FAAA0",
    marginTop: 5,
    borderRadius: 1,
  },
  stepRingWrap: {
    width: 146,
    height: 146,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  stepRingCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  stepRingSteps: {
    fontSize: 32,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0B1D12",
    marginTop: 2,
    lineHeight: 34,
  },
  stepRingTarget: {
    fontSize: 11.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#607E6C",
    marginTop: 1,
  },
  walkProgressTrack: {
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#E0EEE5",
    overflow: "hidden",
    width: "100%",
    marginTop: 10,
  },
  walkProgressFill: {
    height: "100%",
    borderRadius: 3.5,
    backgroundColor: "#52B582",
  },
  walkDetail: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#527060",
    marginTop: 8,
  },
  walkNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  walkNoticeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E3F3EB",
    borderWidth: 1,
    borderColor: "rgba(185, 218, 198, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  walkNoticeText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#526E5E",
    lineHeight: 16,
    flex: 1,
  },
  greenCapsuleBtn: {
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    marginTop: 14,
    shadowColor: "#174428",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  greenCapsuleContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    gap: 10,
  },
  greenCapsuleText: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },

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
