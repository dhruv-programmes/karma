import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { BatteryCharging, Check, CircleDollarSign, Gauge, Leaf, Lightbulb, Sun, Zap } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { SolarPanelHero } from "@/components/custom/solar-panel-hero";
import type { SolarImpactResponse, SolarRecommendationStatus } from "@/src/types/api";
import { useSolarRecommendationActions } from "@/src/hooks/queries";

const GREEN = "#2EA86E";
const GOLD = "#F4B942";
const BLUE = "#3D8BC9";
const DEEP_GREEN = "#0D1811";
const SCORE_MINT = "#8DE6B5";

function readableScoreLabel(label: string) {
  const normalized = label.trim().toLowerCase().replace(/[-_]+/g, " ");
  const labels: Record<string, string> = {
    self_consumption: "Self-consumption",
    "self consumption": "Self-consumption",
    smart_load_shifting: "Smart load shifting",
    "smart load shifting": "Smart load shifting",
    solar_ev_charging: "Solar EV charging",
    "solar ev charging": "Solar EV charging",
    peak_grid_avoidance: "Peak-grid avoidance",
    "peak grid avoidance": "Peak-grid avoidance",
    consistency: "Consistency",
  };
  return labels[normalized] ?? label.replace(/[-_]+/g, " ");
}

function scoreContext(score: number) {
  if (score >= 80) {
    return {
      label: "Excellent momentum",
      message: "Your home is making the most of its solar generation.",
    };
  }
  if (score >= 60) {
    return {
      label: "Strong foundation",
      message: "A few smart shifts can help you keep more solar at home.",
    };
  }
  if (score >= 40) {
    return {
      label: "Good foundation",
      message: "You are building useful solar habits. Keep shifting flexible loads.",
    };
  }
  return {
    label: "Getting started",
    message: "Small timing changes can quickly improve how you use your solar energy.",
  };
}

function Metric({ label, value, detail, tone = "primary" }: { label: string; value: string; detail?: string; tone?: "primary" | "info" | "warning" }) {
  return (
    <View className="flex-1 min-w-[46%] rounded-2xl bg-muted p-3">
      <Text size="xs" className="text-muted-foreground">{label}</Text>
      <Text size="xl" bold className={tone === "warning" ? "text-warning" : tone === "info" ? "text-info" : "text-primary"}>{value}</Text>
      {detail ? <Text size="2xs" className="text-muted-foreground">{detail}</Text> : null}
    </View>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; title: string; subtitle?: string }) {
  return (
    <Box className="flex-row items-center gap-2">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-secondary"><Icon size={18} color={GREEN} strokeWidth={2} /></View>
      <Box className="flex-1">
        <Text bold>{title}</Text>
        {subtitle ? <Text size="xs" className="text-muted-foreground">{subtitle}</Text> : null}
      </Box>
    </Box>
  );
}

function SolarScore({ data }: { data: SolarImpactResponse }) {
  const score = Math.max(0, Math.min(100, Math.round(data.solarScore)));
  const context = scoreContext(score);

  return (
    <View className="overflow-hidden rounded-3xl p-5" style={{ backgroundColor: DEEP_GREEN, borderColor: "#234F36", borderWidth: 1 }}>
      <Box className="flex-row items-center justify-between">
        <Box className="flex-row items-center gap-2">
          <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: "#1D5B3A" }}>
            <Gauge size={20} color={SCORE_MINT} strokeWidth={2.3} />
          </View>
          <Box>
            <Text bold style={{ color: "#FFFFFF" }}>Solar Score</Text>
            <Text size="2xs" style={{ color: "#A7C6B2" }}>How effectively your home uses solar</Text>
          </Box>
        </Box>
        <Text size="2xs" bold style={{ color: SCORE_MINT }}>TODAY</Text>
      </Box>

      <Box className="mt-5 flex-row items-center gap-4">
        <View className="h-[116px] w-[116px] items-center justify-center rounded-full" style={{ borderColor: "#2EA86E", borderWidth: 7, backgroundColor: "#12271A" }}>
          <Text size="5xl" bold style={{ color: "#FFFFFF", lineHeight: 58 }}>{score}</Text>
          <Text size="2xs" style={{ color: "#A7C6B2" }}>out of 100</Text>
        </View>
        <Box className="flex-1 gap-1">
          <Text size="lg" bold style={{ color: SCORE_MINT }}>{context.label}</Text>
          <Text size="xs" style={{ color: "#D4E7DA", lineHeight: 18 }}>{context.message}</Text>
        </Box>
      </Box>

      <Box className="mt-5 gap-2">
        <Box className="flex-row items-center justify-between">
          <Text size="xs" style={{ color: "#A7C6B2" }}>Overall performance</Text>
          <Text size="xs" bold style={{ color: "#FFFFFF" }}>{score}%</Text>
        </Box>
        <View className="h-3 overflow-hidden rounded-full" style={{ backgroundColor: "#234632" }}>
          <View className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: SCORE_MINT }} />
        </View>
        <Box className="flex-row justify-between">
          <Text size="2xs" style={{ color: "#789C83" }}>Needs attention</Text>
          <Text size="2xs" style={{ color: "#789C83" }}>Excellent</Text>
        </Box>
      </Box>

      <Box className="mt-5 flex-row flex-wrap gap-2">
        {data.scoreBreakdown.map((item) => (
          <View key={item.label} className="min-w-[46%] flex-1 rounded-2xl p-3" style={{ backgroundColor: "#173523", borderColor: "#28583C", borderWidth: 1 }}>
            <Text size="2xs" style={{ color: "#A7C6B2" }}>{readableScoreLabel(item.label)}</Text>
            <Box className="mt-1 flex-row items-baseline justify-between gap-2">
              <Text size="lg" bold style={{ color: "#FFFFFF" }}>{Math.round(item.value)}</Text>
              <Text size="2xs" style={{ color: "#8BC9A3" }}>/ 100</Text>
            </Box>
            <View className="mt-2 h-1 overflow-hidden rounded-full" style={{ backgroundColor: "#28583C" }}>
              <View className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, item.value))}%`, backgroundColor: GREEN }} />
            </View>
          </View>
        ))}
      </Box>

      <Text size="2xs" className="mt-4" style={{ color: "#789C83" }}>Your score combines solar usage, load timing, grid independence, and consistency.</Text>
    </View>
  );
}

function EnergyFlow({ data }: { data: SolarImpactResponse }) {
  const live = data.live;
  return (
    <Card variant="soft" className="gap-4">
      <SectionTitle icon={Zap} title="Live energy flow" subtitle="Where your energy is going right now" />
      <Box className="flex-row items-center justify-between">
        <Box className="items-center"><View className="h-12 w-12 items-center justify-center rounded-full bg-warning/20"><Sun size={24} color={GOLD} /></View><Text size="xs" bold className="mt-1">Solar</Text><Text size="xs" className="text-muted-foreground">{live.solarKw.toFixed(1)} kW</Text></Box>
        <Text size="lg" className="text-primary">→</Text>
        <Box className="items-center"><View className="h-12 w-12 items-center justify-center rounded-full bg-secondary"><Leaf size={24} color={GREEN} /></View><Text size="xs" bold className="mt-1">Home</Text><Text size="xs" className="text-muted-foreground">{live.homeKw.toFixed(1)} kW</Text></Box>
        <Text size="lg" className="text-muted-foreground">→</Text>
        <Box className="items-center"><View className="h-12 w-12 items-center justify-center rounded-full bg-info/15"><Zap size={23} color={BLUE} /></View><Text size="xs" bold className="mt-1">Grid</Text><Text size="xs" className="text-muted-foreground">{live.gridExportKw.toFixed(1)} kW out</Text></Box>
      </Box>
      <Box className="flex-row flex-wrap gap-2">
        <Text size="xs" className="rounded-full bg-secondary px-3 py-1 text-primary">Solar → Home {live.homeKw.toFixed(1)} kW</Text>
        <Text size="xs" className="rounded-full bg-info/10 px-3 py-1 text-info">Solar → Grid {live.gridExportKw.toFixed(1)} kW</Text>
        {live.evKw ? <Text size="xs" className="rounded-full bg-warning/15 px-3 py-1 text-warning">Solar → EV {live.evKw.toFixed(1)} kW</Text> : null}
      </Box>
    </Card>
  );
}

function RecommendationCard({ recommendation, onChange }: { recommendation: SolarImpactResponse["recommendations"][number]; onChange: (status: SolarRecommendationStatus) => void }) {
  const done = recommendation.status === "completed";
  const accepted = recommendation.status === "accepted" || recommendation.status === "in_progress";
  return (
    <Card variant={done ? "softPop" : "soft"} className="gap-4" style={{ borderColor: done ? "#9AD9B5" : "#D6E8DD" }}>
      <Box className="flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: done ? "#D8F4E3" : "#E8F6EE" }}>
          {done ? <Check size={20} color={GREEN} strokeWidth={2.5} /> : <Lightbulb size={20} color={GREEN} strokeWidth={2.2} />}
        </View>
        <Box className="flex-1 gap-1">
          <Box className="flex-row items-center justify-between gap-2">
            <Text bold className="flex-1">{recommendation.title}</Text>
            <Text size="2xs" bold className={done ? "text-primary" : accepted ? "text-warning" : "text-muted-foreground"}>
              {done ? "COMPLETED" : accepted ? "ACCEPTED" : "RECOMMENDED"}
            </Text>
          </Box>
          <Text size="xs" className="text-muted-foreground" style={{ lineHeight: 18 }}>{recommendation.body}</Text>
        </Box>
      </Box>

      <Box className="rounded-2xl p-3" style={{ backgroundColor: "#F1F8F4" }}>
        <Text size="2xs" bold className="text-muted-foreground">BEST TIME TO ACT</Text>
        <Text size="sm" bold className="mt-1 text-primary">{recommendation.window}</Text>
      </Box>

      <Box className="flex-row flex-wrap gap-2">
        <Text size="2xs" className="rounded-full bg-secondary px-3 py-1 text-primary">₹{Math.round(recommendation.expectedSavingsInr)} saved</Text>
        <Text size="2xs" className="rounded-full bg-secondary px-3 py-1 text-primary">{recommendation.co2AvoidedKg.toFixed(1)} kg CO₂e avoided</Text>
        <Text size="2xs" className="rounded-full bg-warning/15 px-3 py-1 text-warning">+{recommendation.points} Green Points</Text>
      </Box>

      {done ? (
        <Box className="flex-row items-center gap-2 rounded-2xl px-3 py-2" style={{ backgroundColor: "#E8F6EE" }}>
          <Check size={17} color={GREEN} strokeWidth={2.5} />
          <Text size="sm" bold className="text-primary">Impact verified and rewards added</Text>
        </Box>
      ) : (
        <Button size="sm" variant={accepted ? "secondary" : "default"} className="w-full" onPress={() => onChange(accepted ? "completed" : "accepted")}>
          <Text bold className={accepted ? "text-secondary-foreground" : "text-primary-foreground"}>{accepted ? "Mark action complete" : "Accept recommendation"}</Text>
        </Button>
      )}
    </Card>
  );
}

function SolarRewardsHighlight({ data }: { data: SolarImpactResponse }) {
  const totalPoints = data.rewards.reduce((sum, reward) => sum + reward.points, 0);

  return (
    <View className="overflow-hidden rounded-3xl p-5" style={{ backgroundColor: DEEP_GREEN, borderColor: "#25543A", borderWidth: 1 }}>
      <Box className="flex-row items-start justify-between gap-3">
        <Box className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: "#1D5B3A" }}>
            <CircleDollarSign size={21} color={SCORE_MINT} strokeWidth={2.2} />
          </View>
          <Box>
            <Text bold style={{ color: "#FFFFFF" }}>Total solar rewards</Text>
            <Text size="xs" style={{ color: "#A7C6B2" }}>Green Points from your solar actions</Text>
          </Box>
        </Box>
        <Text size="2xs" bold style={{ color: SCORE_MINT }}>TODAY</Text>
      </Box>

      <Box className="mt-5 flex-row items-end justify-between gap-3">
        <Box>
          <Text size="5xl" bold style={{ color: "#FFFFFF", lineHeight: 58 }}>+{totalPoints}</Text>
          <Text size="xs" bold style={{ color: SCORE_MINT, letterSpacing: 1.1 }}>GREEN POINTS</Text>
        </Box>
        <Box className="items-end pb-1">
          <Text size="xs" style={{ color: "#A7C6B2" }}>{data.rewards.length} reward milestones</Text>
          <Text size="xs" bold style={{ color: "#D4E7DA" }}>Keep the momentum going</Text>
        </Box>
      </Box>

      <Box className="mt-5 rounded-2xl p-3" style={{ backgroundColor: "#173523", borderColor: "#28583C", borderWidth: 1 }}>
        <Text size="2xs" bold style={{ color: "#A7C6B2", letterSpacing: 0.8 }}>REWARD BREAKDOWN</Text>
        <Box className="mt-2 gap-2">
          {data.rewards.map((reward) => (
            <Box key={reward.label} className="flex-row items-center justify-between gap-3">
              <Box className="flex-row flex-1 items-center gap-2">
                <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SCORE_MINT }} />
                <Text size="xs" style={{ color: "#D4E7DA" }}>{reward.label}</Text>
              </Box>
              <Text size="sm" bold style={{ color: "#FFFFFF" }}>+{reward.points}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Text size="2xs" className="mt-3" style={{ color: "#789C83" }}>Rewards are separate from your Carbon Credit Score.</Text>
    </View>
  );
}

function SolarComparison({ data }: { data: SolarImpactResponse }) {
  const { current, optimized } = data.comparison;
  const usedGain = Math.max(0, optimized.usedKwh - current.usedKwh);
  const selfUseGain = Math.max(0, optimized.selfConsumptionPct - current.selfConsumptionPct);
  const maxUsed = Math.max(current.generatedKwh, optimized.generatedKwh, 1);
  const additionalSavings = Math.max(0, data.comparison.additionalSavingsInr);
  const additionalCo2 = Math.max(0, data.comparison.additionalCo2Kg);

  const formatKwh = (value: number) => `${value.toFixed(1)} kWh`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const column = (label: string, description: string, values: typeof current, optimizedColumn: boolean) => {
    const usedWidth = `${Math.min(100, Math.max(0, (values.usedKwh / maxUsed) * 100))}%` as `${number}%`;
    return (
      <View
        className="flex-1 rounded-2xl p-3"
        style={{
          backgroundColor: optimizedColumn ? "#E8F6EE" : "#F3F6F4",
          borderColor: optimizedColumn ? "#A9DFC0" : "#E1EAE4",
          borderWidth: 1,
        }}
      >
        <Box className="gap-1">
          <Text size="xs" bold style={{ color: optimizedColumn ? GREEN : DEEP_GREEN }}>{label}</Text>
          {optimizedColumn ? <Text size="2xs" bold className="text-primary">RECOMMENDED</Text> : null}
        </Box>
        <Text size="2xs" className="mt-1 text-muted-foreground">{description}</Text>

        <Text size="2xl" bold className="mt-4 text-primary">{formatPercent(values.selfConsumptionPct)}</Text>
        <Text size="2xs" className="text-muted-foreground">of solar used at home</Text>
        <View className="mt-2 h-2 overflow-hidden rounded-full" style={{ backgroundColor: optimizedColumn ? "#C7E8D3" : "#DFE8E2" }}>
          <View className="h-full rounded-full" style={{ width: usedWidth, backgroundColor: optimizedColumn ? GREEN : "#7C9A87" }} />
        </View>

        <Box className="mt-4 gap-2">
          <Box className="flex-row items-center justify-between gap-2">
            <Text size="2xs" className="text-muted-foreground">Solar used locally</Text>
            <Text size="xs" bold className="text-foreground">{formatKwh(values.usedKwh)}</Text>
          </Box>
          <Box className="flex-row items-center justify-between gap-2">
            <Text size="2xs" className="text-muted-foreground">Sent to grid</Text>
            <Text size="xs" bold className="text-foreground">{formatKwh(values.exportedKwh)}</Text>
          </Box>
        </Box>
      </View>
    );
  };

  return (
    <Card variant="soft" className="gap-4">
      <SectionTitle icon={BatteryCharging} title="Make more of your solar" subtitle="See how shifting flexible loads changes your home energy mix" />
      <Box className="flex-row gap-3">
        {column("Current use", "Your typical pattern", current, false)}
        {column("Smart timing", "With flexible loads shifted", optimized, true)}
      </Box>

      <View className="rounded-2xl p-4" style={{ backgroundColor: DEEP_GREEN, borderColor: "#28583C", borderWidth: 1 }}>
        <Box className="flex-row items-start gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: "#1D5B3A" }}>
            <Leaf size={16} color={SCORE_MINT} strokeWidth={2.2} />
          </View>
          <Box className="flex-1">
            <Text bold style={{ color: "#FFFFFF" }}>Your optimization opportunity</Text>
            <Text size="xs" className="mt-1" style={{ color: "#A7C6B2", lineHeight: 17 }}>
              Move EV charging, laundry or battery charging into the renewable window to keep more clean energy at home.
            </Text>
          </Box>
        </Box>
        <Box className="mt-3 flex-row flex-wrap gap-2">
          <Text size="2xs" bold className="rounded-full px-3 py-1" style={{ backgroundColor: "#1D5B3A", color: SCORE_MINT }}>+{formatKwh(usedGain)} used locally</Text>
          <Text size="2xs" bold className="rounded-full px-3 py-1" style={{ backgroundColor: "#1D5B3A", color: SCORE_MINT }}>+{formatPercent(selfUseGain)} self-use</Text>
          <Text size="2xs" bold className="rounded-full px-3 py-1" style={{ backgroundColor: "#1D5B3A", color: SCORE_MINT }}>₹{additionalSavings.toFixed(1)} more saved</Text>
        </Box>
        <Text size="2xs" className="mt-3" style={{ color: "#789C83" }}>{additionalCo2.toFixed(1)} kg CO₂e avoided with smart timing</Text>
      </View>
    </Card>
  );
}

function SolarOverview({ data }: { data: SolarImpactResponse }) {
  const [statuses, setStatuses] = useState<Record<string, SolarRecommendationStatus>>({});
  const actions = useSolarRecommendationActions();
  const recommendations = useMemo(() => data.recommendations.map((item) => ({ ...item, status: statuses[item.id] ?? item.status })), [data.recommendations, statuses]);
  const setStatus = (id: string, status: SolarRecommendationStatus) => {
    setStatuses((current) => ({ ...current, [id]: status }));
    if (status === "accepted") actions.accept.mutate(id);
    if (status === "completed") actions.complete.mutate(id);
  };
  return (
    <Box className="gap-4">
      <SolarScore data={data} />
      <Card variant="softPop" className="gap-3"><Box className="flex-row items-center gap-2"><Sun size={20} color={GOLD} /><Text bold size="lg">Your solar impact</Text></Box><Text size="sm" className="text-muted-foreground">See how your solar system powers your home, reduces emissions, and supports a cleaner grid.</Text><Text size="xs" className="text-muted-foreground">{data.location} · {data.systemSizeKw} kW rooftop system · Estimated from your system profile</Text><Box className="flex-row flex-wrap gap-2"><Metric label="Solar generated" value={`${data.generatedKwh.toFixed(1)} kWh`} /><Metric label="Used at home" value={`${data.consumedKwh.toFixed(1)} kWh`} /><Metric label="Sent to grid" value={`${data.exportedKwh.toFixed(1)} kWh`} tone="info" /><Metric label="From the grid" value={`${data.gridImportedKwh.toFixed(1)} kWh`} tone="warning" /></Box></Card>
      <SolarPanelHero data={data} />
      <SolarRewardsHighlight data={data} />
      <Card variant="soft" className="gap-3"><Box className="gap-1"><Text bold>How your solar is performing</Text><Text size="xs" className="text-muted-foreground">Understand what your panels power directly and how much of your home demand they cover.</Text></Box><Box className="flex-row gap-3"><Box className="flex-1"><Text size="xs" className="text-muted-foreground">Used at home</Text><Text size="2xl" bold className="text-primary">{data.selfConsumptionPct.toFixed(0)}%</Text><Text size="2xs" className="text-muted-foreground">of generated solar used directly</Text></Box><Box className="flex-1"><Text size="xs" className="text-muted-foreground">Solar contribution</Text><Text size="2xl" bold className="text-primary">{data.solarContributionPct.toFixed(0)}%</Text><Text size="2xs" className="text-muted-foreground">of household demand met by solar</Text></Box></Box></Card>
      <Box className="flex-row flex-wrap gap-2"><Metric label="CO₂ avoided (estimate)" value={`${data.co2AvoidedKg.toFixed(1)} kg`} /><Metric label="Money saved" value={`₹${Math.round(data.moneySavedInr)}`} tone="warning" /></Box>
      <EnergyFlow data={data} />
      <Card variant="soft" className="gap-4"><SectionTitle icon={Lightbulb} title="Smart solar recommendations" subtitle="Clear next steps to save money, avoid emissions, and earn Green Points" />{recommendations.map((item) => <RecommendationCard key={item.id} recommendation={item} onChange={(status) => setStatus(item.id, status)} />)}</Card>
      <Card variant="soft" className="gap-3"><SectionTitle icon={Leaf} title="Environmental impact" subtitle="Estimated using configurable emissions factors" /><Box className="flex-row flex-wrap gap-2"><Metric label="Renewable energy used" value={`${data.consumedKwh.toFixed(1)} kWh`} /><Metric label="Grid emissions avoided" value={`${data.co2AvoidedKg.toFixed(1)} kg`} /><Metric label="Solar sent to grid" value={`${data.exportedKwh.toFixed(1)} kWh`} /></Box></Card>
      <Card variant="soft" className="gap-3"><SectionTitle icon={CircleDollarSign} title="Financial impact" /><Box className="flex-row flex-wrap gap-2"><Metric label="Actual savings" value={`₹${Math.round(data.financial.actualSavingsInr)}`} tone="warning" /><Metric label="Additional possible" value={`₹${Math.round(data.financial.additionalSavingsInr)}`} tone="info" /><Metric label="Optimized savings" value={`₹${Math.round(data.financial.optimizedSavingsInr)}`} /></Box><Text size="2xs" className="text-muted-foreground">Tariff used for this estimate: ₹{data.financial.tariffInrPerKwh}/kWh</Text></Card>
      <SolarComparison data={data} />
      <Card variant="soft" className="gap-3"><SectionTitle icon={Check} title="Impact timeline" />{data.timeline.map((event, index) => <Box key={`${event.time}-${event.title}`} className="flex-row gap-3"><Box className="items-center"><View className="h-3 w-3 rounded-full bg-primary" />{index < data.timeline.length - 1 ? <View className="w-px flex-1 bg-primary/25" /> : null}</Box><Box className="flex-1 pb-3"><Text size="2xs" className="text-primary">{event.time}</Text><Text size="sm" bold>{event.title}{event.points ? ` · +${event.points} pts` : ""}</Text><Text size="xs" className="text-muted-foreground">{event.detail}</Text></Box></Box>)}</Card>
    </Box>
  );
}

export function SolarImpactDashboard({ data }: { data: SolarImpactResponse }) {
  return <SolarOverview data={data} />;
}
