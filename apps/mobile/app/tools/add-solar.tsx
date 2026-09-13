import React, { useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sun, Zap } from "lucide-react-native";
import { BackButton } from "@/components/custom/back-button";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { SolarPanelHero } from "@/components/custom/solar-panel-hero";
import { useSolarImpact } from "@/src/hooks/queries";
import { useSolarAssetsStore } from "@/src/store/solar-assets";

export default function AddSolarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const solar = useSolarImpact();
  const addPanel = useSolarAssetsStore((state) => state.addPanel);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [size, setSize] = useState("3");

  function save() {
    addPanel({ name, location, systemSizeKw: Number(size) });
    router.back();
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 36 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <BackButton label="Tools" fallbackRoute="/(tabs)/tools" variant="circle" />
        <View style={styles.headingRow}>
          <View style={styles.icon}><Sun size={22} color="#F7C948" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>SOLAR INTELLIGENCE</Text>
            <Text style={styles.title}>Add solar system</Text>
            <Text style={styles.subtitle}>Track rooftop generation, savings, and higher-value solar rewards.</Text>
          </View>
        </View>

        {solar.data ? <SolarPanelHero data={solar.data} /> : null}

        <View style={styles.formCard}>
          <Text style={styles.label}>Panel name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. Home rooftop" placeholderTextColor="#8AA093" style={styles.input} />
          <Text style={styles.label}>Location</Text>
          <TextInput value={location} onChangeText={setLocation} placeholder="e.g. Bengaluru" placeholderTextColor="#8AA093" style={styles.input} />
          <Text style={styles.label}>System size (kW)</Text>
          <TextInput value={size} onChangeText={setSize} keyboardType="decimal-pad" style={styles.input} />
          <View style={styles.rewardNote}><Zap size={16} color="#B45309" /><Text style={styles.rewardText}>Solar rewards use a bounded formula: 1,200 base coins + 30 per kW, capped at 1,800.</Text></View>
          <Button onPress={save}>Add solar system</Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4FAF6" },
  content: { paddingHorizontal: 20, gap: 16 },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#FFF4D5", alignItems: "center", justifyContent: "center" },
  eyebrow: { color: "#2EA86E", fontSize: 10, letterSpacing: 1.2, fontWeight: "800" },
  title: { color: "#0E2A1E", fontSize: 25, fontWeight: "800", marginTop: 2 },
  subtitle: { color: "#648071", fontSize: 13, lineHeight: 18, marginTop: 3 },
  formCard: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18, gap: 9, borderWidth: 1, borderColor: "#D8E9DF" },
  label: { color: "#557362", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4 },
  input: { height: 46, borderRadius: 13, borderWidth: 1, borderColor: "#CFE3D6", paddingHorizontal: 13, color: "#0E2A1E", fontSize: 15, backgroundColor: "#F8FCF9" },
  rewardNote: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF7E3", borderRadius: 12, padding: 11, marginVertical: 6 },
  rewardText: { flex: 1, color: "#855D11", fontSize: 12, lineHeight: 16 },
});
