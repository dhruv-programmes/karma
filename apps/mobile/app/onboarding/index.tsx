import React from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppStore } from "@/src/store/app";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setDone = useAppStore((s) => s.setOnboardingDone);

  function start() {
    setDone(true);
    router.replace("/(tabs)");
  }

  return (
    <Box
      className="flex-1 bg-background px-6"
      style={{ paddingTop: insets.top + 32 }}
    >
      <Box className="absolute -top-10 -right-16 w-64 h-64 rounded-full bg-accent/30" />
      <Box className="absolute top-40 -left-20 w-48 h-48 rounded-full bg-primary/15" />
      <Text size="sm" bold className="text-primary mb-3">
        Carbon Loop
      </Text>
      <Heading size="3xl" className="max-w-[320px]">
        Close the loop on stuff you already own
      </Heading>
      <Text className="text-muted-foreground mt-4 max-w-[340px]">
        Scan a product, see repair vs replace vs recycle, act nearby, and pick
        up points for real circular wins.
      </Text>

      <VStack space="md" className="mt-10">
        {[
          "Scan & identify products",
          "Rank circular options",
          "Act nearby & earn impact",
        ].map((step, i) => (
          <Card key={step} variant="soft" className="flex-row items-center gap-3">
            <Box className="w-8 h-8 rounded-full bg-secondary items-center justify-center">
              <Text bold className="font-mono text-primary">
                {i + 1}
              </Text>
            </Box>
            <Text>{step}</Text>
          </Card>
        ))}
      </VStack>

      <Box className="mt-auto mb-10">
        <Button onPress={start}>Start the loop</Button>
      </Box>
    </Box>
  );
}
