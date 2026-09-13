import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { X, Send, Square, TrendingUp, Sparkles, Leaf } from "lucide-react-native";
import {
  createUserSupportMessage,
  streamSupportChat,
  type SupportMessage,
} from "@/src/lib/support-chat";
import { useAuthStore } from "@/src/store/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_DOCK_BOTTOM_GAP, TAB_DOCK_HEIGHT } from "@/src/theme/layout";

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary: "#2EA86E",
  primaryDark: "#1B7A4E",
  bg: "#0A1F14",           // Very dark green — solid, no bleed-through
  bgCard: "#0F2A1C",
  surface: "#122318",
  border: "rgba(46,168,110,0.22)",
  borderStrong: "rgba(46,168,110,0.38)",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.72)",
  textMuted: "rgba(255,255,255,0.45)",
  bubbleUser: "#2EA86E",
  bubbleAi: "#162D20",
  bubbleAiBorder: "rgba(46,168,110,0.22)",
};

const QUICK_PROMPTS = [
  { label: "My score", prompt: "What is my circularity score and what does it mean?", icon: TrendingUp },
  { label: "Earn coins", prompt: "How do I earn more Karma Coins?", icon: Sparkles },
  { label: "Best action", prompt: "What is the single highest-impact action I can take right now?", icon: Leaf },
];

// ─── Typing animation ────────────────────────────────────────────────────────
function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 280, useNativeDriver: true }),
          Animated.delay(540 - i * 180),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.dotsRow}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
      ))}
    </View>
  );
}

// ─── Text extraction ─────────────────────────────────────────────────────────
function textFromMessage(msg: SupportMessage): string {
  return msg.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("")
    .trim();
}

// ─── Main component ───────────────────────────────────────────────────────────
export function KarmaChatBot() {
  const insets = useSafeAreaInsets();
  const userName = useAuthStore((s) => s.user?.name);
  const firstName = (userName || "").split(/\s+/)[0] || "";

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({ animated: true })
      );
    }
  }, [messages, busy, open]);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    void Haptics.selectionAsync();
    setInput("");
    Keyboard.dismiss();

    const userMsg = createUserSupportMessage(trimmed);
    const history = [...messages, userMsg];
    setMessages(history);
    setBusy(true);

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", parts: [] },
    ]);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const upsert = (assistant: SupportMessage) => {
      setMessages((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex(
          (m) => m.id === assistantId || m.id === assistant.id
        );
        if (idx >= 0) copy[idx] = assistant;
        else copy.push(assistant);
        return copy;
      });
    };

    try {
      await streamSupportChat(
        { messages: history, userName: useAuthStore.getState().user?.name },
        { onPartial: upsert, onFinish: upsert },
        controller.signal
      );
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    setBusy(false);
  }

  function openChat() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOpen(true);
  }

  function closeChat() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stop();
    setOpen(false);
  }

  const canSend = input.trim().length > 0 && !busy;
  const bottomInset = Math.max(insets.bottom, 8);
  const fabBottom = bottomInset + TAB_DOCK_BOTTOM_GAP + TAB_DOCK_HEIGHT + 10;

  return (
    <>
      {/* ── FAB ─────────────────────────────────────────────────── */}
      <View
        style={[styles.fabWrap, { bottom: fabBottom }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={openChat}
          activeOpacity={0.82}
          style={styles.fab}
          accessibilityLabel="Open Karma AI chat"
          accessibilityRole="button"
        >
          <Image
            source={require("@/assets/karma-k-icon.jpg")}
            style={styles.fabLogo}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>

      {/* ── Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={closeChat}
        statusBarTranslucent
      >
        {/* Dimmed backdrop */}
        <Pressable style={styles.backdrop} onPress={closeChat}>
          <View style={styles.backdropOverlay} />
        </Pressable>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheetOuter}
        >
          {/* Solid sheet — no bleed-through */}
          <View style={styles.sheet}>

            {/* Header */}
            <View style={styles.header}>
              {/* Logo — Karma K icon */}
              <Image
                source={require("@/assets/karma-k-icon.jpg")}
                style={styles.headerLogo}
                resizeMode="cover"
              />
              {/* Title block */}
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Karma AI</Text>
                <Text style={styles.headerSub}>
                  {busy ? "Thinking…" : "Carbon & sustainability assistant"}
                </Text>
              </View>
              {/* Close */}
              <TouchableOpacity
                onPress={closeChat}
                style={styles.closeBtn}
                activeOpacity={0.7}
                hitSlop={8}
              >
                <X size={17} color={C.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Messages area */}
            <ScrollView
              ref={scrollRef}
              style={styles.msgList}
              contentContainerStyle={styles.msgContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 ? (
                /* Empty state */
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyGreeting}>
                    {firstName ? `Hey ${firstName} 👋` : "Hey there 👋"}
                  </Text>
                  <Text style={styles.emptySub}>
                    Ask about your score, actions, Karma Coins, or anything
                    sustainability-related.
                  </Text>
                  <View style={styles.quickRow}>
                    {QUICK_PROMPTS.map((q) => {
                      const Icon = q.icon;
                      return (
                        <TouchableOpacity
                          key={q.label}
                          style={styles.quickChip}
                          onPress={() => void submit(q.prompt)}
                          activeOpacity={0.78}
                        >
                          <Icon size={13} color={C.primary} strokeWidth={2.2} />
                          <Text style={styles.quickLabel}>{q.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                /* Message bubbles */
                messages.map((msg) => {
                  const text = textFromMessage(msg);
                  const isUser = msg.role === "user";
                  const isStreaming = !isUser && busy && !text;

                  return (
                    <View
                      key={msg.id}
                      style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}
                    >
                      {/* AI avatar */}
                      {!isUser && (
                        <Image
                          source={require("@/assets/karma-k-icon.jpg")}
                          style={styles.msgAvatar}
                          resizeMode="cover"
                        />
                      )}

                      {isStreaming ? (
                        <View style={styles.bubbleAi}>
                          <TypingDots />
                        </View>
                      ) : text ? (
                        <View
                          style={[
                            styles.bubble,
                            isUser ? styles.bubbleUser : styles.bubbleAi,
                          ]}
                        >
                          <Text
                            style={[
                              styles.bubbleText,
                              isUser
                                ? styles.bubbleTextUser
                                : styles.bubbleTextAi,
                            ]}
                          >
                            {text}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Composer */}
            <View style={styles.composer}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask about your carbon footprint…"
                placeholderTextColor={C.textMuted}
                style={styles.input}
                onSubmitEditing={() => void submit(input)}
                returnKeyType="send"
                blurOnSubmit={false}
                multiline={false}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  !canSend && !busy && styles.sendBtnDisabled,
                ]}
                onPress={busy ? stop : () => void submit(input)}
                activeOpacity={0.8}
                disabled={!canSend && !busy}
              >
                {busy ? (
                  <Square size={16} color="#fff" strokeWidth={0} fill="#fff" />
                ) : (
                  <Send size={16} color="#fff" strokeWidth={2.2} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // FAB
  fabWrap: {
    position: "absolute",
    right: 20,
    zIndex: 99,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    ...Platform.select({
      ios: { boxShadow: "0px 3px 10px rgba(0,0,0,0.35)" } as any,
      android: { elevation: 6 },
    }),
  },
  fabLogo: {
    width: "100%",
    height: "100%",
  },

  // Modal
  backdrop: {
    flex: 1,
  },
  backdropOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(4, 14, 9, 0.72)",
  },
  sheetOuter: {
    height: "74%",
    marginHorizontal: 10,
    marginBottom: 10,
  },
  sheet: {
    flex: 1,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: C.bg,              // Solid dark — fully opaque, no bleed
    borderWidth: 1,
    borderColor: C.borderStrong,
    ...Platform.select({
      ios: { boxShadow: "0px 12px 40px rgba(0,0,0,0.6)" } as any,
      android: { elevation: 24 },
    }),
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  headerLogo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerTitle: {
    color: C.textPrimary,
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.2,
  },
  headerSub: {
    color: C.textMuted,
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginHorizontal: 0,
  },

  // Messages
  msgList: {
    flex: 1,
    backgroundColor: C.bg,
  },
  msgContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 12,
    flexGrow: 1,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
    paddingTop: 8,
  },
  emptyGreeting: {
    color: C.textPrimary,
    fontSize: 22,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.3,
  },
  emptySub: {
    color: C.textSecondary,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    lineHeight: 21,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#122318",
    borderWidth: 1,
    borderColor: C.borderStrong,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  quickLabel: {
    color: C.primary,
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
  },

  // Message rows
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  msgRowUser: {
    justifyContent: "flex-end",
  },
  msgRowAi: {
    justifyContent: "flex-start",
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    flexShrink: 0,
    overflow: "hidden",
  },

  // Bubbles
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: C.primary,
    borderTopRightRadius: 6,
    ...Platform.select({
      ios: { boxShadow: "0px 2px 8px rgba(46,168,110,0.35)" } as any,
      android: { elevation: 3 },
    }),
  },
  bubbleAi: {
    backgroundColor: C.bubbleAi,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: C.bubbleAiBorder,
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: "#FFFFFF",
    fontFamily: "Nunito_600SemiBold",
  },
  bubbleTextAi: {
    color: C.textPrimary,         // Full white — easy to read on dark bg
    fontFamily: "Nunito_400Regular",
  },

  // Typing dots
  dotsRow: {
    flexDirection: "row",
    gap: 5,
    paddingVertical: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.primary,
  },

  // Composer
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    backgroundColor: C.bgCard,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    color: C.textPrimary,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { boxShadow: "0px 3px 10px rgba(46,168,110,0.4)" } as any,
      android: { elevation: 4 },
    }),
  },
  sendBtnDisabled: {
    backgroundColor: "rgba(46,168,110,0.28)",
  },
});
