import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView as RNScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import {
  ArrowUp,
  Camera,
  ChevronLeft,
  Gift,
  Leaf,
  Sparkles,
  Square,
  TrendingUp,
} from "lucide-react-native";
import { ChatMarkdown } from "@/components/custom/chat-markdown";
import { TypingDots } from "@/components/custom/typing-dots";
import {
  createUserSupportMessage,
  streamSupportChat,
  type SupportMessage,
  type SupportMessagePart,
  type SupportToolPart,
} from "@/src/lib/support-chat";
import { useAuthStore } from "@/src/store/auth";

const C = {
  canvas: "#F4FAF6",
  ink: "#0D1811",
  inkSoft: "#183222",
  muted: "#6B8576",
  line: "rgba(46,168,110,0.14)",
  primary: "#2EA86E",
  primaryDeep: "#1B7A4E",
  white: "#FFFFFF",
  bubbleAi: "#FFFFFF",
  bubbleAiBorder: "rgba(46,168,110,0.12)",
} as const;

const USER_BUBBLE_GRAD = ["#34B87A", "#1F8F5A"] as const;

const SUGGESTIONS = [
  {
    label: "My benefits",
    prompt: "What benefits do I get by using Karma?",
    icon: Sparkles,
  },
  {
    label: "My Karma",
    prompt: "How much karma do I have right now?",
    icon: Leaf,
  },
  {
    label: "Score vs points",
    prompt: "What's the difference between my score and Impact Points?",
    icon: TrendingUp,
  },
  {
    label: "Scan a product",
    prompt: "How do I scan a product?",
    icon: Camera,
  },
  {
    label: "Offsets",
    prompt: "Show me offset projects",
    icon: Gift,
  },
] as const;

const OPEN_SCREEN_HREF: Record<string, Href> = {
  "/scan": "/scan" as Href,
  "/receipt": "/receipt" as Href,
  "/rewards": "/rewards" as Href,
  "/offsets": "/offsets" as Href,
  "/map": "/map" as Href,
  "/(tabs)": "/(tabs)" as Href,
  "/(tabs)/tools": "/(tabs)/tools" as Href,
  "/(tabs)/offers": "/(tabs)/offers" as Href,
  "/(tabs)/profile": "/(tabs)/profile" as Href,
  "/support": "/support" as Href,
};

const TUCK = 5;
const ROUND = 20;

function bubbleRadius(speaker: "ai" | "user") {
  return {
    borderTopLeftRadius: speaker === "ai" ? TUCK : ROUND,
    borderTopRightRadius: speaker === "user" ? TUCK : ROUND,
    borderBottomLeftRadius: ROUND,
    borderBottomRightRadius: ROUND,
  };
}

function ToolChip({ label, status }: { label: string; status: string }) {
  return (
    <View style={styles.toolChip}>
      <View style={styles.toolDot} />
      <Text style={styles.toolLabel}>{label}</Text>
      <Text style={styles.toolStatus}>{status}</Text>
    </View>
  );
}

function toolLabel(toolName: string) {
  switch (toolName) {
    case "getAppBenefits":
      return "App info";
    case "getFeatureGuide":
      return "How-to";
    case "explainScoreAndPoints":
      return "Score guide";
    case "getMyScore":
    case "getMyKarma":
      return "Your Karma";
    case "getMyImpact":
      return "Your impact";
    case "listRewards":
      return "Rewards";
    case "listOffsets":
      return "Offsets";
    case "nearbyFacilities":
      return "Nearby places";
    case "openScreen":
      return "Open screen";
    default:
      return "Tool";
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function openScreenFromPart(part: SupportToolPart): { route: string } {
  const fromOutput = asRecord(part.output);
  const fromInput = asRecord(part.input);
  const route = String(fromOutput?.route ?? fromInput?.route ?? "");
  return { route };
}

function messageHasVisibleContent(message: SupportMessage) {
  return message.parts.some((p) => {
    if (p.type === "text") return Boolean(p.text.trim());
    if (p.type.startsWith("tool-")) return true;
    return false;
  });
}

function Atmosphere() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["#F7FBF8", "#F4FAF6"]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function EmptyHero({
  firstName,
  onAsk,
}: {
  firstName: string;
  onAsk: (prompt: string) => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(360)} style={styles.emptyWrap}>
      <Text style={styles.heroEyebrow}>SUPPORT</Text>
      <Text style={styles.heroTitle}>
        {firstName ? `Hey ${firstName}` : "How can we help?"}
      </Text>
      <Text style={styles.heroSub}>
        Ask about your score, Impact Points, scans, rewards, or how Karma works.
      </Text>

      <View style={styles.suggestGrid}>
        {SUGGESTIONS.map((s, i) => {
          const Icon = s.icon;
          return (
            <Animated.View
              key={s.label}
              entering={FadeInUp.delay(60 + i * 45).duration(280)}
              style={styles.suggestCell}
            >
              <Pressable
                onPress={() => onAsk(s.prompt)}
                style={({ pressed }) => [
                  styles.suggestChip,
                  pressed && styles.suggestChipPressed,
                ]}
              >
                <View style={styles.suggestIcon}>
                  <Icon size={16} color={C.primary} strokeWidth={2.1} />
                </View>
                <Text style={styles.suggestText}>{s.label}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userName = useAuthStore((s) => s.user?.name);
  const firstName = (userName || "").trim().split(/\s+/)[0] || "";
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<RNScrollView>(null);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const changeEvent =
      Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";

    const applyKeyboard = (e: {
      endCoordinates: { height: number; screenY: number };
    }) => {
      const fromHeight = e.endCoordinates.height ?? 0;
      setKeyboardHeight(Math.max(0, fromHeight));
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    };

    const showSub = Keyboard.addListener(showEvent, applyKeyboard);
    const changeSub = Keyboard.addListener(changeEvent, applyKeyboard);
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      changeSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, busy]);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    void Haptics.selectionAsync();
    setError(null);
    setInput("");
    Keyboard.dismiss();
    const userMsg = createUserSupportMessage(trimmed);
    const history = [...messages, userMsg];
    setMessages(history);
    setBusy(true);

    const assistantId = `assistant-pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", parts: [] },
    ]);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const upsertAssistant = (assistant: SupportMessage) => {
      setMessages((prev) => {
        const copy = [...prev];
        const pendingIdx = copy.findIndex((m) => m.id === assistantId);
        const realIdx = copy.findIndex((m) => m.id === assistant.id);
        if (realIdx >= 0) {
          copy[realIdx] = assistant;
          if (pendingIdx >= 0 && pendingIdx !== realIdx) {
            copy.splice(pendingIdx, 1);
          }
        } else if (pendingIdx >= 0) {
          copy[pendingIdx] = assistant;
        } else {
          copy.push(assistant);
        }
        return copy;
      });
    };

    try {
      await streamSupportChat(
        {
          messages: history,
          userName: useAuthStore.getState().user?.name,
        },
        {
          onPartial: upsertAssistant,
          onFinish: upsertAssistant,
        },
        controller.signal
      );
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } else {
        setError(
          e instanceof Error
            ? e.message
            : "Something went wrong. Check that the AI service is running on port 8001."
        );
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

  function renderPart(part: SupportMessagePart, key: string) {
    if (part.type === "text") {
      if (!part.text) return null;
      return <ChatMarkdown key={key}>{part.text}</ChatMarkdown>;
    }

    if (part.type === "step-start") return null;

    if (part.type.startsWith("tool-")) {
      const toolPart = part as SupportToolPart;
      const label = toolLabel(toolPart.toolName);
      const running =
        toolPart.state === "input-streaming" ||
        toolPart.state === "input-available";

      if (toolPart.toolName === "openScreen") {
        const { route } = openScreenFromPart(toolPart);
        const href = OPEN_SCREEN_HREF[route];
        return (
          <View key={key} style={{ marginTop: 8, gap: 8 }}>
            <ToolChip
              label={label}
              status={running ? "looking up…" : "ready"}
            />
            {!running && href ? (
              <Pressable
                onPress={() => router.push(href)}
                style={({ pressed }) => [
                  styles.openBtn,
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Text style={styles.openBtnText}>Open</Text>
              </Pressable>
            ) : null}
          </View>
        );
      }

      if (toolPart.state === "output-error") {
        return <ToolChip key={key} label={label} status="failed" />;
      }

      return (
        <ToolChip
          key={key}
          label={label}
          status={running ? "calling…" : "done"}
        />
      );
    }

    return null;
  }

  // Extra gap so the composer doesn't sit flush against the keyboard.
  const KEYBOARD_GAP = 14;
  const bottomSpacer =
    keyboardHeight > 0
      ? keyboardHeight + KEYBOARD_GAP + (Platform.OS === "android" ? 8 : 0)
      : Math.max(insets.bottom, 12);
  const canSend = input.trim().length > 0 && !busy;

  return (
    <View style={styles.root}>
      <Atmosphere />

      <View style={{ paddingTop: insets.top + 6, flex: 1 }}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <ChevronLeft size={22} color={C.inkSoft} strokeWidth={2.2} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Support
            </Text>
            <Text style={styles.headerStatus}>
              {busy ? "Thinking…" : "Ask about Karma"}
            </Text>
          </View>

          {messages.length > 0 ? (
            <Pressable
              onPress={() => {
                stop();
                setMessages([]);
                setError(null);
                setInput("");
              }}
              hitSlop={10}
              style={styles.clearBtn}
            >
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        <RNScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.length === 0 ? (
            <EmptyHero
              firstName={firstName}
              onAsk={(prompt) => void submit(prompt)}
            />
          ) : null}

          {messages.map((message, msgIndex) => {
            const showTyping =
              busy &&
              message.role === "assistant" &&
              !messageHasVisibleContent(message);
            const isUser = message.role === "user";

            return (
              <Animated.View
                key={message.id}
                entering={FadeInDown.delay(Math.min(msgIndex, 4) * 30).duration(
                  220
                )}
                style={[
                  styles.msgRow,
                  isUser ? styles.msgRowUser : styles.msgRowAi,
                ]}
              >
                {isUser ? (
                  <LinearGradient
                    colors={[...USER_BUBBLE_GRAD]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.bubble, bubbleRadius("user"), styles.userShadow]}
                  >
                    {message.parts.map((part, index) =>
                      part.type === "text" ? (
                        <Text
                          key={`${message.id}-${index}`}
                          style={styles.userText}
                        >
                          {part.text}
                        </Text>
                      ) : null
                    )}
                  </LinearGradient>
                ) : (
                  <View
                    style={[
                      styles.bubble,
                      styles.aiBubble,
                      bubbleRadius("ai"),
                      styles.aiShadow,
                    ]}
                  >
                    {showTyping ? (
                      <TypingDots />
                    ) : (
                      <>
                        {message.parts.map((part, index) =>
                          renderPart(part, `${message.id}-${index}`)
                        )}
                        {busy &&
                        message.id === messages[messages.length - 1]?.id &&
                        !message.parts.some(
                          (p) => p.type === "text" && p.text.trim()
                        ) ? (
                          <View style={{ marginTop: 4 }}>
                            <TypingDots />
                          </View>
                        ) : null}
                      </>
                    )}
                  </View>
                )}
              </Animated.View>
            );
          })}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </RNScrollView>

        <View style={styles.composerShell}>
          <View style={styles.composer}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask Karma anything…"
              placeholderTextColor={C.muted}
              editable
              multiline
              style={styles.input}
              onFocus={() => {
                requestAnimationFrame(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                });
              }}
              onSubmitEditing={() => {
                if (canSend) void submit(input);
              }}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <Pressable
              onPress={() => {
                if (busy) stop();
                else if (canSend) void submit(input);
              }}
              disabled={!busy && !canSend}
              style={({ pressed }) => [
                styles.sendBtn,
                (busy || canSend) && styles.sendBtnActive,
                pressed && { transform: [{ scale: 0.96 }] },
                !busy && !canSend && styles.sendBtnIdle,
              ]}
              accessibilityLabel={busy ? "Stop" : "Send"}
            >
              {busy ? (
                <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <ArrowUp
                  size={18}
                  color={canSend ? "#FFFFFF" : "#6B8576"}
                  strokeWidth={2.6}
                />
              )}
            </Pressable>
          </View>
        </View>

        <View style={{ height: bottomSpacer }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.canvas,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: C.line,
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
    color: C.ink,
    letterSpacing: -0.3,
  },
  headerStatus: {
    marginTop: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: C.muted,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: C.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 12,
    flexGrow: 1,
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  heroEyebrow: {
    fontFamily: "IBMPlexMono_500Medium",
    fontSize: 11,
    letterSpacing: 1.6,
    color: C.primary,
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 28,
    color: C.ink,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  heroSub: {
    marginTop: 8,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: C.muted,
    textAlign: "center",
    maxWidth: 300,
  },
  suggestGrid: {
    marginTop: 28,
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  suggestCell: {
    width: "46%",
    minWidth: 140,
    maxWidth: 180,
  },
  suggestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.22)",
  },
  suggestChipPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "rgba(46,168,110,0.14)",
  },
  suggestIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(46,168,110,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestText: {
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    lineHeight: 17,
    color: C.inkSoft,
    backgroundColor: "transparent",
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    maxWidth: "100%",
  },
  msgRowAi: {
    alignSelf: "flex-start",
    paddingRight: 36,
  },
  msgRowUser: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
    paddingLeft: 36,
  },
  bubble: {
    maxWidth: "100%",
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  aiBubble: {
    backgroundColor: C.bubbleAi,
    borderWidth: 1,
    borderColor: C.bubbleAiBorder,
  },
  aiShadow: {
    shadowColor: "#0D1811",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  userShadow: {
    shadowColor: "#1B7A4E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  userText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: C.white,
  },
  toolChip: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(46,168,110,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.28)",
    maxWidth: "100%",
  },
  toolDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
  },
  toolLabel: {
    fontFamily: "IBMPlexMono_500Medium",
    fontSize: 11,
    lineHeight: 14,
    color: C.primaryDeep,
    backgroundColor: "transparent",
  },
  toolStatus: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    lineHeight: 14,
    color: C.muted,
    backgroundColor: "transparent",
  },
  openBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  openBtnText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: C.white,
  },
  errorBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(230,90,80,0.1)",
    borderWidth: 1,
    borderColor: "rgba(230,90,80,0.25)",
  },
  errorText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#C0453C",
  },
  composerShell: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 4,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: "#0D1811",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: 10,
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    lineHeight: 21,
    color: "#0D1811",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  sendBtnActive: {
    backgroundColor: "#2EA86E",
  },
  sendBtnIdle: {
    backgroundColor: "rgba(46,168,110,0.08)",
  },
});
