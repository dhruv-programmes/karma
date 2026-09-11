import React, { useState } from "react";
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
import { SegmentedControl } from "@/components/ui/segmented";
import { StatTile } from "@/components/ui/stat-tile";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
  useImpact,
  useImpactTimeseries,
  useTransactions,
} from "@/src/hooks/queries";

export default function ImpactScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const impact = useImpact();
  const series = useImpactTimeseries();
  const txns = useTransactions();
  const [tab, setTab] = useState("overview");

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 24,
        gap: 20,
      }}
    >
      <Heading size="2xl">Impact</Heading>
      <Text className="text-muted-foreground -mt-3">
        Live estimates from your spend — not false precision.
      </Text>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { label: "Overview", value: "overview" },
          { label: "Spend", value: "spend" },
        ]}
      />

      {impact.isLoading || !impact.data ? (
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
          ) : (
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
