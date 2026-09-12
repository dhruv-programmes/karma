import React, { useEffect, useRef, useState } from "react";
import { TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/custom/back-button";
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
import { useMe } from "@/src/hooks/queries";
import { useAppStore } from "@/src/store/app";
import type {
  DocumentConfirmItem,
  ExtractedDocumentItem,
  ProductCategory,
  Transaction,
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

function firstNameFrom(name?: string | null) {
  const part = (name || "").trim().split(/\s+/)[0];
  return part || "";
}

export default function ReceiptReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  const firstName = firstNameFrom(me.data?.name);
  const pending = useAppStore((s) => s.documentDraft);
  const setDocumentDraft = useAppStore((s) => s.setDocumentDraft);
  const setLastDocumentImport = useAppStore((s) => s.setLastDocumentImport);
  const [drafts, setDrafts] = useState<ReviewDraft[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [messages, setMessages] = useState<DocumentChatMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const leavingRef = useRef(false);

  useEffect(() => {
    if (!pending) {
      if (!leavingRef.current) {
        router.replace("/receipt");
      }
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
          userName: me.data?.name,
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
    if (!pending || confirming) return;
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
    const allItems =
      pending.needs_review.length === 0 && drafts.length === 0
        ? autoItems
        : [...autoItems, ...reviewItems];

    try {
      const result = await confirmDocumentImport(allItems, {
        userName: me.data?.name,
        documentTitle: pending.title,
      });

      const importedTxns = (result.transactions ?? []) as Transaction[];
      setLastDocumentImport({
        ...result,
        title: pending.title,
        total_inr: result.total_inr,
      });

      // Seed cache so Impact / result don't flash stale fallback data
      qc.setQueryData<Transaction[]>(["transactions"], (prev) => {
        const existing = prev ?? [];
        const ids = new Set(importedTxns.map((t) => String(t.id)));
        return [
          ...importedTxns,
          ...existing.filter((t) => !ids.has(String(t.id))),
        ];
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["transactions"] }),
        qc.invalidateQueries({ queryKey: ["impact"] }),
        qc.invalidateQueries({ queryKey: ["me"] }),
        qc.invalidateQueries({ queryKey: ["score"] }),
        qc.invalidateQueries({ queryKey: ["activity"] }),
      ]);

      leavingRef.current = true;
      setDocumentDraft(null);
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
  const keepCount =
    pending.auto_import.length + drafts.filter((d) => !d.discarded).length;
  const totalPreview = [
    ...pending.auto_import.map((i) => i.amount_inr),
    ...drafts.filter((d) => !d.discarded).map((d) => Number(d.amount) || 0),
  ].reduce((a, b) => a + b, 0);

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
        <BackButton label="Back" fallbackRoute="/receipt" />
        <Heading size="2xl">
          {showReviewEditor
            ? firstName
              ? `${firstName}, a few lines need you`
              : "Review uncertain items"
            : firstName
              ? `${firstName}, ready to add this?`
              : "Confirm import"}
        </Heading>
        <Text size="sm" className="text-muted-foreground">
          {pending.title}
          {showReviewEditor
            ? " — confirm or discard lines we could not read clearly."
            : " — everything looks clear. Confirm to add it to your footprint."}
        </Text>

        {pending.auto_import.length > 0 ? (
          <Card variant="soft">
            <Badge action="success" label="Ready for your footprint" />
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
                Won&apos;t be added to your footprint
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
          <Text bold>
            {firstName ? `Ask about your bill, ${firstName}` : "Ask about this bill"}
          </Text>
          <Text size="xs" className="text-muted-foreground mt-1 mb-3">
            Categories, totals, or unclear lines — grounded in what we read.
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

        <Text size="sm" className="text-muted-foreground">
          About to add {keepCount} line{keepCount === 1 ? "" : "s"} · ₹
          {Math.round(totalPreview).toLocaleString("en-IN")}
        </Text>

        <Button
          loading={confirming}
          disabled={keepCount === 0}
          onPress={() => void onConfirm()}
        >
          {firstName
            ? `Add to ${firstName}'s footprint`
            : "Confirm import"}
        </Button>
      </ScrollView>
    </Box>
  );
}
