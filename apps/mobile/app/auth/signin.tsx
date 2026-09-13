import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  UserCheck,
} from "lucide-react-native";
import { Image } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/avatar";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { api } from "@/src/lib/api";
import { type OnboardingStep, useAuthStore } from "@/src/store/auth";
import type { DemoUserSummary } from "@/src/types/api";

function GoogleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
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

const FALLBACK_DEMO_USERS: DemoUserSummary[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Aisha Sharma",
    email: "aisha@example.com",
    role_description: "Urban eco builder · Carbon Credit Score 740 · 420 Karma Coins",
    circularity_score: 74,
    impact_points: 420,
    streak_days: 5,
    monthly_budget_kg: 90.0,
  },
  {
    id: "11111111-1111-1111-1111-111111111112",
    name: "Rohan Patel",
    email: "rohan@example.com",
    role_description: "Eco Minimalist · Carbon Credit Score 810 · 850 Karma Coins",
    circularity_score: 88,
    impact_points: 850,
    streak_days: 19,
    monthly_budget_kg: 60.0,
  },
  {
    id: "11111111-1111-1111-1111-111111111113",
    name: "Maya Sen",
    email: "maya@example.com",
    role_description: "Convenience Shopper · Carbon Credit Score 560 · 110 Karma Coins",
    circularity_score: 52,
    impact_points: 110,
    streak_days: 2,
    monthly_budget_kg: 140.0,
  },
];

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const startDemo = useAuthStore((s) => s.startDemo);
  const onboardingStep = useAuthStore((s) => s.onboardingStep);
  const setOnboardingStep = useAuthStore((s) => s.setOnboardingStep);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoUsers, setDemoUsers] = useState<DemoUserSummary[]>(FALLBACK_DEMO_USERS);

  useEffect(() => {
    api
      .getDemoUsers()
      .then((users) => {
        if (users && users.length > 0) setDemoUsers(users);
      })
      .catch(() => {});
  }, []);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      // Authenticate via OAuth provider simulation
      const mockEmail = `google.member@carbonloop.app`;
      const res = await api.signin(mockEmail, "social-oauth-token-12345").catch(async () => {
        // Fallback or create if not existing
        return await api.signup({
          name: "Google Member",
          email: mockEmail,
          password: "social-oauth-token-12345",
          monthly_budget_kg: 90,
        });
      });
      setAuth(res.user, res.access_token, true);
      queryClient.invalidateQueries();
      router.replace("/(tabs)");
    } catch {
      // Offline fallback
      const socialUser = {
        id: `social-${Date.now()}`,
        name: "Google Member",
        email: "google@carbonloop.app",
        circularity_score: 642,
        impact_points: 420,
        streak_days: 5,
        trend_delta: 14,
        loop_level: 2,
        offset_kg_total: 12,
        monthly_budget_kg: 90,
      };
      setAuth(socialUser, "social-session-token", true);
      queryClient.invalidateQueries();
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn(targetEmail = email, targetPassword = password, forceComplete = false) {
    if (!targetEmail.trim() || !targetPassword.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await api.signin(
        targetEmail.trim().toLowerCase(),
        targetPassword.trim()
      );
      // The server returns a baseline timestamp only after the questionnaire
      // has been saved. Do not send a returning, unfinished account into tabs.
      const needsBaseline = res.user.baseline_total_kg == null;
      const isComplete = forceComplete || !needsBaseline;
      setAuth(res.user, res.access_token, isComplete);
      queryClient.invalidateQueries();

      if (isComplete) {
        router.replace("/(tabs)");
      } else {
        // Resume the locally known step when possible; a fresh device can
        // safely resume from the first server-verifiable missing step.
        const step: OnboardingStep =
          onboardingStep === "welcome" || onboardingStep === "account"
            ? "baseline"
            : onboardingStep;
        setOnboardingStep(step);
        if (step === "baseline") router.replace("/onboarding/baseline");
        else if (step === "goal") router.replace("/onboarding/goal");
        else if (step === "reveal") router.replace("/onboarding/reveal");
        else if (step === "location") router.replace("/onboarding/location");
        else router.replace("/(tabs)");
      }
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  }

  function launchDemoPersona(persona: DemoUserSummary) {
    startDemo({
      id: persona.id,
      name: persona.name,
      email: persona.email,
      circularity_score: persona.circularity_score,
      impact_points: persona.impact_points,
      streak_days: persona.streak_days,
      monthly_budget_kg: persona.monthly_budget_kg,
    });
    queryClient.invalidateQueries();
    router.replace("/(tabs)");
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/onboarding/account" as import("expo-router").Href);
    }
  }

  return (
    <Box
      className="flex-1"
      style={{
        backgroundColor: "#F4F8F5",
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 24,
      }}
    >
      {/* 1. Full-Screen Botanical Background (matching Welcome screen) */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <Image
          source={require("@/assets/carbon-loop-welcome-bg.jpg")}
          style={{
            width: "100%",
            height: "100%",
          }}
          resizeMode="cover"
        />
      </View>

      {/* Top Header */}
      <HStack className="items-center justify-between mb-4">
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-white/90 items-center justify-center border border-[#E1EDE4]"
          style={{
            shadowColor: "#184A2C",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 1,
          }}
          hitSlop={8}
        >
          <ArrowLeft size={18} color="#112318" />
        </Pressable>

        <Image
          source={require("@/assets/karma-text.png")}
          style={{ width: 100, height: 28 }}
          resizeMode="contain"
        />

        <Box className="w-10 h-10" />
      </HStack>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24, gap: 18 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <VStack space="xs" className="mt-1">
          <Heading size="2xl" className="font-heading text-[#112318] text-[29px] leading-tight">
            Welcome back
          </Heading>
          <Text size="sm" className="text-[#527060] mt-1 leading-relaxed font-body">
            Sign in to track your circular actions and impact.
          </Text>
        </VStack>

        {error ? (
          <Box className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30">
            <Text size="xs" className="text-destructive font-medium font-body">
              {error}
            </Text>
          </Box>
        ) : null}

        {/* Social Sign-In Button */}
        <Box>
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-13 rounded-2xl bg-white/95 border border-[#E1EDE4] flex-row items-center justify-center gap-3 px-3 active:bg-[#F4F8F5]"
            style={{
              shadowColor: "#184A2C",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <GoogleLogo />
            <Text bold size="sm" numberOfLines={1} className="shrink min-w-0 text-[#112318] font-body">
              Continue with Google
            </Text>
          </Pressable>
        </Box>

        {/* Divider */}
        <HStack className="items-center gap-3 my-0.5">
          <Box className="flex-1 h-[1px] bg-[#DCEAE0]" />
          <Text
            size="xs"
            numberOfLines={1}
            className="shrink min-w-0 text-[#6C8879] font-body uppercase tracking-wider text-[11px]"
          >
            or sign in with email
          </Text>
          <Box className="flex-1 h-[1px] bg-[#DCEAE0]" />
        </HStack>

        {/* Credentials Form */}
        <View
          className="p-5 gap-4 rounded-[24px] bg-white/95 border border-[#E1EDE4]"
          style={{
            shadowColor: "#184A2C",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <VStack space="xs">
            <Text size="xs" bold className="text-[#112318] font-body">
              Email address
            </Text>
            <Box className="flex-row items-center h-12 px-3.5 rounded-xl border border-[#DCEAE0] bg-[#FAFCFA]">
              <Mail size={18} color="#527060" />
              <TextInput
                className="flex-1 ml-3 text-[#112318] font-body text-sm"
                placeholder="you@example.com"
                placeholderTextColor="#8CA698"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </Box>
          </VStack>

          <VStack space="xs">
            <Text size="xs" bold className="text-[#112318] font-body">
              Password
            </Text>
            <Box className="flex-row items-center h-12 px-3.5 rounded-xl border border-[#DCEAE0] bg-[#FAFCFA]">
              <Lock size={18} color="#527060" />
              <TextInput
                className="flex-1 ml-3 text-[#112318] font-body text-sm"
                placeholder="••••••••"
                placeholderTextColor="#8CA698"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                {showPassword ? (
                  <EyeOff size={18} color="#527060" />
                ) : (
                  <Eye size={18} color="#527060" />
                )}
              </Pressable>
            </Box>
          </VStack>

          <Button
            onPress={() => handleSignIn()}
            disabled={loading}
            className="mt-1 h-12 rounded-xl bg-[#1E5E3A] active:bg-[#16472C] opacity-100"
          >
            {loading ? (
              <HStack className="items-center gap-2 min-w-0">
                <ActivityIndicator color="white" size="small" />
                <ButtonText className="text-white font-body">
                  Signing in...
                </ButtonText>
              </HStack>
            ) : (
              <HStack className="items-center justify-center gap-2 min-w-0">
                <ButtonText className="text-white font-body font-bold">
                  Sign In
                </ButtonText>
                <ArrowRight size={16} color="white" />
              </HStack>
            )}
          </Button>
        </View>

        {/* Profiles Card */}
        <View
          className="p-3.5 gap-2.5 rounded-[20px] border border-[#D4E8DC] bg-white/85"
          style={{
            shadowColor: "#184A2C",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
          }}
        >
          <HStack className="items-center gap-1.5 min-w-0">
            <UserCheck size={15} color="#1E5E3A" />
            <Text
              size="xs"
              bold
              numberOfLines={1}
              className="text-[#1E5E3A] tracking-wider uppercase font-mono text-[11px]"
            >
              Profiles
            </Text>
          </HStack>

          <VStack space="xs">
            {demoUsers.map((persona) => (
              <Pressable
                key={persona.id}
                onPress={() => launchDemoPersona(persona)}
                className="h-10 px-3 rounded-xl bg-white border border-[#E1EDE4] flex-row items-center justify-between active:bg-[#F4F8F5]"
              >
                <HStack className="items-center gap-2.5 flex-1 min-w-0">
                  <View className="w-6 h-6 rounded-full bg-[#E2F2E8] items-center justify-center border border-[#C5E4D2]">
                    <Text className="text-[11px] font-bold text-[#1E5E3A]">
                      {persona.name[0]}
                    </Text>
                  </View>
                  <Text
                    bold
                    size="xs"
                    numberOfLines={1}
                    className="text-[#112318] font-body"
                  >
                    {persona.name}
                  </Text>
                </HStack>
                <ArrowRight size={13} color="#1E5E3A" />
              </Pressable>
            ))}
          </VStack>
        </View>
      </ScrollView>

      {/* Footer Navigation */}
      <HStack className="justify-center items-center gap-1.5 pt-2">
        <Text size="sm" className="text-[#527060] font-body">
          Don't have an account?
        </Text>
        <Pressable
          onPress={() => router.push("/onboarding/account" as import("expo-router").Href)}
          hitSlop={8}
        >
          <Text size="sm" bold className="text-[#1E5E3A] font-body">
            Get started
          </Text>
        </Pressable>
      </HStack>
    </Box>
  );
}
