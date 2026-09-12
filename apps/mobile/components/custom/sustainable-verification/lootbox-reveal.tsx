import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Modal,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Zap,
  Sparkles,
  Award,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Flame,
} from "lucide-react-native";
import { Text } from "@/components/ui/text";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// 24 Radial blast particles with precomputed angles & distances
const PARTICLES = Array.from({ length: 24 }).map((_, i) => {
  const angle = (i / 24) * 2 * Math.PI + (Math.random() * 0.2 - 0.1);
  const distance = 80 + Math.random() * 90;
  const size = 6 + (i % 4) * 2.5;
  const colors = ["#FBBF24", "#2EA86E", "#5EEAD4", "#FFFFFF", "#F59E0B"];
  return {
    id: i,
    dx: Math.cos(angle) * distance,
    dy: Math.sin(angle) * distance,
    size,
    color: colors[i % colors.length],
    isSquare: i % 2 === 0,
  };
});

// Ambient rising sparkles
const AMBIENT_SPARKLES = Array.from({ length: 8 }).map((_, i) => ({
  id: i,
  startX: -60 + i * 18,
  delay: i * 250,
  size: 4 + (i % 3) * 2,
}));

type LootboxRevealProps = {
  visible: boolean;
  rewardPoints?: number;
  baseBalance?: number;
  onClaimComplete: () => void;
  onDismiss?: () => void;
};

const isNative = Platform.OS !== "web";

export function LootboxReveal({
  visible,
  rewardPoints = 1500,
  baseBalance = 2850,
  onClaimComplete,
  onDismiss,
}: LootboxRevealProps) {
  const [phase, setPhase] = useState<"vault" | "bursting" | "revealed">("vault");
  const [displayedPoints, setDisplayedPoints] = useState(0);

  // Animations
  const vaultFloat = useRef(new Animated.Value(0)).current;
  const vaultGlow = useRef(new Animated.Value(0)).current;
  const vaultShake = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const shockwave1 = useRef(new Animated.Value(0)).current;
  const shockwave2 = useRef(new Animated.Value(0)).current;
  const particlesAnim = useRef(new Animated.Value(0)).current;
  const crestSpring = useRef(new Animated.Value(0)).current;
  const counterAnim = useRef(new Animated.Value(0)).current;
  const achievementFade = useRef(new Animated.Value(0)).current;
  const ambientFloats = useRef(AMBIENT_SPARKLES.map(() => new Animated.Value(0))).current;

  // Vault breathing & hovering in suspense state
  useEffect(() => {
    if (!visible) {
      setPhase("vault");
      setDisplayedPoints(0);
      return;
    }

    // Floating up and down
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(vaultFloat, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
        Animated.timing(vaultFloat, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
      ])
    );

    // Glowing light leaking loop
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(vaultGlow, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: isNative,
        }),
        Animated.timing(vaultGlow, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: isNative,
        }),
      ])
    );

    // Rising ambient sparkles
    ambientFloats.forEach((anim, idx) => {
      anim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.delay(AMBIENT_SPARKLES[idx].delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: isNative,
          }),
        ])
      ).start();
    });

    floatLoop.start();
    glowLoop.start();

    return () => {
      floatLoop.stop();
      glowLoop.stop();
    };
  }, [visible]);

  // Handle open vault triggering the BOOM sequence
  const handleOpenVault = () => {
    if (phase !== "vault") return;
    setPhase("bursting");

    // Phase 1: Micro-shake building up tension
    Animated.sequence([
      Animated.timing(vaultShake, { toValue: 8, duration: 50, useNativeDriver: isNative }),
      Animated.timing(vaultShake, { toValue: -8, duration: 50, useNativeDriver: isNative }),
      Animated.timing(vaultShake, { toValue: 6, duration: 50, useNativeDriver: isNative }),
      Animated.timing(vaultShake, { toValue: -6, duration: 50, useNativeDriver: isNative }),
      Animated.timing(vaultShake, { toValue: 0, duration: 50, useNativeDriver: isNative }),
    ]).start(() => {
      // Phase 2: Massive Flash & Particle Shockwave Burst
      Animated.parallel([
        // Screen flash
        Animated.sequence([
          Animated.timing(flashOpacity, { toValue: 0.9, duration: 120, useNativeDriver: isNative }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 350, useNativeDriver: isNative }),
        ]),
        // Shockwave 1
        Animated.timing(shockwave1, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: isNative,
        }),
        // Shockwave 2 (staggered)
        Animated.sequence([
          Animated.delay(80),
          Animated.timing(shockwave2, {
            toValue: 1,
            duration: 750,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: isNative,
          }),
        ]),
        // Particle scatter
        Animated.timing(particlesAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: isNative,
        }),
        // Crest spring entry
        Animated.sequence([
          Animated.delay(180),
          Animated.spring(crestSpring, {
            toValue: 1,
            friction: 5,
            tension: 70,
            useNativeDriver: isNative,
          }),
        ]),
      ]).start(() => {
        setPhase("revealed");

        // Phase 3: Number Roll-up Animation (0 -> 1500)
        counterAnim.setValue(0);
        const listener = counterAnim.addListener(({ value }) => {
          setDisplayedPoints(Math.round(rewardPoints * value));
        });

        Animated.parallel([
          Animated.timing(counterAnim, {
            toValue: 1,
            duration: 1400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.delay(400),
            Animated.timing(achievementFade, {
              toValue: 1,
              duration: 600,
              easing: Easing.out(Easing.quad),
              useNativeDriver: isNative,
            }),
          ]),
        ]).start(() => {
          counterAnim.removeListener(listener);
          setDisplayedPoints(rewardPoints);
        });
      });
    });
  };

  const newBalance = baseBalance + rewardPoints;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Deep Radiant Emerald Background */}
        <LinearGradient
          colors={["rgba(5, 18, 12, 0.96)", "rgba(8, 28, 19, 0.98)", "rgba(4, 12, 8, 0.99)"]}
          style={StyleSheet.absoluteFill}
        />

        {/* Shockwave Rings */}
        <Animated.View
          style={[
            styles.shockwaveRing,
            {
              opacity: shockwave1.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.9, 0.4, 0] }),
              transform: [{ scale: shockwave1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 3.2] }) }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.shockwaveRingGold,
            {
              opacity: shockwave2.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.8, 0.3, 0] }),
              transform: [{ scale: shockwave2.interpolate({ inputRange: [0, 1], outputRange: [0.2, 2.8] }) }],
            },
          ]}
        />

        {/* Explosive Radial Particles */}
        {PARTICLES.map((p) => {
          const translateX = particlesAnim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] });
          const translateY = particlesAnim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] });
          const opacity = particlesAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0] });
          const scale = particlesAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1.2, 0.2] });
          const rotate = particlesAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

          return (
            <Animated.View
              key={p.id}
              style={[
                styles.particle,
                {
                  width: p.size,
                  height: p.size,
                  borderRadius: p.isSquare ? 2 : p.size / 2,
                  backgroundColor: p.color,
                  opacity,
                  transform: [{ translateX }, { translateY }, { scale }, { rotate }],
                },
              ]}
            />
          );
        })}

        {/* Full Screen Flash */}
        <Animated.View style={[styles.flashScreen, { opacity: flashOpacity, pointerEvents: "none" }]} />

        {/* Content Container */}
        <View style={styles.modalContent}>
          {/* ========================================================= */}
          {/* STAGE A: SUSPENSE VAULT (Idle closed lootbox)             */}
          {/* ========================================================= */}
          {phase === "vault" || phase === "bursting" ? (
            <View style={styles.vaultStage}>
              {/* Suspense Eyebrow Tag */}
              <View style={styles.suspenseTag}>
                <ShieldCheck size={12} color="#5EEAD4" strokeWidth={2.4} />
                <Text style={styles.suspenseTagText}>SUSTAINABILITY REWARD VAULT</Text>
              </View>

              <Text style={styles.suspenseTitle}>EV Purchase Verified</Text>
              <Text style={styles.suspenseSub}>
                Tap the energy vault below to break the seal and unlock your bounty
              </Text>

              {/* Interactive Glowing Vault Box */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleOpenVault}
                style={styles.vaultWrapper}
              >
                {/* Floating ambient rising particles */}
                {AMBIENT_SPARKLES.map((spark, idx) => {
                  const translateY = ambientFloats[idx].interpolate({
                    inputRange: [0, 1],
                    outputRange: [60, -90],
                  });
                  const opacity = ambientFloats[idx].interpolate({
                    inputRange: [0, 0.3, 0.8, 1],
                    outputRange: [0, 0.8, 0.8, 0],
                  });
                  return (
                    <Animated.View
                      key={spark.id}
                      style={[
                        styles.ambientParticle,
                        {
                          left: SCREEN_WIDTH / 2 + spark.startX,
                          width: spark.size,
                          height: spark.size,
                          borderRadius: spark.size / 2,
                          opacity,
                          transform: [{ translateY }],
                        },
                      ]}
                    />
                  );
                })}

                {/* Animated Light Leaks Behind Vault */}
                <Animated.View
                  style={[
                    styles.vaultAura,
                    {
                      opacity: vaultGlow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] }),
                      transform: [
                        { scale: vaultGlow.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.15] }) },
                      ],
                    },
                  ]}
                />

                {/* 3D-styled Eco Vault Body */}
                <Animated.View
                  style={[
                    styles.vaultBox,
                    {
                      transform: [
                        {
                          translateY: vaultFloat.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-6, 6],
                          }),
                        },
                        { translateX: vaultShake },
                      ],
                    },
                  ]}
                >
                  {/* Energy Conduit Stripes */}
                  <View style={styles.vaultConduitTop} />
                  <View style={styles.vaultConduitBottom} />

                  {/* Vault Center Glowing Core */}
                  <View style={styles.vaultCore}>
                    <Animated.View
                      style={[
                        styles.vaultCoreGlow,
                        {
                          opacity: vaultGlow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
                          transform: [
                            { scale: vaultGlow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] }) },
                          ],
                        },
                      ]}
                    />
                    <Zap size={38} color="#FBBF24" fill="#FBBF24" strokeWidth={1.5} />
                  </View>

                  {/* Glowing Seam Light Beams */}
                  <Animated.View
                    style={[
                      styles.seamBeamHorizontal,
                      { opacity: vaultGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.95] }) },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.seamBeamVertical,
                      { opacity: vaultGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.95] }) },
                    ]}
                  />

                  {/* Corner Fasteners */}
                  <View style={[styles.cornerNut, styles.cornerTL]} />
                  <View style={[styles.cornerNut, styles.cornerTR]} />
                  <View style={[styles.cornerNut, styles.cornerBL]} />
                  <View style={[styles.cornerNut, styles.cornerBR]} />
                </Animated.View>
              </TouchableOpacity>

              {/* Action Button: Open Reward */}
              <TouchableOpacity
                style={styles.openRewardBtn}
                onPress={handleOpenVault}
                activeOpacity={0.85}
              >
                <Sparkles size={18} color="#0D1811" strokeWidth={2.4} />
                <Text style={styles.openRewardBtnText}>OPEN REWARD</Text>
              </TouchableOpacity>
              <Text style={styles.tapPromptText}>or tap the vault directly</Text>
            </View>
          ) : null}

          {/* ========================================================= */}
          {/* STAGE B: REVEALED REWARD (The Big Moment & Number Rollup) */}
          {/* ========================================================= */}
          {phase === "revealed" ? (
            <Animated.View
              style={[
                styles.revealStage,
                {
                  opacity: crestSpring,
                  transform: [
                    {
                      scale: crestSpring.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.65, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Rarity Eyebrow Badge */}
              <View style={styles.rarityBadge}>
                <Flame size={12} color="#FBBF24" strokeWidth={2.4} />
                <Text style={styles.rarityBadgeText}>MAJOR GREEN ACTION</Text>
              </View>

              {/* Big Number Counting Animation */}
              <View style={styles.pointsDisplayWrap}>
                <Text style={styles.pointsBigNumber}>
                  +{displayedPoints.toLocaleString()}
                </Text>
                <Text style={styles.pointsUnitLabel}>KARMA COINS</Text>
              </View>

              {/* Verification Subtitle */}
              <View style={styles.verifiedPill}>
                <CheckCircle2 size={13} color="#059669" strokeWidth={2.4} />
                <Text style={styles.verifiedPillText}>EV PURCHASE VERIFIED</Text>
              </View>

              {/* Achievement Unlocked Banner */}
              <Animated.View style={[styles.achievementCard, { opacity: achievementFade }]}>
                <View style={styles.achievementIconCircle}>
                  <Zap size={20} color="#FBBF24" fill="#FBBF24" strokeWidth={1.8} />
                </View>
                <View style={styles.achievementInfo}>
                  <View style={styles.achievementHeaderRow}>
                    <Text style={styles.achievementEyebrow}>ACHIEVEMENT UNLOCKED</Text>
                    <Sparkles size={12} color="#FBBF24" />
                  </View>
                  <Text style={styles.achievementTitle}>⚡ Electric Pioneer</Text>
                  <Text style={styles.achievementDetail}>
                    First certified zero-tailpipe vehicle verified
                  </Text>
                </View>
              </Animated.View>

              {/* Arithmetic Balance Transition Card */}
              <Animated.View style={[styles.balanceMathCard, { opacity: achievementFade }]}>
                <View style={styles.mathRow}>
                  <Text style={styles.mathLabel}>Current balance</Text>
                  <Text style={styles.mathValueMuted}>{baseBalance.toLocaleString()} coins</Text>
                </View>
                <View style={styles.mathRow}>
                  <Text style={styles.mathLabelAccent}>+ EV Purchase Reward</Text>
                  <Text style={styles.mathValueAccent}>+{rewardPoints.toLocaleString()} coins</Text>
                </View>
                <View style={styles.mathDivider} />
                <View style={styles.mathRowTotal}>
                  <Text style={styles.mathTotalLabel}>New Balance</Text>
                  <Text style={styles.mathTotalValue}>{newBalance.toLocaleString()} Karma Coins</Text>
                </View>
              </Animated.View>

              {/* Claim CTA Button */}
              <TouchableOpacity
                style={styles.claimCompleteBtn}
                onPress={onClaimComplete}
                activeOpacity={0.88}
              >
                <Text style={styles.claimCompleteBtnText}>Collect & Continue</Text>
                <ArrowRight size={16} color="#0D1811" strokeWidth={2.4} />
              </TouchableOpacity>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3, 12, 8, 0.95)",
  },
  shockwaveRing: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2.5,
    borderColor: "#5EEAD4",
  },
  shockwaveRingGold: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 2,
    borderColor: "#FBBF24",
  },
  particle: {
    position: "absolute",
  },
  ambientParticle: {
    position: "absolute",
    backgroundColor: "#FBBF24",
    boxShadow: "0px 0px 4px rgba(251, 191, 36, 0.8)",
  },
  flashScreen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#FFFFFF",
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    paddingHorizontal: 24,
    alignItems: "center",
  },

  // Vault Suspense Stage
  vaultStage: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  suspenseTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(94, 234, 212, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(94, 234, 212, 0.3)",
  },
  suspenseTagText: {
    fontSize: 10,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#5EEAD4",
    letterSpacing: 1.2,
  },
  suspenseTitle: {
    fontSize: 26,
    fontFamily: "Nunito_900Black",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  suspenseSub: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "rgba(232, 255, 244, 0.75)",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
  },
  vaultWrapper: {
    marginTop: 20,
    marginBottom: 20,
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  vaultAura: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(46, 168, 110, 0.35)",
    boxShadow: "0px 0px 36px rgba(46, 168, 110, 0.9)",
  },
  vaultBox: {
    width: 170,
    height: 170,
    borderRadius: 36,
    backgroundColor: "#0D2E20",
    borderWidth: 2,
    borderColor: "rgba(247, 201, 72, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 8px 24px rgba(251, 191, 36, 0.45)",
    elevation: 12,
    overflow: "hidden",
  },
  vaultConduitTop: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: "#5EEAD4",
    opacity: 0.6,
  },
  vaultConduitBottom: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: "#5EEAD4",
    opacity: 0.6,
  },
  vaultCore: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(247, 201, 72, 0.16)",
    borderWidth: 1.5,
    borderColor: "rgba(247, 201, 72, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  vaultCoreGlow: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(247, 201, 72, 0.3)",
  },
  seamBeamHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: "#FBBF24",
  },
  seamBeamVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: "#FBBF24",
  },
  cornerNut: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FBBF24",
  },
  cornerTL: { top: 10, left: 10 },
  cornerTR: { top: 10, right: 10 },
  cornerBL: { bottom: 10, left: 10 },
  cornerBR: { bottom: 10, right: 10 },

  openRewardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FBBF24",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    boxShadow: "0px 4px 12px rgba(251, 191, 36, 0.4)",
    elevation: 6,
  },
  openRewardBtnText: {
    fontSize: 15,
    fontFamily: "Nunito_900Black",
    color: "#0D1811",
    letterSpacing: 0.8,
  },
  tapPromptText: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "rgba(232, 255, 244, 0.5)",
  },

  // Revealed Stage
  revealStage: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  rarityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.45)",
  },
  rarityBadgeText: {
    fontSize: 10.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#FBBF24",
    letterSpacing: 1.1,
  },
  pointsDisplayWrap: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  pointsBigNumber: {
    fontSize: 58,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: -1,
    ...Platform.select({
      web: { textShadow: "0px 0px 20px rgba(94, 234, 212, 0.6)" as any },
      default: {
        textShadowColor: "rgba(94, 234, 212, 0.6)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
      },
    }),
  },
  pointsUnitLabel: {
    fontSize: 13,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#5EEAD4",
    letterSpacing: 2.2,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedPillText: {
    fontSize: 11,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
    letterSpacing: 0.5,
  },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    marginTop: 6,
  },
  achievementIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(247, 201, 72, 0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(247, 201, 72, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  achievementInfo: {
    flex: 1,
    gap: 1,
  },
  achievementHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  achievementEyebrow: {
    fontSize: 8.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#FBBF24",
    letterSpacing: 0.8,
  },
  achievementTitle: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
  },
  achievementDetail: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "rgba(232, 255, 244, 0.72)",
  },

  // Balance Arithmetic Card
  balanceMathCard: {
    width: "100%",
    backgroundColor: "rgba(13, 46, 32, 0.75)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(46, 168, 110, 0.3)",
    gap: 6,
    marginTop: 4,
  },
  mathRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mathLabel: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "rgba(232, 255, 244, 0.65)",
  },
  mathValueMuted: {
    fontSize: 12,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "rgba(255, 255, 255, 0.75)",
  },
  mathLabelAccent: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#5EEAD4",
  },
  mathValueAccent: {
    fontSize: 12,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#5EEAD4",
  },
  mathDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    marginVertical: 2,
  },
  mathRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mathTotalLabel: {
    fontSize: 12,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
  },
  mathTotalValue: {
    fontSize: 14,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#FBBF24",
  },

  claimCompleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#5EEAD4",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
    boxShadow: "0px 4px 10px rgba(94, 234, 212, 0.4)",
    elevation: 4,
  },
  claimCompleteBtnText: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
});
