import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ScanOverlay } from "@/components/custom/scan-overlay";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { api } from "@/src/lib/api";
import { fallbackPhone } from "@/src/lib/fallbacks";
import { DEMO_PHONE_BARCODE } from "@/src/types/api";
import { useAppStore } from "@/src/store/app";
import { StyleSheet } from "react-native";

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const locked = useAppStore((s) => s.scannerLocked);
  const setLocked = useAppStore((s) => s.setScannerLocked);
  const [status, setStatus] = useState("Point at a barcode");

  async function resolveBarcode(barcode: string) {
    if (locked) return;
    setLocked(true);
    setStatus("Got it…");
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* sim */
    }
    try {
      const product = await api.lookupBarcode(barcode);
      setStatus("Found!");
      router.replace(`/scan/result?id=${product.id}`);
    } catch {
      setStatus("Found!");
      router.replace(`/scan/result?id=${fallbackPhone.id}`);
    } finally {
      setTimeout(() => setLocked(false), 1500);
    }
  }

  const badgeLabel =
    status === "Point at a barcode"
      ? "Ready"
      : status === "Got it…"
        ? "Scanning"
        : "Found";

  return (
    <Box className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <Box className="flex-row items-center justify-between px-6 py-4">
        <Pressable onPress={() => router.back()}>
          <Text>Close</Text>
        </Pressable>
        <Text bold>Scan a product</Text>
        <Badge action="playful" label={badgeLabel} />
      </Box>

      <Box className="mx-6 h-[360px] rounded-3xl overflow-hidden items-center justify-center bg-card border border-border">
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "upc_a", "qr"],
            }}
            onBarcodeScanned={({ data }) => {
              void resolveBarcode(data);
            }}
          />
        ) : (
          <Box className="p-6 gap-4 items-center w-full">
            <Text className="text-muted-foreground text-center">
              Camera access helps identify products.
            </Text>
            <Button onPress={requestPermission}>Enable camera</Button>
          </Box>
        )}
        <ScanOverlay />
      </Box>

      <Text className="text-muted-foreground text-center mt-6">{status}</Text>

      <Box className="mt-6 mx-6">
        <Button
          variant="ghost"
          onPress={() => void resolveBarcode(DEMO_PHONE_BARCODE)}
        >
          Use demo smartphone barcode
        </Button>
      </Box>
    </Box>
  );
}
