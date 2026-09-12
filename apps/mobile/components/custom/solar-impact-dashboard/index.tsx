import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { BatteryCharging, Check, CircleDollarSign, CloudSun, Gauge, Leaf, Lightbulb, Sun, Zap } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Text } from "@/components/ui/text";
import type { SolarImpactResponse, SolarRecommendationStatus } from "@/src/types/api";
import { useSolarRecommendationActions } from "@/src/hooks/queries";

const GREEN = "#2EA86E";
const GOLD = "#F4B942";
const BLUE = "#3D8BC9";

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
  return (
    <Card variant="softPop" className="gap-3">
      <Box className="flex-row items-center justify-between">
        <Box className="flex-row items-center gap-2"><Gauge size={19} color={GREEN} /><Text bold>Solar Score</Text></Box>
        <Text size="2xs" className="text-muted-foreground">Internal product score</Text>
      </Box>
      <Box className="flex-row items-end gap-1"><Text size="4xl" bold className="text-primary">{Math.round(data.solarScore)}</Text><Text size="lg" className="text-muted-foreground mb-2">/ 100</Text></Box>
      <Progress value={data.solarScore} />
      <Box className="flex-row flex-wrap gap-3">
        {data.scoreBreakdown.map((item) => <Box key={item.label} className="min-w-[44%] flex-1"><Text size="xs" className="text-muted-foreground">{item.label}</Text><Text bold size="sm">{Math.round(item.value)}</Text></Box>)}
      </Box>
    </Card>
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

function HourlyChart({ data }: { data: SolarImpactResponse }) {
  const max = Math.max(1, ...data.hourly.flatMap((p) => [p.solarKwh, p.consumptionKwh]));
  return (
    <Card variant="soft" className="gap-3">
      <SectionTitle icon={Sun} title="Today's energy rhythm" subtitle="Generation and household demand" />
      <Box className="flex-row gap-3"><Text size="2xs" className="text-primary">● Solar</Text><Text size="2xs" className="text-info">● Home use</Text><Text size="2xs" className="text-warning">● Grid import/export</Text></Box>
      <View className="h-36 flex-row items-end justify-between gap-2 border-b border-border px-1">
        {data.hourly.map((point) => <View key={point.label} className="flex-1 items-center justify-end gap-1">
          <View className="w-full flex-row items-end justify-center gap-1" style={{ height: 108 }}>
            <View className="w-2 rounded-t bg-primary" style={{ height: Math.max(3, point.solarKwh / max * 100) }} />
            <View className="w-2 rounded-t bg-info" style={{ height: Math.max(3, point.consumptionKwh / max * 100) }} />
          </View>
          <Text size="2xs" className="text-muted-foreground">{point.label}</Text>
        </View>)}
      </View>
      <Text size="xs" className="rounded-xl bg-secondary p-3 text-primary">Best renewable window: <Text size="xs" bold className="text-primary">12:15 PM – 3:00 PM</Text></Text>
    </Card>
  );
}

function RecommendationCard({ recommendation, onChange }: { recommendation: SolarImpactResponse["recommendations"][number]; onChange: (status: SolarRecommendationStatus) => void }) {
  const done = recommendation.status === "completed";
  const accepted = recommendation.status === "accepted" || recommendation.status === "in_progress";
  return (
    <Card variant={done ? "softPop" : "soft"} className="gap-3">
      <Box className="flex-row items-start gap-3"><View className="h-10 w-10 items-center justify-center rounded-full bg-secondary"><Lightbulb size={19} color={GREEN} /></View><Box className="flex-1"><Text bold>{recommendation.title}</Text><Text size="xs" className="text-muted-foreground mt-1">{recommendation.body}</Text></Box></Box>
      <Text size="xs" className="text-primary">Best window · {recommendation.window}</Text>
      <Box className="flex-row flex-wrap gap-2"><Text size="2xs" className="rounded-full bg-secondary px-2 py-1 text-primary">₹{recommendation.expectedSavingsInr} saved</Text><Text size="2xs" className="rounded-full bg-secondary px-2 py-1 text-primary">{recommendation.co2AvoidedKg.toFixed(1)} kg CO₂e</Text><Text size="2xs" className="rounded-full bg-warning/15 px-2 py-1 text-warning">+{recommendation.points} points</Text></Box>
      {done ? <Box className="flex-row items-center gap-2"><Check size={17} color={GREEN} /><Text size="sm" bold className="text-primary">Completed · impact verified</Text></Box> : <Button size="sm" variant={accepted ? "secondary" : "default"} onPress={() => onChange(accepted ? "completed" : "accepted")}><Text bold className={accepted ? "text-secondary-foreground" : "text-primary-foreground"}>{accepted ? "Mark complete" : "Accept recommendation"}</Text></Button>}
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
      <Card variant="softPop" className="gap-3"><Box className="flex-row items-center gap-2"><Sun size={20} color={GOLD} /><Text bold size="lg">Solar Impact</Text></Box><Text size="xs" className="text-muted-foreground">{data.location} · {data.systemSizeKw} kW rooftop system · Demo estimates</Text><Box className="flex-row flex-wrap gap-2"><Metric label="Generated" value={`${data.generatedKwh.toFixed(1)} kWh`} /><Metric label="Used directly" value={`${data.consumedKwh.toFixed(1)} kWh`} /><Metric label="Exported" value={`${data.exportedKwh.toFixed(1)} kWh`} tone="info" /><Metric label="Grid imported" value={`${data.gridImportedKwh.toFixed(1)} kWh`} tone="warning" /></Box></Card>
      <Card variant="soft" className="gap-3"><Text bold>Two ways to read solar performance</Text><Box className="flex-row gap-3"><Box className="flex-1"><Text size="xs" className="text-muted-foreground">Self-consumption</Text><Text size="2xl" bold className="text-primary">{data.selfConsumptionPct.toFixed(0)}%</Text><Text size="2xs" className="text-muted-foreground">of generated solar used directly</Text></Box><Box className="flex-1"><Text size="xs" className="text-muted-foreground">Solar contribution</Text><Text size="2xl" bold className="text-primary">{data.solarContributionPct.toFixed(0)}%</Text><Text size="2xs" className="text-muted-foreground">of household demand met by solar</Text></Box></Box></Card>
      <Box className="flex-row flex-wrap gap-2"><Metric label="CO₂ avoided (estimate)" value={`${data.co2AvoidedKg.toFixed(1)} kg`} /><Metric label="Money saved" value={`₹${Math.round(data.moneySavedInr)}`} tone="warning" /><Metric label="Green Points" value={`+${Math.round(data.greenPoints)}`} tone="info" /></Box>
      <SolarScore data={data} />
      <EnergyFlow data={data} />
      <HourlyChart data={data} />
      <Card variant="soft" className="gap-3"><SectionTitle icon={Lightbulb} title="Smart solar recommendations" subtitle="Small shifts create measurable impact" />{recommendations.map((item) => <RecommendationCard key={item.id} recommendation={item} onChange={(status) => setStatus(item.id, status)} />)}</Card>
      <Card variant="soft" className="gap-3"><SectionTitle icon={CloudSun} title="Tomorrow's solar forecast" /><Box className="flex-row gap-3"><Metric label="Expected generation" value={`${data.forecast.generatedKwh.toFixed(1)} kWh`} /><Metric label="Peak generation" value={data.forecast.peakWindow} /></Box><Box className="flex-row gap-2"><Text size="xs" className="rounded-full bg-secondary px-3 py-1 text-primary">{data.forecast.weather}</Text><Text size="xs" className="rounded-full bg-warning/15 px-3 py-1 text-warning">{data.forecast.opportunity} opportunity</Text></Box><Text size="sm" className="text-muted-foreground">{data.forecast.message}</Text></Card>
      <Card variant="soft" className="gap-3"><SectionTitle icon={Leaf} title="Environmental impact" subtitle="Estimated using configurable emissions factors" /><Box className="flex-row flex-wrap gap-2"><Metric label="Renewable energy used" value={`${data.consumedKwh.toFixed(1)} kWh`} /><Metric label="Grid emissions avoided" value={`${data.co2AvoidedKg.toFixed(1)} kg`} /><Metric label="Solar sent to grid" value={`${data.exportedKwh.toFixed(1)} kWh`} /></Box></Card>
      <Card variant="soft" className="gap-3"><SectionTitle icon={CircleDollarSign} title="Financial impact" /><Box className="flex-row flex-wrap gap-2"><Metric label="Actual savings" value={`₹${Math.round(data.financial.actualSavingsInr)}`} tone="warning" /><Metric label="Additional possible" value={`₹${Math.round(data.financial.additionalSavingsInr)}`} tone="info" /><Metric label="Optimized savings" value={`₹${Math.round(data.financial.optimizedSavingsInr)}`} /></Box><Text size="2xs" className="text-muted-foreground">Tariff used for this estimate: ₹{data.financial.tariffInrPerKwh}/kWh</Text></Card>
      <Card variant="soft" className="gap-3"><SectionTitle icon={BatteryCharging} title="Current vs optimized" subtitle="See the value of shifting flexible loads" /><Box className="flex-row gap-3"><Box className="flex-1 rounded-2xl bg-muted p-3"><Text bold size="sm">Current behavior</Text><Text size="xs" className="text-muted-foreground mt-2">Solar used · {data.comparison.current.usedKwh} kWh</Text><Text size="xs" className="text-muted-foreground">Exported · {data.comparison.current.exportedKwh} kWh</Text><Text bold className="text-primary mt-1">{data.comparison.current.selfConsumptionPct}% self-use</Text></Box><Box className="flex-1 rounded-2xl bg-secondary p-3"><Text bold size="sm">Optimized</Text><Text size="xs" className="text-muted-foreground mt-2">Solar used · {data.comparison.optimized.usedKwh} kWh</Text><Text size="xs" className="text-muted-foreground">Exported · {data.comparison.optimized.exportedKwh} kWh</Text><Text bold className="text-primary mt-1">{data.comparison.optimized.selfConsumptionPct}% self-use</Text></Box></Box><Text size="sm" bold className="text-primary">Potential: +{data.comparison.optimized.usedKwh - data.comparison.current.usedKwh} kWh used locally · ₹{data.comparison.additionalSavingsInr} more saved · {data.comparison.additionalCo2Kg.toFixed(1)} kg CO₂e avoided</Text></Card>
      <Card variant="soft" className="gap-3"><SectionTitle icon={CircleDollarSign} title="Today's Solar Rewards" subtitle="Internal Green Rewards, not carbon credits" />{data.rewards.map((reward) => <Box key={reward.label} className="flex-row items-center justify-between border-b border-border py-2"><Text size="sm" className="flex-1">{reward.label}</Text><Text bold className="text-warning">+{reward.points}</Text></Box>)}<Text size="lg" bold className="text-primary">Total · +{data.rewards.reduce((sum, item) => sum + item.points, 0)} Green Points</Text></Card>
      <Card variant="soft" className="gap-3"><SectionTitle icon={Check} title="Impact timeline" />{data.timeline.map((event, index) => <Box key={`${event.time}-${event.title}`} className="flex-row gap-3"><Box className="items-center"><View className="h-3 w-3 rounded-full bg-primary" />{index < data.timeline.length - 1 ? <View className="w-px flex-1 bg-primary/25" /> : null}</Box><Box className="flex-1 pb-3"><Text size="2xs" className="text-primary">{event.time}</Text><Text size="sm" bold>{event.title}{event.points ? ` · +${event.points} pts` : ""}</Text><Text size="xs" className="text-muted-foreground">{event.detail}</Text></Box></Box>)}</Card>
    </Box>
  );
}

export function SolarImpactDashboard({ data }: { data: SolarImpactResponse }) {
  return <SolarOverview data={data} />;
}
