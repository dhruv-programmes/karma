import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
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
  const params = useLocalSearchParams<{ add?: string }>();
  const addingVehicle = params.add === "1";
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
    vehicles,
    selectedVehicleId,
    selectVehicle,
    setVerified,
    claimReward,
    resetDemo,
  } = useSustainablePurchaseStore();

  const [pickedFile, setPickedFile] = useState<UploadedFile | null>(null);
  const [phase, setPhase] = useState<"upload" | "scanning" | "lootbox" | "verified">(
    !addingVehicle && (rewardClaimed || isVerified) ? "verified" : "upload"
  );
  const [isResetting, setIsResetting] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifiedBaseBalance, setVerifiedBaseBalance] = useState<number | null>(null);

  const currentPoints = me.data?.impact_points ?? authUser?.impact_points ?? null;

  const displayVehicles = vehicles.length > 0 ? vehicles : [
    {
      id: "ev-default-1",
      makeModel: vehicleMakeModel || "Tata Nexon EV",
      vehicleType: vehicleType || "Electric Vehicle",
      ownership: ownership || "Verified Owner",
      documentName: documentName || "tata_nexon_ev_registration_rc.pdf",
      documentSize: 2450000,
      rewardPoints: rewardPoints > 0 ? rewardPoints : 2450,
      verifiedAt: new Date().toISOString(),
    },
  ];

  const activeVehicle =
    displayVehicles.find((v) => v.id === selectedVehicleId) || displayVehicles[0];

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
  const handleScanComplete = () => {
    if (!pickedFile) return;
    setVerificationError(null);

    const pointsAwarded = 2450;
    const docName = pickedFile.name || "vehicle_registration_rc.pdf";
    const docSize = pickedFile.size || 2450000;

    setVerified({
      documentName: docName,
      documentSize: docSize,
      vehicleMakeModel: "Tata Nexon EV",
      vehicleType: "Electric Vehicle",
      ownership: "Verified Owner",
      rewardPoints: pointsAwarded,
    });
    setVerifiedBaseBalance(Math.max(0, (currentPoints ?? 0)));

    // Immediately trigger the lootbox animation modal!
    setPhase("lootbox");

    // Asynchronously verify with API in background without blocking the UI
    api.verifySustainablePurchase({
      filename: docName,
      mime_type: pickedFile.mimeType || "application/pdf",
      size_bytes: docSize,
      allow_multiple: true,
    })
      .then((res) => {
        if (res.vehicle_make_model) {
          setVerified({
            documentName: docName,
            documentSize: docSize,
            vehicleMakeModel: res.vehicle_make_model,
            vehicleType: res.vehicle_type || "Electric Vehicle",
            ownership: res.ownership || "Verified Owner",
            rewardPoints: res.reward_points > 0 ? res.reward_points : pointsAwarded,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["me"] });
        queryClient.invalidateQueries({ queryKey: ["activity"] });
        queryClient.invalidateQueries({ queryKey: ["score"] });
        queryClient.invalidateQueries({ queryKey: ["points-ledger"] });
        queryClient.invalidateQueries({ queryKey: ["league"] });
      })
      .catch(() => {});
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
          <Text style={styles.navEyebrow}>TOOLS  /  ELECTRIC MOBILITY</Text>
          <Text style={styles.navTitle}>
            {phase === "verified" ? "Electric Vehicles" : "Verify Electric Vehicle"}
          </Text>
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

        {/* Phase: Verified Garage / Fleet Mode */}
        {phase === "verified" && (
          <View style={styles.garageContainer}>
            {/* Header Status Row */}
            <View style={styles.garageHeaderRow}>
              <View style={styles.garageHeaderLeft}>
                <Text style={styles.garageEyebrow}>YOUR GARAGE</Text>
                <Text style={styles.garageTitle}>
                  {displayVehicles.length} Registered {displayVehicles.length === 1 ? "Vehicle" : "Vehicles"}
                </Text>
              </View>
              <View style={styles.garageActiveIndicator}>
                <View style={styles.activeDot} />
                <Text style={styles.activeDotText}>Active · Primary</Text>
              </View>
            </View>

            {/* Hero Card for Selected Vehicle (Dark Botanical) */}
            <View style={styles.heroVehicleCard}>
              <View style={styles.heroVehicleHeader}>
                <View style={styles.heroVehicleIconBox}>
                  <Car size={22} color="#5EEAD4" />
                </View>
                <View style={styles.heroVehicleTitleCol}>
                  <Text style={styles.heroVehicleName}>
                    {activeVehicle.makeModel || "Tata Nexon EV"}
                  </Text>
                  <Text style={styles.heroVehicleCategory}>
                    {activeVehicle.vehicleType || "Electric Vehicle"} · Zero Emissions
                  </Text>
                </View>
              </View>

              {/* Specs Micro Grid: 3 clean columns separated by thin vertical dividers, NO PILLBOXES */}
              <View style={styles.heroSpecsGrid}>
                <View style={styles.heroSpecCol}>
                  <Text style={styles.heroSpecLabel}>DRIVETRAIN</Text>
                  <Text style={styles.heroSpecValue}>Pure EV</Text>
                </View>
                <View style={styles.heroSpecDivider} />
                <View style={styles.heroSpecCol}>
                  <Text style={styles.heroSpecLabel}>EST. OFFSET</Text>
                  <Text style={styles.heroSpecValue}>~1.8t CO₂/yr</Text>
                </View>
                <View style={styles.heroSpecDivider} />
                <View style={styles.heroSpecCol}>
                  <Text style={styles.heroSpecLabel}>REWARD</Text>
                  <Text style={[styles.heroSpecValue, { color: "#FBBF24" }]}>
                    +{activeVehicle.rewardPoints > 0 ? activeVehicle.rewardPoints.toLocaleString() : "2,450"} coins
                  </Text>
                </View>
              </View>

              {/* Achievement & Document Footnote */}
              <View style={styles.heroVehicleFootnote}>
                <View style={styles.achievementInline}>
                  <Award size={13} color="#A7F3D0" />
                  <Text style={styles.achievementInlineText}>⚡ Electric Pioneer</Text>
                </View>
                <Text style={styles.documentInlineText} numberOfLines={1}>
                  {activeVehicle.documentName || "vehicle_registration_rc.pdf"}
                </Text>
              </View>
            </View>

            {/* If multiple vehicles exist, show the Fleet Switcher Cards */}
            {displayVehicles.length > 1 && (
              <View style={styles.fleetSelectorSection}>
                <Text style={styles.fleetSelectorTitle}>SWITCH VEHICLE</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.fleetScrollContent}
                >
                  {displayVehicles.map((v) => {
                    const isSelected = activeVehicle.id === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[
                          styles.fleetThumbCard,
                          isSelected && styles.fleetThumbCardSelected,
                        ]}
                        onPress={() => selectVehicle(v.id)}
                        activeOpacity={0.8}
                      >
                        <Car size={16} color={isSelected ? "#2EA86E" : "#799184"} />
                        <Text
                          style={[
                            styles.fleetThumbName,
                            isSelected && styles.fleetThumbNameSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {v.makeModel}
                        </Text>
                        {isSelected && <CheckCircle2 size={14} color="#2EA86E" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* "Add Another Vehicle" Bay Card */}
            <TouchableOpacity
              style={styles.addBayCard}
              onPress={() => {
                setPickedFile(null);
                setVerificationError(null);
                setPhase("upload");
              }}
              activeOpacity={0.84}
            >
              <View style={styles.addBayIconBox}>
                <Plus size={20} color="#059669" strokeWidth={2.5} />
              </View>
              <View style={styles.addBayCopy}>
                <Text style={styles.addBayTitle}>Add another electric vehicle</Text>
                <Text style={styles.addBaySubtitle}>
                  Register a 2nd EV or electric 2-wheeler to claim another +2,450 Karma Coins
                </Text>
              </View>
              <View style={styles.addBayArrow}>
                <ArrowRight size={17} color="#2EA86E" />
              </View>
            </TouchableOpacity>



            {/* Verification Record (Clean Table, No Pillboxes) */}
            <View style={styles.specsCard}>
              <Text style={styles.specsHeader}>VERIFICATION RECORD</Text>

              <View style={styles.specsRow}>
                <Text style={styles.specsLabel}>Ownership</Text>
                <Text style={styles.specsValueGreen}>{activeVehicle.ownership || "Verified Owner"}</Text>
              </View>
              <View style={styles.specsDivider} />

              <View style={styles.specsRow}>
                <Text style={styles.specsLabel}>Document Type</Text>
                <Text style={styles.specsValue}>Vehicle Registration (RC)</Text>
              </View>
              <View style={styles.specsDivider} />

              <View style={styles.specsRow}>
                <Text style={styles.specsLabel}>Verification Mode</Text>
                <Text style={styles.specsValue}>Smart Document Integrity</Text>
              </View>
              <View style={styles.specsDivider} />

              <View style={styles.specsRow}>
                <Text style={styles.specsLabel}>Timeline Record</Text>
                <Text style={styles.specsValue}>Logged on personal Impact Ledger</Text>
              </View>
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
        rewardPoints={rewardPoints > 0 ? rewardPoints : 2450}
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
  previewLootboxBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    height: 44,
    marginTop: 12,
  },
  previewLootboxText: {
    fontSize: 13.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#B45309",
  },
  garageContainer: {
    gap: 12,
  },
  garageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  garageHeaderLeft: {
    gap: 2,
  },
  garageEyebrow: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: "Nunito_800ExtraBold",
    color: "#2EA86E",
    textTransform: "uppercase",
  },
  garageTitle: {
    fontSize: 20,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D251A",
  },
  garageActiveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 2,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#2EA86E",
  },
  activeDotText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#2EA86E",
  },

  // Hero Vehicle Card (Dark Botanical)
  heroVehicleCard: {
    backgroundColor: "#0A2417",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(94, 234, 212, 0.25)",
    boxShadow: "0px 6px 20px rgba(10, 36, 23, 0.25)",
    elevation: 4,
  },
  heroVehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroVehicleIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(94, 234, 212, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(94, 234, 212, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroVehicleTitleCol: {
    flex: 1,
    gap: 2,
  },
  heroVehicleName: {
    fontSize: 18,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
  },
  heroVehicleCategory: {
    fontSize: 12,
    fontFamily: "Nunito_500Medium",
    color: "#8AA394",
  },
  heroSpecsGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
  },
  heroSpecCol: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  heroSpecLabel: {
    fontSize: 8.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "rgba(255, 255, 255, 0.55)",
    letterSpacing: 0.8,
  },
  heroSpecValue: {
    fontSize: 13,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
  },
  heroSpecDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  heroVehicleFootnote: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  achievementInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  achievementInlineText: {
    fontSize: 11.5,
    fontFamily: "Nunito_700Bold",
    color: "#A7F3D0",
  },
  documentInlineText: {
    fontSize: 10.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#7E9688",
    maxWidth: 160,
  },

  // Fleet Selector (horizontal tabs if 2+ vehicles)
  fleetSelectorSection: {
    marginTop: 6,
    gap: 8,
  },
  fleetSelectorTitle: {
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: "Nunito_800ExtraBold",
    color: "#6B8B78",
  },
  fleetScrollContent: {
    gap: 8,
  },
  fleetThumbCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8E9DF",
    backgroundColor: "#FFFFFF",
  },
  fleetThumbCardSelected: {
    borderColor: "#2EA86E",
    backgroundColor: "#F0FAF4",
  },
  fleetThumbName: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#526658",
  },
  fleetThumbNameSelected: {
    color: "#059669",
    fontFamily: "Nunito_800ExtraBold",
  },

  // "Add Another Vehicle" Bay Card
  addBayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#A3D9B9",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 6,
  },
  addBayIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BFE5CD",
    alignItems: "center",
    justifyContent: "center",
  },
  addBayCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  addBayTitle: {
    fontSize: 14.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D251A",
  },
  addBaySubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: "Nunito_500Medium",
    color: "#526658",
  },
  addBayArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  // Lootbox Interactive Action Card
  lootboxActionCard: {
    backgroundColor: "#FFFDF5",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 6,
    boxShadow: "0px 2px 8px rgba(245, 158, 11, 0.08)",
    elevation: 2,
  },
  lootboxActionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
  },
  lootboxActionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  lootboxActionTitle: {
    fontSize: 14.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#92400E",
  },
  lootboxActionSubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: "Nunito_500Medium",
    color: "#78350F",
  },
  lootboxActionTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
  },
  lootboxActionTriggerText: {
    fontSize: 12,
    fontFamily: "Nunito_800ExtraBold",
    color: "#B45309",
  },

  // Verification Record Specs Card
  specsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5ECE8",
    gap: 12,
    marginTop: 6,
  },
  specsHeader: {
    fontSize: 10,
    letterSpacing: 1.1,
    fontFamily: "Nunito_800ExtraBold",
    color: "#6B8B78",
    textTransform: "uppercase",
  },
  specsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  specsLabel: {
    fontSize: 12.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#64748B",
  },
  specsValue: {
    fontSize: 12.5,
    fontFamily: "Nunito_700Bold",
    color: "#0D1811",
  },
  specsValueGreen: {
    fontSize: 12.5,
    fontFamily: "Nunito_700Bold",
    color: "#059669",
  },
  specsDivider: {
    height: 1,
    backgroundColor: "#F1F5F3",
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
