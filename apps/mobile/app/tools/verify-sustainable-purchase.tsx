import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  LockKeyhole,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Car,
  FileCheck2,
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  Award,
} from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { useMe } from "@/src/hooks/queries";
import { api } from "@/src/lib/api";
import { useAuthStore } from "@/src/store/auth";
import { useSustainablePurchaseStore } from "@/src/store/sustainable-purchase";
import {
  DocumentUploader,
  UploadedFile,
} from "@/components/custom/sustainable-verification/document-uploader";
import { VerificationScanner } from "@/components/custom/sustainable-verification/verification-scanner";
import { LootboxReveal } from "@/components/custom/sustainable-verification/lootbox-reveal";

export default function VerifySustainablePurchaseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const me = useMe();
  const authUser = useAuthStore((state) => state.user);

  const {
    isVerified,
    rewardClaimed,
    rewardPoints,
    vehicleMakeModel,
    vehicleType,
    ownership,
    documentName,
    setVerified,
    claimReward,
    resetDemo,
  } = useSustainablePurchaseStore();

  const [pickedFile, setPickedFile] = useState<UploadedFile | null>(null);
  const [phase, setPhase] = useState<"upload" | "scanning" | "lootbox" | "verified">(
    rewardClaimed || isVerified ? "verified" : "upload"
  );
  const [isResetting, setIsResetting] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifiedBaseBalance, setVerifiedBaseBalance] = useState<number | null>(null);

  const currentPoints = me.data?.impact_points ?? authUser?.impact_points ?? null;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/tools");
    }
  };

  // Called when user clicks [Connect & Verify] on the uploaded document
  const handleStartVerification = () => {
    if (!pickedFile) return;
    setPhase("scanning");
  };

  // Called when laser scanning finishes the 5 stages
  const handleScanComplete = async () => {
    if (!pickedFile) return;
    setVerificationError(null);

    try {
      // The API calculates the reward from the submitted document metadata.
      // Only reveal the lootbox after that response succeeds.
      const result = await api.verifySustainablePurchase({
        filename: pickedFile.name,
        mime_type: pickedFile.mimeType || "application/pdf",
        size_bytes: pickedFile.size,
      });
      if (result.status !== "verified") {
        throw new Error(result.verification || "Purchase verification was not successful.");
      }

      setVerified({
        documentName: pickedFile.name,
        documentSize: pickedFile.size,
        vehicleMakeModel: result.vehicle_make_model,
        vehicleType: result.vehicle_type,
        ownership: result.ownership,
        rewardPoints: result.reward_points,
      });
      setVerifiedBaseBalance(
        Math.max(0, result.total_points - Math.max(0, result.reward_points))
      );
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: ["score"] });
      queryClient.invalidateQueries({ queryKey: ["points-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["league"] });

      if (result.already_claimed || result.reward_points <= 0) {
        // An idempotent retry is verified, but it does not mint a second
        // reward or open a lootbox showing a made-up amount.
        claimReward();
        setPhase("verified");
      } else {
        setPhase("lootbox");
      }
    } catch (error) {
      setVerificationError(
        error instanceof Error
          ? error.message
          : "Verification is unavailable right now. Please try again."
      );
      setPhase("upload");
    }
  };

  // Called when user claims reward inside the lootbox modal
  const handleLootboxClaimed = async () => {
    claimReward();
    setPhase("verified");
  };

  // Presentation reset handler
  const handleResetDemo = async () => {
    const doReset = async () => {
      setIsResetting(true);
      try {
        await api.resetSustainablePurchase();
      } catch {
        // Fallback gracefully
      } finally {
        resetDemo();
        setVerifiedBaseBalance(null);
        setPickedFile(null);
        setPhase("upload");
        setIsResetting(false);
        queryClient.invalidateQueries({ queryKey: ["me"] });
        queryClient.invalidateQueries({ queryKey: ["activity"] });
        queryClient.invalidateQueries({ queryKey: ["score"] });
        queryClient.invalidateQueries({ queryKey: ["points-ledger"] });
        queryClient.invalidateQueries({ queryKey: ["league"] });
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Reset EV verification demo so you can replay the scan and lootbox animation?")) {
        await doReset();
      }
    } else {
      Alert.alert(
        "Reset Presentation Demo",
        "This will reset the EV verification and allow you to replay the upload, scanner, and lootbox reward reveal.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Reset Demo", style: "destructive", onPress: doReset },
        ]
      );
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel="Go back"
          activeOpacity={0.7}
        >
          <ArrowLeft size={19} color="#163D2A" />
        </TouchableOpacity>
        <View style={styles.navTitleContainer}>
          <Text style={styles.navEyebrow}>TOOLS  /  GREEN REWARDS</Text>
          <Text style={styles.navTitle}>Verify Sustainable Purchase</Text>
        </View>
        <View style={styles.navBadge}>
          <LockKeyhole size={14} color="#2EA86E" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        {/* Hero Section Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlowOrb} />
          <View style={styles.heroIconWrapper}>
            <Zap size={24} color="#F7C948" fill="#F7C948" />
          </View>
          <Text style={styles.heroHeading}>Turn proof into progress.</Text>
          <Text style={styles.heroDescription}>
            Verify your Electric Vehicle purchase document and unlock a one-time
            major Green Rewards pack with Karma Coins &amp; achievement.
          </Text>

          {/* Prototype disclaimer pill */}
          <View style={styles.prototypePill}>
            <ShieldCheck size={13} color="#BFF7D8" />
            <Text style={styles.prototypePillText}>
              SIMULATED VERIFICATION · MOCK PROVIDER
            </Text>
          </View>
        </View>

        {/* Phase: Upload & Ready */}
        {phase === "upload" && (
          <>
            <DocumentUploader
              file={pickedFile}
              onFileSelect={(file) => {
                setPickedFile(file);
                setVerificationError(null);
              }}
              onVerify={handleStartVerification}
              onClear={() => setPickedFile(null)}
            />
            {verificationError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Verification unavailable</Text>
                <Text style={styles.errorText}>{verificationError}</Text>
              </View>
            ) : null}
          </>
        )}

        {/* Phase: Scanning Laser Chamber */}
        {phase === "scanning" && (
          <VerificationScanner
            active={true}
            onComplete={handleScanComplete}
          />
        )}

        {/* Phase: Verified Certificate Card */}
        {phase === "verified" && (
          <View style={styles.certificateCard}>
            {/* Top Verified Header */}
            <View style={styles.certBadgeRow}>
              <View style={styles.certCheckCircle}>
                <CheckCircle2 size={24} color="#FFFFFF" />
              </View>
              <View style={styles.certStatusText}>
                <Text style={styles.certStatusEyebrow}>VERIFIED PURCHASE</Text>
                <Text style={styles.certStatusTitle}>{vehicleType}</Text>
              </View>
              <View style={styles.certRewardPill}>
                <Sparkles size={12} color="#F59E0B" />
                <Text style={styles.certRewardText}>
                  {rewardPoints > 0 ? `+${rewardPoints.toLocaleString()} Karma Coins` : "No new reward"}
                </Text>
              </View>
            </View>

            {/* Vehicle Details Table */}
            <View style={styles.certTable}>
              <View style={styles.certRow}>
                <View style={styles.certFieldLabelCol}>
                  <Car size={14} color="#2EA86E" />
                  <Text style={styles.certFieldLabel}>Vehicle</Text>
                </View>
                <Text style={styles.certFieldValue}>{vehicleMakeModel}</Text>
              </View>

              <View style={styles.certDivider} />

              <View style={styles.certRow}>
                <View style={styles.certFieldLabelCol}>
                  <Zap size={14} color="#F59E0B" />
                  <Text style={styles.certFieldLabel}>Fuel Type</Text>
                </View>
                <Text style={styles.certFieldValue}>{vehicleType}</Text>
              </View>

              <View style={styles.certDivider} />

              <View style={styles.certRow}>
                <View style={styles.certFieldLabelCol}>
                  <ShieldCheck size={14} color="#2EA86E" />
                  <Text style={styles.certFieldLabel}>Ownership</Text>
                </View>
                <Text style={[styles.certFieldValue, { color: "#2EA86E" }]}>
                  {ownership}
                </Text>
              </View>

              <View style={styles.certDivider} />

              <View style={styles.certRow}>
                <View style={styles.certFieldLabelCol}>
                  <FileCheck2 size={14} color="#799184" />
                  <Text style={styles.certFieldLabel}>Document</Text>
                </View>
                <Text
                  style={[styles.certFieldValue, { maxWidth: 160 }]}
                  numberOfLines={1}
                >
                  {documentName || "vehicle_registration_rc.pdf"}
                </Text>
              </View>

              <View style={styles.certDivider} />

              <View style={styles.certRow}>
                <View style={styles.certFieldLabelCol}>
                  <Award size={14} color="#8B5CF6" />
                  <Text style={styles.certFieldLabel}>Achievement</Text>
                </View>
                <Text style={[styles.certFieldValue, { color: "#8B5CF6" }]}>
                  ⚡ Electric Pioneer
                </Text>
              </View>
            </View>

            {/* Impact Record Notice */}
            <View style={styles.impactNotice}>
              <Info size={14} color="#2EA86E" />
              <Text style={styles.impactNoticeText}>
                {rewardPoints > 0
                  ? `Recorded on your personal Impact Timeline. +${rewardPoints.toLocaleString()} Karma Coins have been added to your balance.`
                  : "This purchase was already verified. No additional Karma Coins were added."}
              </Text>
            </View>

            {/* Claimed Action Button (Disabled) */}
            <View style={styles.claimedButton}>
              <CheckCircle2 size={18} color="#2EA86E" />
              <Text style={styles.claimedButtonText}>
                {rewardPoints > 0
                  ? `Reward Claimed (+${rewardPoints.toLocaleString()} Karma Coins)`
                  : "Already claimed · No new reward"}
              </Text>
            </View>

            {/* Presentation Demo Reset Button */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetDemo}
              disabled={isResetting}
              activeOpacity={0.8}
            >
              <RotateCcw size={15} color="#7A9082" />
              <Text style={styles.resetButtonText}>
                {isResetting ? "Resetting demo..." : "Reset Demo for Presentation"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Prototype Transparency Notice */}
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>
            Simulated document verification flow for hackathon prototype. Real
            DigiLocker / Vahan API integration will connect directly through the
            pluggable DocumentVerificationProvider interface.
          </Text>
        </View>
      </ScrollView>

      {/* Lootbox Reward Reveal Modal Overlay */}
      <LootboxReveal
        visible={phase === "lootbox"}
        rewardPoints={rewardPoints}
        baseBalance={verifiedBaseBalance ?? currentPoints ?? 0}
        onClaimComplete={handleLootboxClaimed}
        onDismiss={() => {
          claimReward();
          setPhase("verified");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4FAF6",
  },
  navBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.18)",
  },
  navTitleContainer: {
    flex: 1,
  },
  navEyebrow: {
    color: "#2EA86E",
    fontSize: 10,
    letterSpacing: 1.1,
    fontFamily: "IBMPlexMono_600SemiBold",
  },
  navTitle: {
    marginTop: 2,
    color: "#183222",
    fontSize: 18,
    fontFamily: "Nunito_800ExtraBold",
  },
  navBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(46,168,110,0.1)",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
    backgroundColor: "#0E2A1E",
    borderWidth: 1,
    borderColor: "rgba(95,234,172,0.35)",
    marginBottom: 16,
  },
  heroGlowOrb: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -40,
    top: -60,
    backgroundColor: "rgba(46,168,110,0.25)",
  },
  heroIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,201,72,0.15)",
    borderWidth: 1,
    borderColor: "rgba(247,201,72,0.35)",
  },
  heroHeading: {
    marginTop: 14,
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Nunito_800ExtraBold",
  },
  heroDescription: {
    marginTop: 6,
    color: "rgba(235,255,244,0.78)",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Nunito_400Regular",
  },
  errorCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFF4F2",
    borderWidth: 1,
    borderColor: "#F4B4A8",
  },
  errorTitle: {
    color: "#9D3024",
    fontSize: 13,
    fontFamily: "Nunito_800ExtraBold",
  },
  errorText: {
    marginTop: 4,
    color: "#8B4B42",
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Nunito_400Regular",
  },
  prototypePill: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(46,168,110,0.22)",
    borderWidth: 1,
    borderColor: "rgba(95,234,172,0.3)",
  },
  prototypePillText: {
    color: "#BFF7D8",
    fontSize: 9,
    letterSpacing: 0.7,
    fontFamily: "IBMPlexMono_600SemiBold",
  },
  certificateCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.25)",
    boxShadow: "0px 6px 20px rgba(17,71,42,0.08)",
    marginBottom: 16,
  },
  certBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  certCheckCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2EA86E",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 0px 14px rgba(46,168,110,0.45)",
  },
  certStatusText: {
    flex: 1,
  },
  certStatusEyebrow: {
    color: "#2EA86E",
    fontSize: 9,
    letterSpacing: 1.1,
    fontFamily: "IBMPlexMono_600SemiBold",
  },
  certStatusTitle: {
    marginTop: 2,
    color: "#183222",
    fontSize: 17,
    fontFamily: "Nunito_800ExtraBold",
  },
  certRewardPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  certRewardText: {
    color: "#92400E",
    fontSize: 12,
    fontFamily: "Nunito_800ExtraBold",
  },
  certTable: {
    backgroundColor: "#F8FCFA",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.12)",
    marginBottom: 14,
  },
  certRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  certFieldLabelCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  certFieldLabel: {
    color: "#5E7367",
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
  certFieldValue: {
    color: "#183222",
    fontSize: 13,
    fontFamily: "Nunito_800ExtraBold",
  },
  certDivider: {
    height: 1,
    backgroundColor: "rgba(46,168,110,0.1)",
    marginVertical: 6,
  },
  impactNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(46,168,110,0.08)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  impactNoticeText: {
    flex: 1,
    color: "#235C3E",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Nunito_600SemiBold",
  },
  claimedButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(46,168,110,0.12)",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.3)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  claimedButtonText: {
    color: "#163D2A",
    fontSize: 14,
    fontFamily: "Nunito_800ExtraBold",
  },
  resetButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  resetButtonText: {
    color: "#7A9082",
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
  disclaimerContainer: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  disclaimerText: {
    color: "#8BA093",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    fontFamily: "Nunito_400Regular",
  },
});
