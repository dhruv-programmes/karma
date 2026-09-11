import React from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CarbonBreakdown } from "@/components/custom/carbon-breakdown";
import { InsightCard } from "@/components/custom/insight-card";
import { SkeletonCard } from "@/components/custom/skeleton-card";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useImpact, useTransactions } from "@/src/hooks/queries";

export default function ImpactScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const impact = useImpact();
  const txns = useTransactions();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 24,
        gap: 24,
      }}
    >
      <Heading size="2xl">Impact</Heading>
      <Text className="text-muted-foreground -mt-3">
        Estimated — not false precision.
      </Text>

      {impact.isLoading || !impact.data ? (
        <SkeletonCard height={220} />
      ) : (
        <>
          <Box className="flex-row gap-3">
            {[
              { label: "Purchases", value: impact.data.purchases_kg },
              { label: "Transport", value: impact.data.transport_kg },
              { label: "Energy", value: impact.data.energy_kg },
            ].map((m) => (
              <Card key={m.label} variant="soft" className="flex-1 items-center p-3">
                <Text size="xl" bold className="font-mono text-primary">
                  ~{Math.round(m.value)}
                </Text>
                <Text size="xs" className="text-muted-foreground mt-1">
                  {m.label}
                </Text>
              </Card>
            ))}
          </Box>
          <CarbonBreakdown impact={impact.data} />
          <InsightCard
            title={`Biggest opportunity: ${impact.data.biggest_opportunity}`}
            body={impact.data.insight}
          />
          {impact.data.by_category ? (
            <Card variant="soft">
              <Text bold className="mb-2">
                Category drill-down
              </Text>
              <VStack space="sm">
                {Object.entries(impact.data.by_category)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, kg]) => (
                    <Box key={cat} className="flex-row justify-between">
                      <Text size="sm">{cat}</Text>
                      <Text size="sm" bold className="font-mono">
                        ~{Math.round(kg)} kg
                      </Text>
                    </Box>
                  ))}
              </VStack>
            </Card>
          ) : null}
        </>
      )}

      <VStack space="md">
        <Text bold>Recent transactions</Text>
        {(txns.data ?? []).slice(0, 8).map((t) => (
          <Card key={t.id} variant="flat" className="flex-row justify-between">
            <VStack>
              <Text bold size="sm">
                {t.merchant}
              </Text>
              <Text size="xs" className="text-muted-foreground">
                {t.category} · {t.date}
              </Text>
            </VStack>
            <Text bold className="font-mono">
              ₹{Math.round(t.amount_inr).toLocaleString("en-IN")}
            </Text>
          </Card>
        ))}
      </VStack>

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
