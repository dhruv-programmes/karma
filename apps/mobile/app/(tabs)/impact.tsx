import React, { useState } from "react";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BudgetRing } from "@/components/custom/budget-ring";
import { CategoryDonut } from "@/components/custom/category-donut";
import { CompareBars } from "@/components/custom/compare-bars";
import { FootprintTrend } from "@/components/custom/footprint-trend";
import { InsightCard } from "@/components/custom/insight-card";
import { SkeletonCard } from "@/components/custom/skeleton-card";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { ListRow } from "@/components/ui/list-row";
import { ScrollView } from "@/components/ui/scroll-view";
import { StatTile } from "@/components/ui/stat-tile";
import { Text } from "@/components/ui/text";
import { SolarImpactDashboard } from "@/components/custom/solar-impact-dashboard";
import {
  useImpact,
  useImpactTimeseries,
  useSolarImpact,
  useTransactions,
} from "@/src/hooks/queries";
import { useTabBarClearance } from "@/src/theme/layout";

export default function ImpactScreen() {
  const insets = useSafeAreaInsets();
  const tabClearance = useTabBarClearance();
  const router = useRouter();
  const impact = useImpact();
  const series = useImpactTimeseries();
  const txns = useTransactions();
  const solar = useSolarImpact();
  const [tab, setTab] = useState("overview");
  const tabs = [
    { label: "Overview", value: "overview" },
    { label: "Carbon", value: "spend" },
    { label: "Solar", value: "solar" },
    { label: "Financial", value: "financial" },
    { label: "Rewards", value: "rewards" },
  ];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: tabClearance,
        paddingHorizontal: 24,
        gap: 20,
      }}
    >
      <Heading size="2xl">Impact</Heading>
      <Text className="text-muted-foreground -mt-3">
        Live estimates from your spend — not false precision.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {tabs.map((item) => {
          const active = item.value === tab;
          return (
            <Pressable
              key={item.value}
              onPress={() => setTab(item.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={`rounded-full border px-4 py-2 ${active ? "border-primary bg-primary" : "border-border bg-card"}`}
            >
              <Text size="sm" bold className={active ? "text-primary-foreground" : "text-muted-foreground"}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === "solar" ? (
        solar.isLoading || !solar.data ? <SkeletonCard height={280} /> : <SolarImpactDashboard data={solar.data} />
      ) : impact.isLoading || !impact.data ? (
        <SkeletonCard height={220} />
      ) : (
        <>
          <Box className="flex-row gap-3">
            <StatTile
              label="Purchases"
              value={`~${Math.round(impact.data.purchases_kg)}`}
              tone="primary"
            />
            <StatTile
              label="Transport"
              value={`~${Math.round(impact.data.transport_kg)}`}
              tone="info"
            />
            <StatTile
              label="Energy"
              value={`~${Math.round(impact.data.energy_kg)}`}
              tone="warning"
            />
          </Box>

          <BudgetRing
            usedPct={impact.data.budget_used_pct ?? 0}
            budgetKg={impact.data.monthly_budget_kg ?? 90}
            thisMonthKg={impact.data.this_month_kg ?? impact.data.total_kg}
            status={impact.data.budget_status ?? "on_track"}
          />

          {tab === "overview" ? (
            <>
              <FootprintTrend
                points={(series.data?.points ?? []).map((p) => ({
                  label: p.label,
                  kg: p.kg,
                }))}
              />
              <CategoryDonut
                purchases={impact.data.purchases_kg}
                transport={impact.data.transport_kg}
                energy={impact.data.energy_kg}
              />
              <CompareBars
                previousKg={impact.data.previous_month_kg ?? series.data?.previous_month_kg ?? 0}
                thisKg={impact.data.this_month_kg ?? series.data?.this_month_kg ?? 0}
              />
              <InsightCard
                title={`Biggest opportunity: ${impact.data.biggest_opportunity}`}
                body={impact.data.insight}
              />
              {impact.data.by_category ? (
                <Card variant="soft">
                  <Text bold className="mb-2">
                    Category drill-down
                  </Text>
                  {Object.entries(impact.data.by_category)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, kg]) => (
                      <ListRow
                        key={cat}
                        title={cat}
                        trailing={`~${Math.round(kg)} kg`}
                      />
                    ))}
                </Card>
              ) : null}
            </>
          ) : tab === "spend" ? (
            <Card variant="soft">
              <Text bold className="mb-2">
                Recent transactions
              </Text>
              {(txns.data ?? []).slice(0, 12).map((t) => (
                <ListRow
                  key={t.id}
                  title={t.merchant}
                  subtitle={`${t.category} · ${t.date}`}
                  trailing={`₹${Math.round(t.amount_inr).toLocaleString("en-IN")}`}
                />
              ))}
            </Card>
          ) : tab === "financial" ? (
            <Card variant="soft" className="gap-4">
              <Text bold size="lg">Financial impact</Text>
              <Text size="sm" className="text-muted-foreground">Estimated value created by lower-carbon choices and solar load shifting.</Text>
              <Box className="flex-row flex-wrap gap-2">
                <StatTile label="This month saved" value={`₹${Math.round(solar.data?.financial.actualSavingsInr ?? 118)}`} tone="primary" />
                <StatTile label="Possible next" value={`₹${Math.round(solar.data?.financial.additionalSavingsInr ?? 34)}`} tone="warning" />
              </Box>
              <Text size="xs" className="text-muted-foreground">Solar tariffs and savings are configurable estimates, not a bill.</Text>
            </Card>
          ) : (
            <Card variant="soft" className="gap-4">
              <Text bold size="lg">Green Rewards</Text>
              <Text size="sm" className="text-muted-foreground">Reward points recognize sustainable actions. They are separate from your Carbon Credit Score.</Text>
              <Box className="rounded-2xl bg-secondary p-4"><Text size="xs" className="text-muted-foreground">Solar points today</Text><Text size="4xl" bold className="text-primary">+{solar.data?.greenPoints ?? 75}</Text><Text size="xs" className="text-muted-foreground">Green Points</Text></Box>
              {(solar.data?.rewards ?? []).map((reward) => <ListRow key={reward.label} title={reward.label} trailing={`+${reward.points}`} />)}
            </Card>
          )}
        </>
      )}

      <Box className="flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onPress={() => router.push("/map?type=recycling")}
        >
          Find recycle
        </Button>
        <Button
          className="flex-1"
          onPress={() => router.push("/offsets" as import("expo-router").Href)}
        >
          View offsets
        </Button>
      </Box>
    </ScrollView>
  );
}
