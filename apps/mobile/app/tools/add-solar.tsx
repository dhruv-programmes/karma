import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, Plus, Sun, Zap, Sparkles } from "lucide-react-native";
import { BackButton } from "@/components/custom/back-button";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { SolarPanelHero } from "@/components/custom/solar-panel-hero";
import { LootboxReveal } from "@/components/custom/sustainable-verification/lootbox-reveal";
import { useMe, useSolarImpact } from "@/src/hooks/queries";
import { useSolarAssetsStore } from "@/src/store/solar-assets";

export default function AddSolarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const solar = useSolarImpact();
  const me = useMe();
  const solarPanels = useSolarAssetsStore((state) => state.panels);
  const selectedPanelId = useSolarAssetsStore((state) => state.selectedPanelId);
  const selectPanel = useSolarAssetsStore((state) => state.selectPanel);
  const addPanel = useSolarAssetsStore((state) => state.addPanel);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [size, setSize] = useState("3");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [showAddForm, setShowAddForm] = useState(solarPanels.length === 0);

  // Lootbox modal state for 1st solar system
  const [showLootbox, setShowLootbox] = useState(false);
  const [lootboxReward, setLootboxReward] = useState(1290);
  const [pendingPanel, setPendingPanel] = useState<{
    name: string;
    location: string;
    systemSizeKw: number;
  } | null>(null);

  async function connectDemo() {
    if (connecting || connected) return;
    setConnecting(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setConnecting(false);
    setConnected(true);
  }

  function handleAddSolar() {
    const normalizedSize = Math.min(50, Math.max(0.5, Number(size) || 3));
    const calculatedReward = Math.round(Math.min(1800, 1200 + normalizedSize * 30));
    const panelPayload = {
      name: name.trim() || `Solar System ${solarPanels.length + 1}`,
      location: location.trim() || "Home rooftop",
      systemSizeKw: normalizedSize,
    };

    // Unconditionally show the celebratory lootbox animation whenever a solar system is added!
    setLootboxReward(calculatedReward);
    setPendingPanel(panelPayload);
    setShowLootbox(true);
  }

  function handleLootboxClaimed() {
    if (pendingPanel) {
      addPanel(pendingPanel);
      setPendingPanel(null);
    }
    setShowLootbox(false);
    setName("");
    setLocation("");
    setSize("3");
    setShowAddForm(false);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 36,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <BackButton label="Tools" fallbackRoute="/(tabs)/tools" variant="circle" />

          {/* Heading */}
          <View style={styles.headingRow}>
            <View style={styles.icon}>
              <Sun size={24} color="#B7791F" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>SOLAR ASSETS</Text>
              <Text style={styles.title}>Rooftop Solar</Text>
              <Text style={styles.subtitle}>
                Add multiple rooftop systems, track clean generation & earn rewards.
              </Text>
            </View>
          </View>

          {/* Live Solar Flow Hero (if solar telemetry exists) */}
          {solar.data ? <SolarPanelHero data={solar.data} /> : null}

          {/* Simulated Inverter Connection */}
          <View style={styles.connectorCard}>
            <View
              style={[
                styles.connectorDot,
                connected && styles.connectorDotConnected,
              ]}
            />
            <View style={styles.connectorCopy}>
              <Text style={styles.connectorTitle}>Demo inverter telemetry</Text>
              <Text style={styles.connectorSubtitle}>
                {connected
                  ? "Live generation and grid export telemetry connected."
                  : "Connect simulated micro-inverters to preview live flows."}
              </Text>
            </View>
            <Button
              size="sm"
              variant={connected ? "secondary" : "default"}
              loading={connecting}
              disabled={connected}
              onPress={() => void connectDemo()}
            >
              {connected ? "Connected ✓" : "Connect API"}
            </Button>
          </View>

          {/* Multiple Solar Systems List (Inside the option) */}
          {solarPanels.length > 0 ? (
            <View style={styles.assetSection}>
              <View style={styles.assetSectionHeader}>
                <View>
                  <Text style={styles.assetEyebrow}>YOUR SOLAR SYSTEMS</Text>
                  <Text style={styles.assetTitle}>
                    {solarPanels.length} system{solarPanels.length === 1 ? "" : "s"} registered
                  </Text>
                </View>
                {!showAddForm ? (
                  <TouchableOpacity
                    style={styles.addSmallButton}
                    onPress={() => setShowAddForm(true)}
                  >
                    <Plus size={14} color="#167345" />
                    <Text style={styles.addSmallText}>Add system</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.panelsList}>
                {solarPanels.map((panel) => {
                  const isSelected = selectedPanelId === panel.id;
                  return (
                    <TouchableOpacity
                      key={panel.id}
                      style={[
                        styles.assetRow,
                        isSelected && styles.assetRowSelected,
                      ]}
                      onPress={() => selectPanel(panel.id)}
                      activeOpacity={0.78}
                    >
                      <View style={styles.assetIconSolar}>
                        <Sun size={18} color="#B7791F" />
                      </View>
                      <View style={styles.assetCopy}>
                        <Text style={styles.assetName} numberOfLines={1}>
                          {panel.name}
                        </Text>
                        <Text style={styles.assetDetail}>
                          {panel.location} · {panel.systemSizeKw} kW · +{panel.rewardPoints.toLocaleString()} coins
                        </Text>
                      </View>
                      {isSelected ? (
                        <CheckCircle2 size={18} color="#2EA86E" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}

              </View>
            </View>
          ) : null}

          {/* Add Solar System Form */}
          {showAddForm || solarPanels.length === 0 ? (
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>
                  {solarPanels.length === 0
                    ? "Add your first solar system"
                    : "Add another solar system"}
                </Text>
                {solarPanels.length > 0 ? (
                  <TouchableOpacity onPress={() => setShowAddForm(false)}>
                    <Text style={styles.formCancelText}>Cancel</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={styles.label}>System Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Home rooftop, Farmhouse solar"
                placeholderTextColor="#8AA093"
                style={styles.input}
              />

              <Text style={styles.label}>Location / City</Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Bengaluru, Pune, Delhi"
                placeholderTextColor="#8AA093"
                style={styles.input}
              />

              <Text style={styles.label}>System Size (kW)</Text>
              <TextInput
                value={size}
                onChangeText={setSize}
                keyboardType="decimal-pad"
                placeholder="3.0"
                placeholderTextColor="#8AA093"
                style={styles.input}
              />

              <View style={styles.rewardNote}>
                <Zap size={16} color="#B45309" />
                <Text style={styles.rewardText}>
                  Earn up to 1,800 Karma Coins (1,200 base + 30/kW). 1st solar unlocks the lootbox reward!
                </Text>
              </View>

              <Button onPress={handleAddSolar}>
                {solarPanels.length === 0
                  ? "Add solar & unlock lootbox"
                  : "Add solar system"}
              </Button>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Lootbox Celebration for Solar System */}
      <LootboxReveal
        visible={showLootbox}
        rewardPoints={lootboxReward}
        baseBalance={me.data?.impact_points ?? 0}
        onClaimComplete={handleLootboxClaimed}
        onDismiss={handleLootboxClaimed}
        title="Solar Rooftop Verified"
        subtitle="Tap the solar vault below to break the seal and claim your clean energy reward"
        verifiedBadgeText="SOLAR ROOFTOP VERIFIED"
        achievementTitle="☀️ Solar Champion"
        achievementDetail="Clean energy generator connected to your personal grid"
        rewardMathLabel="+ Solar Rooftop Reward"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FAF6" },
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFF5D9",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { color: "#2EA86E", fontSize: 10, letterSpacing: 1.2, fontFamily: "Nunito_800ExtraBold" },
  title: { color: "#0E2A1E", fontSize: 24, fontFamily: "Nunito_800ExtraBold", marginTop: 2 },
  subtitle: { color: "#648071", fontSize: 13, lineHeight: 18, fontFamily: "Nunito_400Regular", marginTop: 2 },
  connectorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0E2A1E",
    borderRadius: 18,
    padding: 14,
  },
  connectorDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#F7C948" },
  connectorDotConnected: { backgroundColor: "#7DE2A7" },
  connectorCopy: { flex: 1, minWidth: 0, gap: 2 },
  connectorTitle: { color: "#FFFFFF", fontSize: 13, fontFamily: "Nunito_700Bold" },
  connectorSubtitle: { color: "#B9D1C3", fontSize: 11, lineHeight: 15, fontFamily: "Nunito_400Regular" },

  assetSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D8E9DF",
    padding: 16,
    gap: 12,
  },
  assetSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  assetEyebrow: { color: "#6B8B78", fontSize: 10, letterSpacing: 1, fontFamily: "Nunito_800ExtraBold" },
  assetTitle: { color: "#0E2A1E", fontSize: 15, fontFamily: "Nunito_800ExtraBold", marginTop: 2 },
  addSmallButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF8F0",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  addSmallText: { color: "#167345", fontSize: 12, fontFamily: "Nunito_700Bold" },
  panelsList: { gap: 8 },
  assetRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5F0E9",
    backgroundColor: "#FFFFFF",
  },
  assetRowSelected: { borderColor: "#2EA86E", backgroundColor: "#F2FBF5" },
  assetIconSolar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFF5D9",
    alignItems: "center",
    justifyContent: "center",
  },
  assetCopy: { flex: 1, minWidth: 0 },
  assetName: { color: "#153523", fontSize: 14, fontFamily: "Nunito_700Bold" },
  assetDetail: { color: "#718A7B", fontSize: 11, marginTop: 2, fontFamily: "Nunito_500Medium" },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: "#D8E9DF",
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0E2A1E",
  },
  formCancelText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#7A9082",
  },
  label: {
    color: "#557362",
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  input: {
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#CFE3D6",
    paddingHorizontal: 13,
    color: "#0E2A1E",
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    backgroundColor: "#F8FCF9",
  },
  rewardNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF7E3",
    borderRadius: 12,
    padding: 11,
    marginVertical: 4,
  },
  rewardText: { flex: 1, color: "#855D11", fontSize: 11.5, lineHeight: 16, fontFamily: "Nunito_500Medium" },
  solarReplayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    height: 44,
    marginTop: 4,
  },
  solarReplayBtnText: {
    fontSize: 13.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#B45309",
  },
});
