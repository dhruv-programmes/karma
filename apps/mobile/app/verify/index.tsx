import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Camera,
  Car,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  History,
  Info,
  Layers,
  ShieldCheck,
  Sun,
  TrendingUp,
  Zap,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import {
  useSustainabilityAssets,
  useSustainabilityCredit,
} from "@/src/hooks/queries";

export default function UniversalVerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: credit, isLoading: loadingCredit } = useSustainabilityCredit();
  const { data: assets, isLoading: loadingAssets } = useSustainabilityAssets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/tools" as any);
    }
  };

  const handleLaunchCamera = (hint?: string) => {
    router.push({
      pathname: "/verify/capture" as any,
      params: hint ? { hint } : undefined,
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#064E3B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerEyebrow}>ECOPROOF ENGINE</Text>
          <Text style={styles.headerTitle}>Universal Verification</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Sustainability Credit (SC) Score Card */}
        <Animated.View entering={FadeInDown.duration(320)}>
          <View style={styles.creditCard}>
            <View style={styles.creditTopRow}>
              <View>
                <Text style={styles.creditLabel}>SUSTAINABILITY CREDIT (SC)</Text>
                <View style={styles.creditScoreRow}>
                  <Text style={styles.creditScore}>
                    {credit?.credit_score ?? 50}
                  </Text>
                  <Text style={styles.creditMax}>/100</Text>
                  <View style={styles.trendBadge}>
                    <TrendingUp size={14} color="#059669" />
                    <Text style={styles.trendText}>
                      {credit?.trend ?? "STABLE"}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.shieldBox}>
                <ShieldCheck size={30} color="#059669" />
              </View>
            </View>

            <View style={styles.creditStatsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statValue}>
                  {credit?.total_verified_generation_kwh
                    ? `${credit.total_verified_generation_kwh} kWh`
                    : "0 kWh"}
                </Text>
                <Text style={styles.statLabel}>Clean Gen</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statValue}>
                  {credit?.total_verified_adoption_count ?? 0}
                </Text>
                <Text style={styles.statLabel}>Verified Assets</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statValue}>
                  {credit?.consistency_factor
                    ? `${credit.consistency_factor}x`
                    : "1.0x"}
                </Text>
                <Text style={styles.statLabel}>Consistency</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Primary Universal Camera Hero */}
        <Animated.View entering={FadeInDown.delay(100).duration(320)}>
          <TouchableOpacity
            style={styles.heroCard}
            onPress={() => handleLaunchCamera()}
            activeOpacity={0.88}
          >
            <View style={styles.heroGlow} />
            <View style={styles.heroContent}>
              <View style={styles.heroIconBox}>
                <Camera size={28} color="#064E3B" strokeWidth={2.2} />
              </View>
              <Text style={styles.heroTitle}>Universal Camera Scanner</Text>
              <Text style={styles.heroDesc}>
                Point at any electricity bill, solar inverter, EV RC document,
                charging session, or green appliance. Local AI extracts facts and
                routes automatically.
              </Text>

              <View style={styles.heroButton}>
                <Camera size={18} color="#FFFFFF" />
                <Text style={styles.heroButtonText}>Launch Camera</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Category Shortcuts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Direct Evidence Categories</Text>
          <Text style={styles.sectionSubtitle}>
            Specific shortcuts with tailored extraction guides
          </Text>
        </View>

        <View style={styles.shortcutsGrid}>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => router.push("/tools/verify-sustainable-purchase" as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: "#ECFDF5" }]}>
              <Car size={22} color="#059669" />
            </View>
            <View style={styles.shortcutInfo}>
              <Text style={styles.shortcutTitle}>Electric Vehicle</Text>
              <Text style={styles.shortcutDesc}>
                RC Document · Charging bills · 500 pts
              </Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => handleLaunchCamera("solar_bill")}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: "#FFFBEB" }]}>
              <Sun size={22} color="#D97706" />
            </View>
            <View style={styles.shortcutInfo}>
              <Text style={styles.shortcutTitle}>Solar PV Generation</Text>
              <Text style={styles.shortcutDesc}>
                Net-metering bills · Inverter meters · 1 pt/kWh
              </Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => handleLaunchCamera("appliance_energy_label")}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: "#EFF6FF" }]}>
              <Zap size={22} color="#2563EB" />
            </View>
            <View style={styles.shortcutInfo}>
              <Text style={styles.shortcutTitle}>Smart Appliances</Text>
              <Text style={styles.shortcutDesc}>
                BEE 5-star label · Purchase invoice
              </Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Verified Assets Registry */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Registered Assets</Text>
          <Text style={styles.sectionSubtitle}>
            Assets verified and tracked in your longitudinal ledger
          </Text>
        </View>

        {loadingAssets ? (
          <ActivityIndicator color="#059669" style={{ marginVertical: 20 }} />
        ) : assets && assets.length > 0 ? (
          <View style={styles.assetsList}>
            {assets.map((asset) => (
              <View key={asset.id} style={styles.assetCard}>
                <View style={styles.assetHeader}>
                  <View style={styles.assetTitleRow}>
                    {asset.asset_type === "electric_vehicle" ? (
                      <Car size={18} color="#059669" />
                    ) : asset.asset_type === "solar_pv" ? (
                      <Sun size={18} color="#D97706" />
                    ) : (
                      <Zap size={18} color="#2563EB" />
                    )}
                    <Text style={styles.assetType}>
                      {asset.asset_type.replace(/_/g, " ").toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.verifiedTag}>
                    <CheckCircle2 size={12} color="#059669" />
                    <Text style={styles.verifiedTagText}>VERIFIED</Text>
                  </View>
                </View>
                <Text style={styles.assetIdentifier}>
                  {asset.identifier || "Registered Asset"}
                </Text>
                {asset.capacity_kw ? (
                  <Text style={styles.assetCapacity}>
                    Capacity: {asset.capacity_kw} kW
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Layers size={32} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Verified Assets Yet</Text>
            <Text style={styles.emptyDesc}>
              Submit your first solar bill or EV registration to unlock adoption
              points and build your Sustainability Credit score.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4FAF6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#F4FAF6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E6F4EA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerEyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
    letterSpacing: 1.2,
    color: "#059669",
  },
  headerTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22,
    color: "#064E3B",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  creditCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  creditTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  creditLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
    letterSpacing: 1.1,
    color: "#059669",
  },
  creditScoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
    gap: 4,
  },
  creditScore: {
    fontFamily: "Nunito_900Black",
    fontSize: 38,
    color: "#064E3B",
  },
  creditMax: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    color: "#9CA3AF",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  trendText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
    color: "#059669",
  },
  shieldBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#E6F4EA",
    justifyContent: "center",
    alignItems: "center",
  },
  creditStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
    color: "#1F2937",
  },
  statLabel: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
  },
  heroCard: {
    backgroundColor: "#064E3B",
    borderRadius: 22,
    padding: 22,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(16, 185, 129, 0.25)",
  },
  heroContent: {
    position: "relative",
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#A7F3D0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  heroTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  heroDesc: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#D1FAE5",
    marginBottom: 18,
  },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
  },
  heroButtonText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 17,
    color: "#1F2937",
  },
  sectionSubtitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  shortcutsGrid: {
    gap: 10,
    marginBottom: 24,
  },
  shortcutCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  shortcutIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  shortcutInfo: {
    flex: 1,
  },
  shortcutTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#111827",
  },
  shortcutDesc: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  assetsList: {
    gap: 10,
  },
  assetCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  assetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  assetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  assetType: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
    color: "#374151",
    letterSpacing: 0.6,
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  verifiedTagText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    color: "#059669",
  },
  assetIdentifier: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#111827",
  },
  assetCapacity: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  emptyTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#374151",
    marginTop: 10,
  },
  emptyDesc: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
});
