import React from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { api } from "@/src/lib/api";

const FALLBACK = [
  {
    id: "1",
    name: "Mangrove restoration — Sundarbans",
    provider: "EcoVerified Demo",
    co2e_kg: 100,
    price_inr: 450,
    verification_status: "Verified",
    geography: "IN",
    description: "Community mangrove project. Demo listing only.",
  },
  {
    id: "2",
    name: "Rural biogas clusters",
    provider: "ClimateLink Demo",
    co2e_kg: 250,
    price_inr: 980,
    verification_status: "Verified",
    geography: "IN",
    description: "Household biogas displacing firewood. Demo listing only.",
  },
  {
    id: "3",
    name: "Urban tree pledge",
    provider: "Local NGO",
    co2e_kg: 40,
    price_inr: 199,
    verification_status: "Unverified",
    geography: "IN-KA",
    description: "Unverified local pledge — shown for transparency.",
  },
];

export default function OffsetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const offsets = useQuery({
    queryKey: ["offsets"],
    queryFn: async () => {
      try {
        return await api.getOffsets();
      } catch {
        return FALLBACK;
      }
    },
  });

  const items = offsets.data ?? FALLBACK;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 24,
        gap: 16,
      }}
    >
      <Pressable onPress={() => router.back()}>
        <Text className="text-primary">Back</Text>
      </Pressable>
      <Heading size="2xl">Verified offsets</Heading>
      <Text className="text-muted-foreground -mt-2">
        Optional after circular actions. Prefer repair/reuse first. Demo data.
      </Text>

      {items.map((o) => (
        <Card key={o.id} variant="soft">
          <VStack space="sm">
            <HStack className="justify-between gap-3 items-start">
              <Text bold className="flex-1">
                {o.name}
              </Text>
              <Badge
                action={o.verification_status === "Verified" ? "success" : "warning"}
                label={o.verification_status}
              />
            </HStack>
            <Text size="xs" className="text-muted-foreground">
              {o.provider} · {o.geography}
            </Text>
            <Text size="sm" className="text-muted-foreground">
              {o.description}
            </Text>
            <HStack space="xl">
              <Text className="font-mono">~{o.co2e_kg} kg CO₂e</Text>
              <Text className="font-mono">₹{o.price_inr}</Text>
            </HStack>
          </VStack>
        </Card>
      ))}

      <Button variant="outline" onPress={() => router.push("/(tabs)/actions")}>
        Back to actions
      </Button>
    </ScrollView>
  );
}
