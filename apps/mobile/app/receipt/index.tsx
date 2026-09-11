import React from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { useParseReceipt } from "@/src/hooks/queries";

export default function ReceiptScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const parse = useParseReceipt();

  async function pick() {
    await ImagePicker.requestCameraPermissionsAsync();
    await runParse();
  }

  async function runParse() {
    try {
      const result = await parse.mutateAsync();
      router.push({
        pathname: "/receipt/result",
        params: {
          imported: String(result.imported),
          message: result.message,
          badge: result.badges_unlocked?.[0] ?? "",
        },
      });
    } catch {
      router.push("/receipt/result");
    }
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
        Demo NLP stub categorizes merchants into your footprint. Not live OCR.
      </Text>
      <Button loading={parse.isPending} onPress={() => void pick()}>
        Take / choose photo
      </Button>
      <Button
        variant="playful"
        loading={parse.isPending}
        onPress={() => void runParse()}
      >
        Parse demo receipt
      </Button>
    </Box>
  );
}
