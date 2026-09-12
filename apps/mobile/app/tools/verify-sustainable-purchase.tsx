import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  FileText,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { useMe } from "@/src/hooks/queries";
import { api } from "@/src/lib/api";
import { useAuthStore } from "@/src/store/auth";
import type { SustainablePurchaseVerification } from "@/src/types/api";

type PickedDocument = {
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
};

type FlowPhase = "upload" | "ready" | "verifying" | "success" | "revealed" | "claimed";

const VERIFICATION_STAGES = [
  "Connecting to verification service...",
  "Reading document...",
  "Checking ownership...",
  "Checking vehicle type...",
  "Electric Vehicle detected",
];

const REWARD_POINTS = 1500;

// Provider seam: the demo can later swap this implementation for DigiLockerProvider.
type DocumentVerificationProvider = {
  verify: (document: PickedDocument) => Promise<SustainablePurchaseVerification>;
};

const MockVerificationProvider: DocumentVerificationProvider = {
  verify: (document) =>
    api.verifySustainablePurchase({
      filename: document.name,
      mime_type: document.mimeType,
      size_bytes: document.size,
    }),
};

function formatBytes(bytes?: number) {
  if (!bytes) return "Size unavailable";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VerifySustainablePurchaseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const authUser = useAuthStore((state) => state.user);
  const [picked, setPicked] = useState<PickedDocument | null>(null);
  const [phase, setPhase] = useState<FlowPhase>("upload");
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState<SustainablePurchaseVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const pointsProgress = useRef(new Animated.Value(0)).current;
  const [pointsShown, setPointsShown] = useState(0);

  const startingPoints = me.data?.impact_points ?? authUser?.impact_points ?? 420;
  const displayPoints = result?.already_claimed
    ? result.total_points
    : Math.max(0, result ? result.total_points - result.reward_points : startingPoints);

  useEffect(() => {
    if (phase !== "verifying" && phase !== "success") {
      pulse.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);

  useEffect(() => {
    if (phase !== "verifying" || !picked) return;
    let cancelled = false;
    const interval = setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, VERIFICATION_STAGES.length - 1));
    }, 820);
    const timer = setTimeout(async () => {
      try {
        const verification = await MockVerificationProvider.verify(picked);
        if (cancelled) return;
        setResult(verification);
        setStageIndex(VERIFICATION_STAGES.length - 1);
        setPhase(verification.already_claimed ? "claimed" : "success");
      } catch (verificationError) {
        if (cancelled) return;
        setError(verificationError instanceof Error ? verificationError.message : "Verification could not be completed.");
        setPhase("ready");
      }
    }, VERIFICATION_STAGES.length * 820);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [phase, picked]);

  useEffect(() => {
    if (phase !== "revealed" || !result) return;
    pointsProgress.setValue(0);
    const listener = pointsProgress.addListener(({ value }) => {
      setPointsShown(Math.round((result.reward_points || REWARD_POINTS) * value));
    });
    Animated.timing(pointsProgress, { toValue: 1, duration: 1350, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    Animated.spring(reveal, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
    return () => pointsProgress.removeListener(listener);
  }, [phase, pointsProgress, reveal, result]);

  const glowStyle = useMemo(
    () => ({
      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }),
      transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) }],
    }),
    [pulse]
  );

  async function chooseDocument() {
    setError(null);
    const selection = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (selection.canceled || !selection.assets?.[0]) return;
    const asset = selection.assets[0];
    setPicked({ uri: asset.uri, name: asset.name || "sustainable_purchase_document", size: asset.size, mimeType: asset.mimeType });
    setResult(null);
    setPhase("ready");
  }

  function startVerification() {
    if (!picked) return;
    setError(null);
    setStageIndex(0);
    setPhase("verifying");
  }

  function openReward() {
    if (!result) return;
    setPhase("revealed");
  }

  const isBusy = phase === "verifying";
  const isComplete = phase === "revealed" || phase === "claimed";

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <ArrowLeft size={19} color="#163D2A" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>TOOLS  /  GREEN REWARDS</Text>
          <Text style={styles.headerTitle}>Verify sustainable purchase</Text>
        </View>
        <View style={styles.headerLock}><LockKeyhole size={16} color="#2EA86E" /></View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 36 }}
      >
        <View style={styles.hero}>
          <View style={styles.heroOrb} />
          <View style={styles.heroIcon}><Zap size={26} color="#F7C948" fill="#F7C948" /></View>
          <Text style={styles.heroTitle}>Turn proof into progress.</Text>
          <Text style={styles.heroBody}>Upload a purchase document and unlock a one-time Green Rewards moment for your electric vehicle.</Text>
          <View style={styles.demoPill}><ShieldCheck size={14} color="#BFF7D8" /><Text style={styles.demoPillText}>SIMULATED DEMO VERIFICATION</Text></View>
        </View>

        {phase === "upload" ? (
          <View style={styles.uploadCard}>
            <View style={styles.sectionIcon}><Upload size={21} color="#2EA86E" /></View>
            <Text style={styles.cardTitle}>Verify your EV purchase</Text>
            <Text style={styles.cardBody}>Upload a registration certificate, invoice, ownership document or related proof.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => void chooseDocument()} activeOpacity={0.86}>
              <Upload size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Upload document</Text>
            </TouchableOpacity>
            <Text style={styles.fileHint}>PDF, JPG or PNG · any demo document is accepted</Text>
          </View>
        ) : null}

        {picked && phase !== "verifying" && !isComplete ? (
          <View style={styles.documentCard}>
            <View style={styles.documentIcon}><FileText size={22} color="#2EA86E" /></View>
            <View style={styles.documentCopy}>
              <Text style={styles.documentEyebrow}>DOCUMENT UPLOADED</Text>
              <Text style={styles.documentName} numberOfLines={1}>{picked.name}</Text>
              <Text style={styles.documentMeta}>{formatBytes(picked.size)} · Ready for verification</Text>
            </View>
            <CheckCircle2 size={21} color="#2EA86E" />
          </View>
        ) : null}

        {phase === "ready" ? (
          <TouchableOpacity style={styles.verifyButton} onPress={startVerification} activeOpacity={0.86}>
            <ScanLine size={20} color="#FFFFFF" />
            <Text style={styles.verifyButtonText}>Connect &amp; Verify</Text>
          </TouchableOpacity>
        ) : null}

        {isBusy ? (
          <View style={styles.scannerCard}>
            <View style={styles.scannerVisual}>
              <Animated.View style={[styles.scannerGlow, glowStyle]} />
              <View style={styles.scannerDocument}><FileText size={36} color="#BFF7D8" /></View>
              <Animated.View style={[styles.scannerLine, { transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [-42, 42] }) }] }]} />
              <View style={styles.scannerRing}><ScanLine size={22} color="#F7C948" /></View>
            </View>
            <Text style={styles.scannerLabel}>SECURE CHECK IN PROGRESS</Text>
            <Text style={styles.scannerTitle}>{VERIFICATION_STAGES[stageIndex]}</Text>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((stageIndex + 1) / VERIFICATION_STAGES.length) * 100}%` }]} /></View>
            <Text style={styles.mockNote}>MockVerificationProvider · no government database contacted</Text>
          </View>
        ) : null}

        {phase === "success" && result ? (
          <View style={styles.successCard}>
            <Animated.View style={[styles.successGlow, glowStyle]} />
            <View style={styles.successIcon}><Check size={29} color="#FFFFFF" strokeWidth={3} /></View>
            <Text style={styles.successEyebrow}>VERIFICATION SUCCESSFUL</Text>
            <Text style={styles.successTitle}>Electric vehicle detected</Text>
            <Text style={styles.successBody}>Your sustainable purchase is ready for its Green Rewards reveal.</Text>
            <View style={styles.resultGrid}>
              <View><Text style={styles.resultLabel}>VEHICLE</Text><Text style={styles.resultValue}>{result.vehicle_make_model}</Text></View>
              <View><Text style={styles.resultLabel}>OWNERSHIP</Text><Text style={styles.resultValue}>{result.ownership}</Text></View>
            </View>
            <TouchableOpacity style={styles.openButton} onPress={openReward} activeOpacity={0.86}>
              <Sparkles size={18} color="#183222" /><Text style={styles.openButtonText}>Open reward</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {phase === "claimed" && result ? (
          <View style={styles.claimedCard}>
            <View style={styles.claimedIcon}><CheckCircle2 size={25} color="#2EA86E" /></View>
            <Text style={styles.cardTitle}>EV purchase already verified</Text>
            <Text style={styles.cardBody}>This demo purchase has already claimed its one-time reward.</Text>
            <View style={styles.claimedReward}><Text style={styles.claimedRewardLabel}>REWARD CLAIMED</Text><Text style={styles.claimedRewardValue}>+1,500 Green Points</Text></View>
          </View>
        ) : null}

        {phase === "revealed" && result ? (
          <View style={styles.rewardCard}>
            <Animated.View style={[styles.rewardBurst, { opacity: reveal }]} />
            <Animated.View style={[styles.rewardContent, { opacity: reveal, transform: [{ scale: reveal }] }]}>
              <View style={styles.rewardIcon}><Zap size={27} color="#F7C948" fill="#F7C948" /></View>
              <Text style={styles.rewardEyebrow}>MAJOR GREEN ACTION</Text>
              <Text style={styles.rewardPoints}>+{pointsShown.toLocaleString()}</Text>
              <Text style={styles.rewardLabel}>GREEN POINTS</Text>
              <Text style={styles.rewardVerified}>⚡ EV PURCHASE VERIFIED</Text>
              <View style={styles.achievement}><Sparkles size={17} color="#F7C948" /><View><Text style={styles.achievementEyebrow}>ACHIEVEMENT UNLOCKED</Text><Text style={styles.achievementTitle}>Electric Pioneer</Text></View></View>
              <View style={styles.balanceRow}><View><Text style={styles.balanceLabel}>CURRENT BALANCE</Text><Text style={styles.balanceValue}>{displayPoints.toLocaleString()}</Text></View><Text style={styles.balancePlus}>+{REWARD_POINTS.toLocaleString()}</Text></View>
            </Animated.View>
          </View>
        ) : null}

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.errorHint}>The demo did not upload your file. You can try verification again.</Text></View> : null}

        {!isBusy && !isComplete ? (
          <View style={styles.disclaimer}><LockKeyhole size={14} color="#7A9082" /><Text style={styles.disclaimerText}>Prototype only. No DigiLocker or government database is contacted.</Text></View>
        ) : null}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4FAF6" },
  header: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 11 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(46,168,110,0.18)" },
  headerCopy: { flex: 1 },
  eyebrow: { color: "#2EA86E", fontSize: 10, letterSpacing: 1.1, fontFamily: "IBMPlexMono_600SemiBold" },
  headerTitle: { marginTop: 3, color: "#183222", fontSize: 19, fontFamily: "Nunito_800ExtraBold" },
  headerLock: { width: 31, height: 31, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(46,168,110,0.1)" },
  hero: { marginTop: 10, minHeight: 205, borderRadius: 26, padding: 20, overflow: "hidden", backgroundColor: "#0E2A1E", borderWidth: 1, borderColor: "rgba(95,234,172,0.45)" },
  heroOrb: { position: "absolute", width: 220, height: 220, borderRadius: 110, right: -82, top: -100, backgroundColor: "rgba(46,168,110,0.24)" },
  heroIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,201,72,0.15)", borderWidth: 1, borderColor: "rgba(247,201,72,0.32)" },
  heroTitle: { marginTop: 17, color: "#FFFFFF", fontSize: 24, fontFamily: "Nunito_800ExtraBold" },
  heroBody: { marginTop: 5, maxWidth: 320, color: "rgba(235,255,244,0.75)", fontSize: 13, lineHeight: 19, fontFamily: "Nunito_400Regular" },
  demoPill: { alignSelf: "flex-start", marginTop: 16, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(46,168,110,0.23)" },
  demoPillText: { color: "#BFF7D8", fontSize: 9, letterSpacing: 0.7, fontFamily: "IBMPlexMono_600SemiBold" },
  uploadCard: { marginTop: 16, padding: 20, borderRadius: 23, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(46,168,110,0.18)", boxShadow: "0px 6px 18px rgba(17,71,42,0.08)" },
  sectionIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(46,168,110,0.11)" },
  cardTitle: { marginTop: 15, color: "#183222", fontSize: 19, fontFamily: "Nunito_800ExtraBold" },
  cardBody: { marginTop: 5, color: "#6C8375", fontSize: 13, lineHeight: 19, fontFamily: "Nunito_400Regular" },
  primaryButton: { marginTop: 18, height: 49, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#2EA86E" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Nunito_800ExtraBold" },
  fileHint: { marginTop: 10, textAlign: "center", color: "#8BA093", fontSize: 11, fontFamily: "Nunito_400Regular" },
  documentCard: { marginTop: 16, padding: 15, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(46,168,110,0.2)" },
  documentIcon: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(46,168,110,0.11)" },
  documentCopy: { flex: 1 },
  documentEyebrow: { color: "#2EA86E", fontSize: 9, letterSpacing: 0.8, fontFamily: "IBMPlexMono_600SemiBold" },
  documentName: { marginTop: 4, color: "#183222", fontSize: 14, fontFamily: "Nunito_800ExtraBold" },
  documentMeta: { marginTop: 3, color: "#799184", fontSize: 11, fontFamily: "Nunito_400Regular" },
  verifyButton: { marginTop: 12, height: 55, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: "#0E2A1E", boxShadow: "0px 6px 14px rgba(14,42,30,0.2)" },
  verifyButtonText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Nunito_800ExtraBold" },
  scannerCard: { marginTop: 16, padding: 20, borderRadius: 24, alignItems: "center", backgroundColor: "#102D20", borderWidth: 1, borderColor: "rgba(95,234,172,0.38)" },
  scannerVisual: { width: 178, height: 138, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 22, backgroundColor: "rgba(46,168,110,0.13)", borderWidth: 1, borderColor: "rgba(191,247,216,0.22)" },
  scannerGlow: { position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(46,168,110,0.4)" },
  scannerDocument: { width: 78, height: 93, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(235,255,244,0.1)", borderWidth: 1, borderColor: "rgba(191,247,216,0.55)" },
  scannerLine: { position: "absolute", left: 20, right: 20, height: 2, backgroundColor: "#F7C948", boxShadow: "0px 0px 11px rgba(247,201,72,0.9)" },
  scannerRing: { position: "absolute", right: 17, bottom: 15, width: 35, height: 35, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,201,72,0.13)" },
  scannerLabel: { marginTop: 19, color: "#8AF0B8", fontSize: 10, letterSpacing: 1.1, fontFamily: "IBMPlexMono_600SemiBold" },
  scannerTitle: { marginTop: 7, color: "#FFFFFF", fontSize: 16, textAlign: "center", fontFamily: "Nunito_800ExtraBold" },
  progressTrack: { width: "100%", height: 5, marginTop: 18, borderRadius: 3, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.13)" },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: "#F7C948" },
  mockNote: { marginTop: 13, color: "rgba(235,255,244,0.53)", fontSize: 10, textAlign: "center", fontFamily: "Nunito_400Regular" },
  successCard: { marginTop: 16, padding: 22, borderRadius: 25, alignItems: "center", overflow: "hidden", backgroundColor: "#0E2A1E", borderWidth: 1, borderColor: "rgba(95,234,172,0.45)" },
  successGlow: { position: "absolute", width: 230, height: 230, borderRadius: 115, top: -150, backgroundColor: "rgba(46,168,110,0.32)" },
  successIcon: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: "#2EA86E", boxShadow: "0px 0px 18px rgba(95,234,172,0.5)" },
  successEyebrow: { marginTop: 18, color: "#F7C948", fontSize: 10, letterSpacing: 1.2, fontFamily: "IBMPlexMono_600SemiBold" },
  successTitle: { marginTop: 7, color: "#FFFFFF", fontSize: 21, fontFamily: "Nunito_800ExtraBold" },
  successBody: { marginTop: 5, color: "rgba(235,255,244,0.72)", fontSize: 13, lineHeight: 19, textAlign: "center", fontFamily: "Nunito_400Regular" },
  resultGrid: { width: "100%", marginTop: 18, padding: 13, borderRadius: 15, flexDirection: "row", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.08)" },
  resultLabel: { color: "rgba(191,247,216,0.6)", fontSize: 9, letterSpacing: 0.8, fontFamily: "IBMPlexMono_600SemiBold" },
  resultValue: { marginTop: 4, color: "#FFFFFF", fontSize: 13, fontFamily: "Nunito_700Bold" },
  openButton: { width: "100%", marginTop: 18, height: 51, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#F7C948" },
  openButtonText: { color: "#183222", fontSize: 15, fontFamily: "Nunito_800ExtraBold" },
  claimedCard: { marginTop: 16, padding: 20, borderRadius: 23, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(46,168,110,0.25)" },
  claimedIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(46,168,110,0.11)" },
  claimedReward: { marginTop: 17, padding: 14, borderRadius: 15, backgroundColor: "rgba(46,168,110,0.08)" },
  claimedRewardLabel: { color: "#2EA86E", fontSize: 9, letterSpacing: 0.9, fontFamily: "IBMPlexMono_600SemiBold" },
  claimedRewardValue: { marginTop: 4, color: "#183222", fontSize: 18, fontFamily: "Nunito_800ExtraBold" },
  rewardCard: { marginTop: 16, minHeight: 460, padding: 22, borderRadius: 27, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#0E2A1E", borderWidth: 1, borderColor: "rgba(247,201,72,0.75)" },
  rewardBurst: { position: "absolute", width: 330, height: 330, borderRadius: 165, backgroundColor: "rgba(247,201,72,0.16)" },
  rewardContent: { width: "100%", alignItems: "center" },
  rewardIcon: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,201,72,0.14)", borderWidth: 1, borderColor: "rgba(247,201,72,0.55)" },
  rewardEyebrow: { marginTop: 17, color: "#F7C948", fontSize: 10, letterSpacing: 1.3, fontFamily: "IBMPlexMono_600SemiBold" },
  rewardPoints: { marginTop: 5, color: "#FFFFFF", fontSize: 62, lineHeight: 73, fontFamily: "Nunito_900Black" },
  rewardLabel: { color: "#BFF7D8", fontSize: 13, letterSpacing: 2.4, fontFamily: "IBMPlexMono_600SemiBold" },
  rewardVerified: { marginTop: 15, color: "#FFFFFF", fontSize: 13, fontFamily: "Nunito_700Bold" },
  achievement: { width: "100%", marginTop: 25, padding: 14, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "rgba(255,255,255,0.09)" },
  achievementEyebrow: { color: "rgba(191,247,216,0.65)", fontSize: 9, letterSpacing: 0.8, fontFamily: "IBMPlexMono_600SemiBold" },
  achievementTitle: { marginTop: 3, color: "#FFFFFF", fontSize: 17, fontFamily: "Nunito_800ExtraBold" },
  balanceRow: { width: "100%", marginTop: 14, paddingTop: 15, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.13)", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  balanceLabel: { color: "rgba(191,247,216,0.65)", fontSize: 9, letterSpacing: 0.8, fontFamily: "IBMPlexMono_600SemiBold" },
  balanceValue: { marginTop: 3, color: "#FFFFFF", fontSize: 24, fontFamily: "Nunito_900Black" },
  balancePlus: { color: "#8AF0B8", fontSize: 15, fontFamily: "Nunito_800ExtraBold" },
  errorBox: { marginTop: 14, padding: 14, borderRadius: 15, backgroundColor: "#FFF2F0", borderWidth: 1, borderColor: "#F2C6C1" },
  errorText: { color: "#A23C34", fontSize: 13, fontFamily: "Nunito_700Bold" },
  errorHint: { marginTop: 3, color: "#A23C34", fontSize: 11, fontFamily: "Nunito_400Regular" },
  disclaimer: { marginTop: 18, paddingHorizontal: 8, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  disclaimerText: { flex: 1, color: "#7A9082", fontSize: 11, lineHeight: 16, textAlign: "center", fontFamily: "Nunito_400Regular" },
});
