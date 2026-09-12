import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Animated, Easing, Platform } from "react-native";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Car,
  Zap,
  Check,
  Cpu,
} from "lucide-react-native";
import { Text } from "@/components/ui/text";

export const STAGES = [
  { label: "Connecting to verification service...", icon: Lock },
  { label: "Reading document...", icon: FileText },
  { label: "Checking ownership...", icon: ShieldCheck },
  { label: "Checking vehicle category...", icon: Car },
  { label: "Electric Vehicle detected ✓", icon: Zap },
];

type VerificationScannerProps = {
  active: boolean;
  onComplete: () => void;
};

const isNative = Platform.OS !== "web";

export function VerificationScanner({ active, onComplete }: VerificationScannerProps) {
  const [currentStage, setCurrentStage] = useState(0);

  // Laser scanner animation
  const laserPos = useRef(new Animated.Value(0)).current;
  const docGlow = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      setCurrentStage(0);
      return;
    }

    // Laser scanning loop
    const laserLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserPos, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: isNative,
        }),
        Animated.timing(laserPos, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: isNative,
        }),
      ])
    );

    // Glowing document pulse
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(docGlow, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
        Animated.timing(docGlow, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
      ])
    );

    laserLoop.start();
    glowLoop.start();

    // Progress bar smooth fill
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: STAGES.length * 850,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Stage progression interval
    const interval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 850);

    // Completion timeout
    const completeTimer = setTimeout(() => {
      clearInterval(interval);
      onComplete();
    }, STAGES.length * 850 + 400);

    return () => {
      laserLoop.stop();
      glowLoop.stop();
      clearInterval(interval);
      clearTimeout(completeTimer);
    };
  }, [active]);

  const CurrentIcon = STAGES[currentStage].icon;

  return (
    <View style={styles.card}>
      {/* Visual Laser Scanner Chamber */}
      <View style={styles.scannerChamber}>
        {/* Ambient background glow */}
        <Animated.View
          style={[
            styles.chamberGlow,
            {
              opacity: docGlow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.65] }),
              transform: [
                { scale: docGlow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] }) },
              ],
            },
          ]}
        />

        {/* 3D Glowing Document in scanner */}
        <View style={styles.documentTarget}>
          <FileText size={38} color="#5EEAD4" strokeWidth={1.8} />
          <View style={styles.docMiniLines}>
            <View style={styles.docLine1} />
            <View style={styles.docLine2} />
          </View>
        </View>

        {/* Moving Laser Beam */}
        <Animated.View
          style={[
            styles.laserBeam,
            {
              transform: [
                {
                  translateY: laserPos.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-44, 44],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.laserCore} />
          <View style={styles.laserFlare} />
        </Animated.View>
      </View>

      {/* Stage Header Info */}
      <View style={styles.stageStatusBlock}>
        <View style={styles.stageIconWrap}>
          <CurrentIcon size={16} color="#5EEAD4" strokeWidth={2.4} />
        </View>
        <View style={styles.stageCopy}>
          <Text style={styles.stageTag}>SECURE VERIFICATION IN PROGRESS</Text>
          <Text style={styles.stageTitle}>{STAGES[currentStage].label}</Text>
        </View>
      </View>

      {/* Animated Overall Progress Bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ["4%", "100%"],
              }),
            },
          ]}
        />
      </View>

      {/* Step Checklist Pills */}
      <View style={styles.checklist}>
        {STAGES.map((s, idx) => {
          const isDone = idx < currentStage;
          const isCurrent = idx === currentStage;
          const StepIcon = s.icon;

          return (
            <View
              key={s.label}
              style={[
                styles.checkItem,
                isDone
                  ? styles.checkItemDone
                  : isCurrent
                  ? styles.checkItemCurrent
                  : styles.checkItemPending,
              ]}
            >
              <View
                style={[
                  styles.checkDot,
                  isDone ? styles.checkDotDone : isCurrent ? styles.checkDotCurrent : null,
                ]}
              >
                {isDone ? (
                  <Check size={9} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <StepIcon
                    size={8}
                    color={isCurrent ? "#059669" : "rgba(255,255,255,0.4)"}
                    strokeWidth={2.4}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.checkLabel,
                  isDone
                    ? styles.checkLabelDone
                    : isCurrent
                    ? styles.checkLabelCurrent
                    : styles.checkLabelPending,
                ]}
                numberOfLines={1}
              >
                {s.label.replace("...", "").replace(" ✓", "")}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Seam Note */}
      <View style={styles.providerNote}>
        <ShieldCheck size={12} color="#7A9082" />
        <Text style={styles.providerNoteText}>
          MockVerificationProvider seam · Simulated verification for prototype
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0D251A",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(94, 234, 212, 0.35)",
    gap: 16,
    boxShadow: "0px 4px 16px rgba(5, 150, 105, 0.15)",
    elevation: 4,
  },
  scannerChamber: {
    height: 140,
    borderRadius: 18,
    backgroundColor: "rgba(5, 18, 12, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(94, 234, 212, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  chamberGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(46, 168, 110, 0.4)",
  },
  documentTarget: {
    width: 82,
    height: 104,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(94, 234, 212, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  docMiniLines: {
    gap: 3,
    alignItems: "center",
  },
  docLine1: {
    width: 44,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
  docLine2: {
    width: 32,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  laserBeam: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 2.5,
    justifyContent: "center",
  },
  laserCore: {
    height: 2.5,
    backgroundColor: "#FBBF24",
    borderRadius: 1,
  },
  laserFlare: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: "rgba(251, 191, 36, 0.35)",
    borderRadius: 5,
  },
  stageStatusBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stageIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(94, 234, 212, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(94, 234, 212, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  stageCopy: {
    flex: 1,
    gap: 2,
  },
  stageTag: {
    fontSize: 9,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#5EEAD4",
    letterSpacing: 0.8,
  },
  stageTitle: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 3,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#5EEAD4",
    borderRadius: 3,
  },
  checklist: {
    gap: 6,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  checkItemDone: {
    backgroundColor: "rgba(46, 168, 110, 0.14)",
  },
  checkItemCurrent: {
    backgroundColor: "rgba(94, 234, 212, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(94, 234, 212, 0.4)",
  },
  checkItemPending: {
    backgroundColor: "transparent",
    opacity: 0.4,
  },
  checkDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkDotDone: {
    backgroundColor: "#2EA86E",
  },
  checkDotCurrent: {
    backgroundColor: "#5EEAD4",
  },
  checkLabel: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
  },
  checkLabelDone: {
    color: "#A7F3D0",
    fontFamily: "Nunito_700Bold",
  },
  checkLabelCurrent: {
    color: "#FFFFFF",
    fontFamily: "Nunito_800ExtraBold",
  },
  checkLabelPending: {
    color: "rgba(255, 255, 255, 0.5)",
  },
  providerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 4,
  },
  providerNoteText: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
    textAlign: "center",
  },
});
