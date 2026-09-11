import React from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

export default function ReceiptScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  async function pick() {
    await ImagePicker.requestCameraPermissionsAsync();
    router.push("/receipt/result");
  }

  return (
    <Box
      className="flex-1 bg-background px-6 gap-4"
      style={{ paddingTop: insets.top + 16 }}
    >
      <Pressable onPress={() => router.back()}>
        <Text className="text-primary">Back</Text>
      </Pressable>
      <Heading size="2xl">Scan receipt</Heading>
      <Text className="text-muted-foreground">
        Secondary path. Deterministic demo mapping — LLM never decides recommendations.
      </Text>
      <Button onPress={() => void pick()}>Take / choose photo</Button>
      <Button variant="outline" onPress={() => router.push("/receipt/result")}>
        Use demo receipt
      </Button>
    </Box>
  );
}
