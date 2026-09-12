import React, { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useMe, useTransactions } from "@/src/hooks/queries";
import { useAppStore } from "@/src/store/app";
import { DEMO_PHONE_ID } from "@/src/types/api";

function firstNameFrom(name?: string | null) {
  const part = (name || "").trim().split(/\s+/)[0];
  return part || "";
}

export default function ReceiptResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useMe();
  const firstName = firstNameFrom(me.data?.name);
  const params = useLocalSearchParams<{
    imported?: string;
    message?: string;
    badge?: string;
  }>();
  const lastImport = useAppStore((s) => s.lastDocumentImport);
  const setDocumentDraft = useAppStore((s) => s.setDocumentDraft);
  const txns = useTransactions();

  useEffect(() => {
    // Ensure review draft is cleared once we land on success
    setDocumentDraft(null);
  }, [setDocumentDraft]);

  const importedTxns = lastImport?.transactions?.length
    ? lastImport.transactions
    : (txns.data ?? []).slice(0, Number(params.imported || 0) || 6);

  const message =
    params.message ||
    lastImport?.message ||
    (firstName
      ? `${firstName}, your bill is on your footprint.`
      : `Imported ${params.imported ?? importedTxns.length} line items into your footprint.`);

  return (
    <Box
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 16 }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 24,
          gap: 12,
        }}
      >
        <Animated.View entering={ZoomIn.duration(320)}>
          <Badge action="playful" label="Saved to your loop" />
        </Animated.View>
        <Heading size="2xl">
          {firstName ? `Nice work, ${firstName}` : "Added to footprint"}
        </Heading>
        <Text size="sm" className="text-muted-foreground">
          {message}
        </Text>
        {lastImport?.title ? (
          <Text size="xs" className="text-muted-foreground">
            Source: {lastImport.title}
            {lastImport.total_inr != null
              ? ` · ₹${Math.round(lastImport.total_inr).toLocaleString("en-IN")}`
              : ""}
          </Text>
        ) : null}
        {params.badge ? (
          <Badge
            action="success"
            label={`Unlocked ${params.badge.replace(/_/g, " ")}`}
          />
        ) : null}

        {importedTxns.length === 0 ? (
          <Card variant="soft">
            <Text size="sm" className="text-muted-foreground">
              Import saved. Pull to refresh Impact if new lines take a moment to
              appear.
            </Text>
          </Card>
        ) : (
          importedTxns.map((item, i) => (
            <Animated.View key={String(item.id)} entering={FadeInDown.delay(80 * i)}>
              <Card variant="soft">
                <Text bold>{item.merchant}</Text>
                <Text size="sm" className="text-muted-foreground mt-1">
                  {item.category} · ₹
                  {Number(item.amount_inr).toLocaleString("en-IN")} · {item.date}
                </Text>
              </Card>
            </Animated.View>
          ))
        )}
      </ScrollView>

      <Box
        className="px-6 pt-4 border-t border-border bg-background"
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <VStack className="gap-3">
          <Button onPress={() => router.replace(`/(tabs)/impact` as never)}>
            {firstName ? `See ${firstName}'s updated impact` : "View updated impact"}
          </Button>
          <Button
            variant="outline"
            onPress={() => router.replace(`/product/${DEMO_PHONE_ID}`)}
          >
            Open circular decision
          </Button>
        </VStack>
      </Box>
    </Box>
  );
}
