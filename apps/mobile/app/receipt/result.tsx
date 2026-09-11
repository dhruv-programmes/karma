import React from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { DEMO_PHONE_ID } from "@/src/types/api";

export default function ReceiptResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = [
    { name: "Galaxy S-series Smartphone", category: "Electronics", price: 74999 },
    { name: "USB-C Cable", category: "Electronics", price: 499 },
  ];

  return (
    <Box
      className="flex-1 bg-background px-6 gap-4"
      style={{ paddingTop: insets.top + 16 }}
    >
      <Heading size="2xl">Receipt matched</Heading>
      <Text size="sm" className="text-muted-foreground">
        Croma · 11 Mar 2026 · demo extraction
      </Text>
      {items.map((item) => (
        <Card key={item.name} variant="soft">
          <Text bold>{item.name}</Text>
          <Text size="sm" className="text-muted-foreground mt-1">
            {item.category} · ₹{item.price.toLocaleString("en-IN")}
          </Text>
        </Card>
      ))}
      <Button onPress={() => router.replace(`/product/${DEMO_PHONE_ID}`)}>
        Open circular decision
      </Button>
    </Box>
  );
}
