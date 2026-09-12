import React, { useRef, useState } from "react";
import { ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { Asset } from "expo-asset";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Camera,
  FileText,
  Image as ImageIcon,
} from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
  extractDocumentStream,
  splitByConfidence,
} from "@/src/lib/ai";
import { useAppStore } from "@/src/store/app";
import type { DocumentExtraction } from "@/src/types/api";

type PickedFile = {
  uri: string;
  name: string;
  kind: "image" | "pdf";
};

const SAMPLE_HINTS: { label: string; hint: string; kind: "image" | "pdf" }[] =
  [
    {
      label: "Grocery / electronics receipt",
      hint: "This is a retail receipt photo. Extract each purchase line.",
      kind: "image",
    },
    {
      label: "Food delivery order",
      hint: "Food delivery bill. Extract order total and merchant.",
      kind: "image",
    },
    {
      label: "Electricity / utility PDF",
      hint: "Utility electricity bill. Extract energy charges carefully.",
      kind: "pdf",
    },
  ];

export default function ReceiptScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setDocumentDraft = useAppStore((s) => s.setDocumentDraft);

  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [partial, setPartial] = useState<Partial<DocumentExtraction> | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function takePhoto() {
    setError(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError("Camera permission is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.75,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPicked({
      uri: asset.uri,
      name: asset.fileName ?? `receipt_${Date.now()}.jpg`,
      kind: "image",
    });
  }

  async function choosePhoto() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Photo library permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.75,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPicked({
      uri: asset.uri,
      name: asset.fileName ?? `bill_${Date.now()}.jpg`,
      kind: "image",
    });
  }

  async function choosePdf() {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.size != null && asset.size > 10 * 1024 * 1024) {
      setError("PDF is too large (max 10MB). Try a shorter bill or a photo.");
      return;
    }
    // Prefer the cached copy URI; Android sometimes still returns content://.
    setPicked({
      uri: asset.uri,
      name: asset.name || `bill_${Date.now()}.pdf`,
      kind: "pdf",
    });
  }

  async function loadSamplePdf() {
    setError(null);
    try {
      const [asset] = await Asset.loadAsync(
        require("@/assets/samples/bescom-bill.pdf")
      );
      const uri = asset.localUri ?? asset.uri;
      if (!uri) {
        setError("Sample PDF is not available in this build.");
        return;
      }
      setPicked({
        uri,
        name: "bescom-bill.pdf",
        kind: "pdf",
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load sample PDF"
      );
    }
  }

  async function runExtract(hint?: string) {
    if (!picked) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setExtracting(true);
    setError(null);
    setPartial(null);
    setStatus("Reading your document…");

    try {
      await extractDocumentStream(
        { ...picked, hint },
        {
          onPartial: (p) => {
            setPartial(p);
            setStatus(
              p.items?.length
                ? `Found ${p.items.length} item${p.items.length === 1 ? "" : "s"}…`
                : "Finding merchants & amounts…"
            );
          },
          onFinish: (obj) => {
            const { auto_import, needs_review, requires_review } =
              splitByConfidence(obj.items);
            const draft = {
              title: obj.title,
              auto_import,
              needs_review,
              imported: 0,
              transactions: [],
              message: requires_review
                ? `Found ${obj.items.length} items — ${needs_review.length} need a quick check.`
                : `Found ${obj.items.length} items ready to import.`,
              requires_review,
              extractionJson: JSON.stringify(obj, null, 2),
            };
            setDocumentDraft(draft);
            setExtracting(false);
            setStatus(null);
            if (requires_review) {
              router.push("/receipt/review");
            } else {
              router.push("/receipt/review");
            }
          },
          onError: (e) => {
            setError(e.message);
            setExtracting(false);
            setStatus(null);
          },
        },
        ac.signal
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Extraction failed");
      setExtracting(false);
      setStatus(null);
    }
  }

  return (
    <Box
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 16 }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
          gap: 14,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Text className="text-primary">Back</Text>
        </Pressable>
        <Heading size="2xl">Import bill / receipt</Heading>
        <Text className="text-muted-foreground">
          Upload electricity, shopping, food, or travel bills. We read the
          document and add spend to your footprint — unclear lines get a quick
          review.
        </Text>

        <VStack className="gap-3 mt-1">
          <Pressable disabled={extracting} onPress={() => void takePhoto()}>
            <Card variant="soft">
              <HStack className="items-center gap-3">
                <Box className="w-11 h-11 rounded-full bg-primary/15 items-center justify-center">
                  <Camera size={22} color="#2EA86E" strokeWidth={1.8} />
                </Box>
                <VStack className="flex-1 gap-0.5">
                  <Text bold>Take photo</Text>
                  <Text size="sm" className="text-muted-foreground">
                    Snap a paper receipt or bill
                  </Text>
                </VStack>
              </HStack>
            </Card>
          </Pressable>

          <Pressable disabled={extracting} onPress={() => void choosePhoto()}>
            <Card variant="soft">
              <HStack className="items-center gap-3">
                <Box className="w-11 h-11 rounded-full bg-primary/15 items-center justify-center">
                  <ImageIcon size={22} color="#2EA86E" strokeWidth={1.8} />
                </Box>
                <VStack className="flex-1 gap-0.5">
                  <Text bold>Choose from gallery</Text>
                  <Text size="sm" className="text-muted-foreground">
                    Pick an existing photo of a bill
                  </Text>
                </VStack>
              </HStack>
            </Card>
          </Pressable>

          <Pressable disabled={extracting} onPress={() => void choosePdf()}>
            <Card variant="soft">
              <HStack className="items-center gap-3">
                <Box className="w-11 h-11 rounded-full bg-primary/15 items-center justify-center">
                  <FileText size={22} color="#2EA86E" strokeWidth={1.8} />
                </Box>
                <VStack className="flex-1 gap-0.5">
                  <Text bold>Upload PDF</Text>
                  <Text size="sm" className="text-muted-foreground">
                    Electricity, invoices, trip summaries
                  </Text>
                </VStack>
              </HStack>
            </Card>
          </Pressable>

          <Pressable disabled={extracting} onPress={() => void loadSamplePdf()}>
            <Card variant="soft">
              <Text bold size="sm">
                Try sample BESCOM PDF
              </Text>
              <Text size="xs" className="text-muted-foreground mt-1">
                Bundled utility bill — useful if device PDF pick fails to open.
              </Text>
            </Card>
          </Pressable>
        </VStack>

        {picked ? (
          <Card variant="soft">
            <HStack className="items-start gap-3">
              {picked.kind === "image" ? (
                <Image
                  source={{ uri: picked.uri }}
                  style={{ width: 64, height: 80, borderRadius: 8 }}
                  resizeMode="cover"
                />
              ) : (
                <Box className="w-16 h-20 rounded-lg bg-muted items-center justify-center">
                  <FileText size={28} color="#64748B" strokeWidth={1.6} />
                </Box>
              )}
              <VStack className="flex-1 gap-1">
                <Text bold numberOfLines={2}>
                  {picked.name}
                </Text>
                <Text size="sm" className="text-muted-foreground">
                  {picked.kind === "pdf" ? "PDF document" : "Photo"} · Ready
                </Text>
                <Pressable
                  onPress={() => setPicked(null)}
                  disabled={extracting}
                >
                  <Text size="sm" className="text-primary mt-1">
                    Remove
                  </Text>
                </Pressable>
              </VStack>
            </HStack>
            <Button
              className="mt-4"
              loading={extracting}
              onPress={() => void runExtract()}
            >
              Extract footprint data
            </Button>
          </Card>
        ) : null}

        {extracting || partial ? (
          <Card variant="soft">
            <VStack className="gap-3 py-2">
              {extracting ? (
                <HStack className="items-center gap-3">
                  <ActivityIndicator color="#2EA86E" />
                  <Text bold>{status ?? "Working…"}</Text>
                </HStack>
              ) : null}
              {partial?.title ? (
                <Text size="sm" className="text-muted-foreground">
                  {partial.title}
                </Text>
              ) : null}
              {(partial?.items ?? []).map((item, i) =>
                item ? (
                  <Text key={i} size="sm">
                    {item.merchant ?? "…"} · ₹
                    {item.amount_inr != null
                      ? Number(item.amount_inr).toLocaleString("en-IN")
                      : "…"}
                    {item.confidence ? ` · ${item.confidence}` : ""}
                  </Text>
                ) : null
              )}
              {extracting ? (
                <Pressable
                  onPress={() => {
                    abortRef.current?.abort();
                    setExtracting(false);
                    setStatus(null);
                  }}
                >
                  <Text size="sm" className="text-primary">
                    Stop
                  </Text>
                </Pressable>
              ) : null}
            </VStack>
          </Card>
        ) : null}

        {error ? (
          <Card variant="soft">
            <Text className="text-destructive">{error}</Text>
            <Text size="xs" className="text-muted-foreground mt-2">
              Ensure the AI service is running (pnpm ai) and
              GOOGLE_GENERATIVE_AI_API_KEY is set in apps/ai/.env.local
            </Text>
          </Card>
        ) : null}

        <Text bold size="sm" className="mt-3">
          Tips for better results
        </Text>
        {SAMPLE_HINTS.map((s) => (
          <Card key={s.label} variant="soft">
            <Text bold size="sm">
              {s.label}
            </Text>
            <Text size="xs" className="text-muted-foreground mt-1">
              {s.hint}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </Box>
  );
}
