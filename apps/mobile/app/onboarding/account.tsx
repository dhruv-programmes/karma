import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  ChartColumn,
  Eye,
  EyeOff,
  Gift,
  Leaf,
  Lock,
  Mail,
  User,
} from "lucide-react-native";
import { Image, Text as RNText } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { api } from "@/src/lib/api";
import { useAuthStore } from "@/src/store/auth";

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

export default function OnboardingAccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setOnboardingStep = useAuthStore((s) => s.setOnboardingStep);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinueWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      const timestamp = Date.now();
      const mockEmail = `google.user.${timestamp}@carbonloop.app`;
      const res = await api.signup({
        name: "Google Member",
        email: mockEmail,
        password: "social-oauth-token-12345",
        monthly_budget_kg: 90,
      });
      setAuth(res.user, res.access_token);
      setOnboardingStep("baseline");
      router.replace("/onboarding/baseline");
    } catch {
      // Offline fallback
      const guestUser = {
        id: `guest-${Date.now()}`,
        name: "Google Member",
        email: "google@carbonloop.app",
        circularity_score: 642,
        impact_points: 0,
        streak_days: 1,
        trend_delta: 0,
        loop_level: 1,
        offset_kg_total: 0,
        monthly_budget_kg: 90,
      };
      setAuth(guestUser, "social-session-token");
      setOnboardingStep("baseline");
      router.replace("/onboarding/baseline");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignUp() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        monthly_budget_kg: 90,
      });
      setAuth(res.user, res.access_token);
      setOnboardingStep("baseline");
      router.replace("/onboarding/baseline");
    } catch (err: any) {
      const message = String(err?.message || "");
      setError(
        /account with this email already exists/i.test(message)
          ? "An account with this email already exists. Use Sign In below."
          : message || "Failed to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box className="flex-1" style={{ backgroundColor: "#F4F8F5" }}>
      {/* Top Navigation */}
      <Box
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 8,
        }}
      >
        <HStack className="items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white items-center justify-center border border-[#E0ECE3] shadow-xs"
            hitSlop={10}
          >
            <ArrowLeft size={18} color="#184A2C" />
          </Pressable>

          <Image
            source={require("@/assets/karma-text.png")}
            style={{ width: 130, height: 38 }}
            resizeMode="contain"
          />

          {/* Empty spacer to center logo, no settings icon */}
          <Box className="w-10 h-10" />
        </HStack>
      </Box>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 28,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Editorial Serif Hero Title */}
        <VStack className="items-center mt-2 mb-1">
          <RNText
            style={{
              fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
              fontSize: 38,
              lineHeight: 44,
              fontWeight: "700",
              color: "#182820",
              textAlign: "center",
            }}
          >
            Start your
          </RNText>
          <RNText
            style={{
              fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
              fontSize: 40,
              lineHeight: 46,
              fontWeight: "700",
              color: "#185331",
              textAlign: "center",
            }}
          >
            Carbon Loop
          </RNText>

          <Text
            size="sm"
            className="text-muted-foreground text-center mt-2 leading-relaxed font-body px-4 text-[15px]"
          >
            Your Carbon Score, actions and rewards{"\n"}are saved to your account.
          </Text>
        </VStack>

        {error ? (
          <Box className="mt-3 p-3.5 rounded-xl bg-destructive/10 border border-destructive/30">
            <Text size="xs" className="text-destructive font-medium text-center">
              {error}
            </Text>
          </Box>
        ) : null}

        {/* Continue with Google */}
        <Box className="mt-5">
          <Pressable
            onPress={handleContinueWithGoogle}
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-white border border-[#DFEAE2] flex-row items-center justify-center gap-3 px-4 active:bg-neutral-50"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1.5 },
              shadowOpacity: 0.04,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#1E5E3A" />
            ) : (
              <>
                <GoogleLogo />
                <Text bold size="sm" className="text-[#1A2820] font-body text-[15px]">
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>
        </Box>

        {/* OR Divider */}
        <HStack className="items-center gap-3 my-3 px-2">
          <Box className="flex-1 h-[1px] bg-[#DFEAE2]" />
          <Text size="xs" className="text-[#7C9084] font-body uppercase tracking-[2px] text-[11px] font-medium">
            or
          </Text>
          <Box className="flex-1 h-[1px] bg-[#DFEAE2]" />
        </HStack>

        {/* Continue with phone or email */}
        {!showEmailForm ? (
          <Pressable
            onPress={() => setShowEmailForm(true)}
            className="w-full h-14 rounded-2xl bg-[#EAF4ED] border border-[#C8E1D1] flex-row items-center justify-center gap-2.5 px-4 active:bg-[#DFEFE5]"
          >
            <Mail size={19} color="#1B5E39" strokeWidth={1.8} />
            <Text bold size="sm" style={{ color: "#1B5E39" }} className="font-body text-[15px]">
              Continue with phone or email
            </Text>
          </Pressable>
        ) : (
          <Card variant="outline" className="p-4 gap-3.5 border-border rounded-2xl bg-card/90">
            <VStack space="xs">
              <Text size="xs" bold className="text-foreground font-body">
                Full Name
              </Text>
              <Box className="flex-row items-center h-12 px-3.5 rounded-xl border border-border bg-card">
                <User size={18} color="rgb(100,120,110)" />
                <TextInput
                  className="flex-1 ml-3 text-foreground font-body text-sm"
                  placeholder="e.g. Maya Sen"
                  placeholderTextColor="rgb(150,170,160)"
                  value={name}
                  onChangeText={setName}
                />
              </Box>
            </VStack>

            <VStack space="xs">
              <Text size="xs" bold className="text-foreground font-body">
                Email address
              </Text>
              <Box className="flex-row items-center h-12 px-3.5 rounded-xl border border-border bg-card">
                <Mail size={18} color="rgb(100,120,110)" />
                <TextInput
                  className="flex-1 ml-3 text-foreground font-body text-sm"
                  placeholder="you@example.com"
                  placeholderTextColor="rgb(150,170,160)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </Box>
            </VStack>

            <VStack space="xs">
              <Text size="xs" bold className="text-foreground font-body">
                Password
              </Text>
              <Box className="flex-row items-center h-12 px-3.5 rounded-xl border border-border bg-card">
                <Lock size={18} color="rgb(100,120,110)" />
                <TextInput
                  className="flex-1 ml-3 text-foreground font-body text-sm"
                  placeholder="At least 6 characters"
                  placeholderTextColor="rgb(150,170,160)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={18} color="rgb(100,120,110)" />
                  ) : (
                    <Eye size={18} color="rgb(100,120,110)" />
                  )}
                </Pressable>
              </Box>
            </VStack>

            <Button
              onPress={handleEmailSignUp}
              disabled={loading}
              className="mt-2 h-12 rounded-xl"
            >
              {loading ? (
                <HStack className="items-center gap-2 min-w-0">
                  <ActivityIndicator color="white" size="small" />
                  <ButtonText className="text-primary-foreground font-body">
                    Creating Account...
                  </ButtonText>
                </HStack>
              ) : (
                <HStack className="items-center justify-center gap-2 min-w-0 px-2">
                  <ButtonText className="text-primary-foreground font-body">
                    Continue to Baseline
                  </ButtonText>
                  <ArrowRight size={16} color="white" />
                </HStack>
              )}
            </Button>
          </Card>
        )}

        {/* 3D Glass Carbon Loop Illustration with Floating Badges */}
        <Box className="w-full mt-4 rounded-3xl overflow-hidden relative items-center justify-center" style={{ height: 340 }}>
          <Image
            source={require("@/assets/carbon-loop-ring.jpg")}
            style={{ width: "100%", height: "100%", borderRadius: 28 }}
            resizeMode="cover"
          />

          {/* Floating Badge 1: Actions */}
          <Box
            className="absolute top-4 left-2 flex-row items-center gap-2.5 px-3 py-2 rounded-full bg-white/95 border border-[#E0ECE3]"
            style={{
              shadowColor: "#184A2C",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Box className="w-8 h-8 rounded-full bg-[#EAF5ED] items-center justify-center">
              <Leaf size={15} color="#184A2C" />
            </Box>
            <VStack>
              <Text bold size="xs" className="text-foreground leading-tight">
                Actions
              </Text>
              <Text size="xs" className="text-muted-foreground font-body text-[10px]">
                Make better choices
              </Text>
            </VStack>
          </Box>

          {/* Floating Badge 2: Impact */}
          <Box
            className="absolute bottom-6 left-2 flex-row items-center gap-2.5 px-3 py-2 rounded-full bg-white/95 border border-[#E0ECE3]"
            style={{
              shadowColor: "#184A2C",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Box className="w-8 h-8 rounded-full bg-[#EAF5ED] items-center justify-center">
              <ChartColumn size={15} color="#184A2C" />
            </Box>
            <VStack>
              <Text bold size="xs" className="text-foreground leading-tight">
                Impact
              </Text>
              <Text size="xs" className="text-muted-foreground font-body text-[10px]">
                See the difference
              </Text>
            </VStack>
          </Box>

          {/* Floating Badge 3: Rewards */}
          <Box
            className="absolute top-[52%] right-2 flex-row items-center gap-2.5 px-3 py-2 rounded-full bg-white/95 border border-[#E0ECE3]"
            style={{
              shadowColor: "#184A2C",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Box className="w-8 h-8 rounded-full bg-[#EAF5ED] items-center justify-center">
              <Gift size={15} color="#184A2C" />
            </Box>
            <VStack>
              <Text bold size="xs" className="text-foreground leading-tight">
                Rewards
              </Text>
              <Text size="xs" className="text-muted-foreground font-body text-[10px]">
                Get more value
              </Text>
            </VStack>
          </Box>

          {/* Typographic Tagline: A CLEANER TOMORROW PAYS BACK */}
          <VStack className="absolute top-5 right-5 items-start gap-0.5">
            <Text style={{ letterSpacing: 2.2, fontSize: 8.5, color: "#4A725C", fontWeight: "700" }}>
              A
            </Text>
            <Text style={{ letterSpacing: 2.2, fontSize: 8.5, color: "#4A725C", fontWeight: "700" }}>
              CLEANER
            </Text>
            <Text style={{ letterSpacing: 2.2, fontSize: 8.5, color: "#4A725C", fontWeight: "700" }}>
              TOMORROW
            </Text>
            <Text style={{ letterSpacing: 2.2, fontSize: 8.5, color: "#4A725C", fontWeight: "700" }}>
              PAYS
            </Text>
            <Text style={{ letterSpacing: 2.2, fontSize: 8.5, color: "#4A725C", fontWeight: "700" }}>
              BACK
            </Text>
            <Box className="w-6 h-[1.5px] bg-[#4A725C]/60 mt-0.5" />
          </VStack>
        </Box>

        {/* Existing user? Sign in */}
        <HStack className="justify-center items-center gap-1.5 mt-5">
          <Text size="sm" className="text-muted-foreground font-body">
            Existing user?
          </Text>
          <Pressable
            onPress={() => router.push("/auth/signin" as import("expo-router").Href)}
            hitSlop={8}
          >
            <Text size="sm" bold style={{ color: "#1E5E3A" }} className="font-body">
              Sign in
            </Text>
          </Pressable>
        </HStack>

        {/* Privacy Terms Help */}
        <Text
          size="xs"
          className="text-muted-foreground/70 text-center mt-3 font-body text-[11px]"
        >
          Privacy   ·   Terms   ·   Help
        </Text>
      </ScrollView>
    </Box>
  );
}
