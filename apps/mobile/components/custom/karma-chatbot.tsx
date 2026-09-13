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
import {
  ChevronRight,
  Leaf,
  Send,
  Sparkles,
  Square,
  TrendingUp,
  X,
} from "lucide-react-native";
import {
  createUserSupportMessage,
  streamSupportChat,
  type SupportMessage,
} from "@/src/lib/support-chat";
import { useAuthStore } from "@/src/store/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_DOCK_BOTTOM_GAP, TAB_DOCK_HEIGHT } from "@/src/theme/layout";

const QUICK_PROMPTS = [
  {
    label: "My circularity score",
    prompt: "What is my circularity score and what does it mean?",
    icon: TrendingUp,
  },
  {
    label: "Earn Karma Coins",
    prompt: "How do I earn more Karma Coins?",
    icon: Sparkles,
  },
  {
    label: "Highest-impact action",
    prompt: "What is the single highest-impact action I can take right now?",
    icon: Leaf,
  },
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
  }, []);

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
          activeOpacity={0.85}
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

      {/* ── Bottom Sheet Modal (White Background, No Emojis) ────── */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={closeChat}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          {/* Dimmed backdrop area: tapping closes sheet */}
          <Pressable style={styles.backdropPressable} onPress={closeChat} />

          {/* Bottom Sheet container */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.sheetWrapper}
          >
            <View style={styles.sheet}>
              {/* Grab Handle */}
              <View style={styles.grabHandleWrap}>
                <View style={styles.grabHandle} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerAvatarWrap}>
                  <Image
                    source={require("@/assets/karma-k-icon.jpg")}
                    style={styles.headerLogo}
                    resizeMode="cover"
                  />
                  <View style={styles.onlineDot} />
                </View>

                <View style={styles.headerText}>
                  <Text style={styles.headerTitle}>Karma AI</Text>
                  <Text style={styles.headerSub}>
                    {busy ? "Thinking…" : "Carbon & sustainability assistant"}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={closeChat}
                  style={styles.closeBtn}
                  activeOpacity={0.75}
                  hitSlop={8}
                >
                  <X size={17} color="#0B1D12" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              {/* Hairline Divider */}
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
                  /* Empty state (Clean White, No Emojis) */
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyGreeting}>
                      {firstName ? `Hello ${firstName}` : "Welcome to Karma AI"}
                    </Text>
                    <Text style={styles.emptySub}>
                      Ask about your carbon footprint, circular actions, or how to grow your Karma Coins balance.
                    </Text>

                    {/* Suggested Question Cards (No Emojis, No Pillboxes) */}
                    <View style={styles.promptList}>
                      <Text style={styles.promptListLabel}>SUGGESTED QUESTIONS</Text>
                      {QUICK_PROMPTS.map((q) => {
                        const Icon = q.icon;
                        return (
                          <TouchableOpacity
                            key={q.label}
                            style={styles.promptCard}
                            onPress={() => void submit(q.prompt)}
                            activeOpacity={0.78}
                          >
                            <View style={styles.promptIconWrap}>
                              <Icon size={16} color="#2EA86E" strokeWidth={2.2} />
                            </View>
                            <View style={styles.promptCopy}>
                              <Text style={styles.promptTitle}>{q.label}</Text>
                              <Text style={styles.promptSub} numberOfLines={1}>
                                {q.prompt}
                              </Text>
                            </View>
                            <ChevronRight
                              size={15}
                              color="#94A3B8"
                              strokeWidth={2.2}
                            />
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
                        style={[
                          styles.msgRow,
                          isUser ? styles.msgRowUser : styles.msgRowAi,
                        ]}
                      >
                        {!isUser && (
                          <View style={styles.msgAvatarWrap}>
                            <Image
                              source={require("@/assets/karma-k-icon.jpg")}
                              style={styles.msgAvatar}
                              resizeMode="cover"
                            />
                          </View>
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
                                isUser ? styles.bubbleTextUser : styles.bubbleTextAi,
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
              <View
                style={[
                  styles.composer,
                  { paddingBottom: Math.max(insets.bottom, 12) + 8 },
                ]}
              >
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask about your carbon footprint…"
                  placeholderTextColor="#789185"
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
                    <Square size={15} color="#FFFFFF" strokeWidth={0} fill="#FFFFFF" />
                  ) : (
                    <Send size={15} color="#FFFFFF" strokeWidth={2.4} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Floating Action Button (FAB)
  fabWrap: {
    position: "absolute",
    right: 18,
    zIndex: 99,
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(46,168,110,0.35)",
    shadowColor: "#05180E",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabLogo: {
    width: "100%",
    height: "100%",
  },

  // Modal & Backdrop Structure
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(10, 24, 16, 0.45)",
    justifyContent: "flex-end",
  },
  backdropPressable: {
    flex: 1,
  },
  sheetWrapper: {
    width: "100%",
    height: "88%",
    maxHeight: "92%",
  },
  sheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(215, 235, 222, 0.95)",
    shadowColor: "#05180E",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },

  // Grab Handle
  grabHandleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: "#FFFFFF",
  },
  grabHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#D1DDD5",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  headerAvatarWrap: {
    position: "relative",
  },
  headerLogo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.22)",
  },
  onlineDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2EA86E",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerTitle: {
    color: "#0B1D12",
    fontSize: 17,
    fontFamily: "Nunito_900Black",
    letterSpacing: -0.2,
  },
  headerSub: {
    color: "#5F7768",
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0F7F2",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#EDF3EF",
  },

  // Messages Area
  msgList: {
    flex: 1,
    backgroundColor: "#F8FCFA",
  },
  msgContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 12,
    flexGrow: 1,
  },

  // Empty State (Clean White, No Emojis)
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  emptyGreeting: {
    color: "#0B1D12",
    fontSize: 24,
    fontFamily: "Nunito_900Black",
    letterSpacing: -0.3,
  },
  emptySub: {
    color: "#5F7768",
    fontSize: 13.5,
    fontFamily: "Nunito_600SemiBold",
    lineHeight: 20,
  },
  promptList: {
    gap: 8,
    marginTop: 12,
  },
  promptListLabel: {
    color: "#789185",
    fontSize: 11,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  promptCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "rgba(215, 235, 222, 0.95)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#0F281B",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  promptIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#E8F7EE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  promptCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  promptTitle: {
    color: "#0B1D12",
    fontSize: 13.5,
    fontFamily: "Nunito_800ExtraBold",
  },
  promptSub: {
    color: "#5F7768",
    fontSize: 11.5,
    fontFamily: "Nunito_600SemiBold",
  },

  // Message Rows
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
  msgAvatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.22)",
    flexShrink: 0,
  },
  msgAvatar: {
    width: "100%",
    height: "100%",
  },

  // Bubbles
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: "#0D251A",
    borderBottomRightRadius: 4,
    shadowColor: "#0A2014",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bubbleAi: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 4,
    borderWidth: 1.2,
    borderColor: "rgba(215, 235, 222, 0.95)",
    maxWidth: "80%",
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 18,
    shadowColor: "#0F281B",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: "#FFFFFF",
    fontFamily: "Nunito_600SemiBold",
  },
  bubbleTextAi: {
    color: "#0B1D12",
    fontFamily: "Nunito_400Regular",
  },

  // Typing Dots
  dotsRow: {
    flexDirection: "row",
    gap: 5,
    paddingVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#2EA86E",
  },

  // Composer
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EDF3EF",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F4FAF6",
    borderWidth: 1.2,
    borderColor: "rgba(215, 235, 222, 0.95)",
    paddingHorizontal: 15,
    color: "#0B1D12",
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#0D251A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0A2014",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: "rgba(13,37,26,0.22)",
  },
});
