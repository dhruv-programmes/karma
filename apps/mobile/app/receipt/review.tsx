import React, { useEffect, useState } from "react";
import { TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge } from "@/components/ui/badge";
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
  confirmDocumentImport,
  createChatMessage,
  streamDocumentChat,
  type DocumentChatMessage,
} from "@/src/lib/ai";
import { useAppStore } from "@/src/store/app";
import type {
  DocumentConfirmItem,
  ExtractedDocumentItem,
  ProductCategory,
} from "@/src/types/api";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES: ProductCategory[] = [
  "Electronics",
  "Clothing",
  "Food",
  "Transport",
  "Home",
  "Energy",
  "Furniture",
  "Personal care",
  "Other",
];

type ReviewDraft = {
  id: string;
  merchant: string;
  amount: string;
  date: string;
  category: ProductCategory;
  discarded: boolean;
  reason?: string | null;
  confidence: string;
};

function toDraft(item: ExtractedDocumentItem): ReviewDraft {
  return {
    id: item.id,
    merchant: item.merchant,
    amount: String(item.amount_inr),
    date: item.date,
    category: item.category,
    discarded: false,
    reason: item.needs_review_reason,
    confidence: item.confidence,
  };
}

export default function ReceiptReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const pending = useAppStore((s) => s.documentDraft);
  const setDocumentDraft = useAppStore((s) => s.setDocumentDraft);
  const [drafts, setDrafts] = useState<ReviewDraft[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [messages, setMessages] = useState<DocumentChatMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    if (!pending) {
      router.replace("/receipt");
      return;
    }
    setDrafts(pending.needs_review.map(toDraft));
  }, [pending, router]);

  function updateDraft(id: string, patch: Partial<ReviewDraft>) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
  }

  async function onAsk() {
    const text = chatInput.trim();
    if (!text || !pending || chatBusy) return;

    const userMsg = createChatMessage("user", text);
    const assistantId = createChatMessage("assistant", "").id;
    const nextMessages = [...messages, userMsg];

    setChatInput("");
    setChatError(null);
    setChatBusy(true);
    setMessages([...nextMessages, { id: assistantId, role: "assistant", text: "" }]);

    try {
      await streamDocumentChat(
        {
          messages: nextMessages,
          documentContext: pending.extractionJson ?? "",
        },
        {
          onPartial: (partial) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: partial } : m
              )
            );
          },
          onFinish: (finalText) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, text: finalText || m.text }
                  : m
              )
            );
          },
        }
      );
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Chat failed");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setChatBusy(false);
    }
  }

  async function onConfirm() {
    if (!pending) return;
    setConfirming(true);
    setConfirmError(null);
    const autoItems: DocumentConfirmItem[] = pending.auto_import.map((i) => ({
      id: i.id,
      merchant: i.merchant,
      amount_inr: i.amount_inr,
      date: i.date,
      category: i.category,
      discarded: false,
    }));
    const reviewItems: DocumentConfirmItem[] = drafts.map((d) => ({
      id: d.id,
      merchant: d.merchant.trim() || "Unknown",
      amount_inr: Number(d.amount) || 0,
      date: d.date,
      category: d.category,
      discarded: d.discarded,
    }));
    // If nothing needs review, still import auto items
    const allItems =
      pending.needs_review.length === 0 && drafts.length === 0
        ? autoItems
        : [...autoItems, ...reviewItems];

    try {
      const result = await confirmDocumentImport(allItems);
      setDocumentDraft(null);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["impact"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["score"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      router.replace({
        pathname: "/receipt/result",
        params: {
          imported: String(result.imported),
          message: result.message,
          badge: result.badges_unlocked?.[0] ?? "",
        },
      });
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Import failed");
      setConfirming(false);
    }
  }

  if (!pending) {
    return <Box className="flex-1 bg-background" />;
  }

  const showReviewEditor = drafts.length > 0;

  return (
    <Box
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 16 }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
          gap: 12,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()}>
          <Text className="text-primary">Back</Text>
        </Pressable>
        <Heading size="2xl">
          {showReviewEditor ? "Review uncertain items" : "Confirm import"}
        </Heading>
        <Text size="sm" className="text-muted-foreground">
          {pending.title}
          {showReviewEditor
            ? " — confirm or discard lines we could not read clearly."
            : " — all items look clear. Confirm to add them to your footprint."}
        </Text>

        {pending.auto_import.length > 0 ? (
          <Card variant="soft">
            <Badge action="success" label="Ready to import" />
            <Text bold className="mt-2">
              {pending.auto_import.length} high-confidence item
              {pending.auto_import.length === 1 ? "" : "s"}
            </Text>
            {pending.auto_import.map((item) => (
              <Text
                key={item.id}
                size="sm"
                className="text-muted-foreground mt-1"
              >
                {item.merchant} · ₹{item.amount_inr.toLocaleString("en-IN")} ·{" "}
                {item.category}
              </Text>
            ))}
          </Card>
        ) : null}

        {drafts.map((draft) => (
          <Card key={draft.id} variant="soft">
            <HStack className="items-center justify-between gap-2">
              <Badge
                action={draft.confidence === "low" ? "error" : "warning"}
                label={`${draft.confidence} confidence`}
              />
              <Pressable
                onPress={() =>
                  updateDraft(draft.id, { discarded: !draft.discarded })
                }
              >
                <Text size="sm" className="text-primary">
                  {draft.discarded ? "Restore" : "Discard"}
                </Text>
              </Pressable>
            </HStack>
            {draft.reason ? (
              <Text size="xs" className="text-muted-foreground mt-2">
                {draft.reason}
              </Text>
            ) : null}
            {draft.discarded ? (
              <Text size="sm" className="mt-3 text-muted-foreground">
                Won&apos;t be imported
              </Text>
            ) : (
              <VStack className="gap-2 mt-3">
                <Text size="xs" className="text-muted-foreground">
                  Merchant
                </Text>
                <TextInput
                  value={draft.merchant}
                  onChangeText={(t) => updateDraft(draft.id, { merchant: t })}
                  className="border border-border rounded-lg px-3 py-2 text-foreground bg-background"
                />
                <Text size="xs" className="text-muted-foreground">
                  Amount (₹)
                </Text>
                <TextInput
                  value={draft.amount}
                  keyboardType="decimal-pad"
                  onChangeText={(t) => updateDraft(draft.id, { amount: t })}
                  className="border border-border rounded-lg px-3 py-2 text-foreground bg-background"
                />
                <Text size="xs" className="text-muted-foreground">
                  Category
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <HStack className="gap-2 py-1">
                    {CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat}
                        onPress={() => updateDraft(draft.id, { category: cat })}
                      >
                        <Badge
                          action={
                            draft.category === cat ? "success" : "muted"
                          }
                          label={cat}
                        />
                      </Pressable>
                    ))}
                  </HStack>
                </ScrollView>
              </VStack>
            )}
          </Card>
        ))}

        <Card variant="soft">
          <Text bold>Ask about this bill</Text>
          <Text size="xs" className="text-muted-foreground mt-1 mb-3">
            Categories, totals, or unclear lines — grounded in the extraction.
          </Text>
          {messages.map((m) => {
            if (!m.text && m.role === "assistant" && chatBusy) {
              return (
                <Box key={m.id} className="mb-2 px-3 py-2 rounded-xl bg-muted">
                  <Text size="sm" className="text-muted-foreground">
                    Thinking…
                  </Text>
                </Box>
              );
            }
            if (!m.text) return null;
            return (
              <Box
                key={m.id}
                className={`mb-2 px-3 py-2 rounded-xl ${
                  m.role === "user" ? "bg-primary/15 self-end" : "bg-muted"
                }`}
              >
                <Text size="sm">{m.text}</Text>
              </Box>
            );
          })}
          {chatError ? (
            <Text size="sm" className="text-destructive mb-2">
              {chatError}
            </Text>
          ) : null}
          <HStack className="gap-2 items-center mt-2">
            <TextInput
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="e.g. Is this Energy or Home?"
              className="flex-1 border border-border rounded-lg px-3 py-2 text-foreground bg-background"
              editable={!chatBusy}
            />
            <Button
              size="sm"
              disabled={!chatInput.trim() || chatBusy}
              loading={chatBusy}
              onPress={() => void onAsk()}
            >
              Ask
            </Button>
          </HStack>
        </Card>

        {confirmError ? (
          <Text className="text-destructive">{confirmError}</Text>
        ) : null}

        <Button loading={confirming} onPress={() => void onConfirm()}>
          Confirm import
        </Button>
      </ScrollView>
    </Box>
  );
}
