import React, { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, RotateCcw } from "lucide-react-native";
import { BackButton } from "@/components/custom/back-button";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppStore } from "@/src/store/app";

export default function ReceiptCameraScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const setReceiptCapture = useAppStore((state) => state.setReceiptCapture);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function capture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.75 });
      if (!photo?.uri) throw new Error("The camera did not return a photo.");
      setReceiptCapture({
        uri: photo.uri,
        name: `receipt_${Date.now()}.jpg`,
        kind: "image",
      });
      router.back();
    } catch (captureError) {
      setError(
        captureError instanceof Error
          ? captureError.message
          : "Could not capture the receipt. Try again."
      );
    } finally {
      setCapturing(false);
    }
  }

  return (
    <Box className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
      <View style={styles.header}>
        <BackButton label="Cancel" fallbackRoute="/receipt" variant="circle" />
        <Text style={styles.headerTitle}>Scan receipt</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.preview}>
        {permission?.granted ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        ) : (
          <View style={styles.permissionCard}>
            <Camera size={34} color="#A7F3D0" />
            <Text style={styles.permissionText}>
              Camera access is needed to take a receipt photo.
            </Text>
            <Button onPress={requestPermission}>Enable camera</Button>
          </View>
        )}
        <View pointerEvents="none" style={styles.frame} />
      </View>

      <Text style={styles.help}>Fit the full receipt inside the frame</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {permission?.granted ? (
        <View style={styles.controls}>
          <View style={styles.controlSpacer} />
          <Button
            onPress={() => void capture()}
            loading={capturing}
            style={styles.captureButton}
          >
            <Camera size={20} color="#FFFFFF" />
            Take photo
          </Button>
          <Button
            variant="ghost"
            onPress={() => router.back()}
            style={styles.cancelButton}
          >
            <RotateCcw size={16} color="#D1FAE5" />
            Retake
          </Button>
        </View>
      ) : null}
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  headerSpacer: { width: 72 },
  preview: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#102B1E",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionCard: { alignItems: "center", gap: 16, padding: 28 },
  permissionText: { color: "#D1FAE5", textAlign: "center", fontSize: 15 },
  frame: {
    width: "82%",
    height: "68%",
    borderWidth: 2,
    borderColor: "rgba(167,243,208,0.9)",
    borderRadius: 16,
  },
  help: { color: "#D1FAE5", textAlign: "center", marginTop: 16, fontSize: 13 },
  error: { color: "#FCA5A5", textAlign: "center", marginHorizontal: 24, marginTop: 8 },
  controls: { alignItems: "center", paddingVertical: 24, gap: 8 },
  controlSpacer: { display: "none" },
  captureButton: { minWidth: 180, justifyContent: "center" },
  cancelButton: { minWidth: 120, justifyContent: "center" },
});
