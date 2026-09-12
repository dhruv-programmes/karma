import React, { useState } from "react";
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
  User,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { api } from "@/src/lib/api";
import { useAuthStore } from "@/src/store/auth";

function AppleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 170 170" fill="currentColor">
      <Path
        d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.7-7.93-12.04-14.55-6.08-9.28-10.9-19.98-14.44-32.09-3.55-12.11-5.32-23.74-5.32-34.89 0-14.9 3.83-27.12 11.49-36.66 7.66-9.54 17.1-14.37 28.32-14.51 4.58 0 9.87 1.25 15.86 3.75 5.99 2.5 9.77 3.79 11.34 3.87 1.34 0 5.34-1.37 12-4.11 6.66-2.73 12.44-3.99 17.34-3.77 12.87.64 23.36 5.48 31.47 14.51-11.22 6.85-16.71 16.29-16.48 28.32.22 9.54 3.83 17.43 10.83 23.67 7 6.24 15.22 9.78 24.66 10.63-2.22 6.74-4.89 13.34-8.01 19.8-3.12 6.46-6.27 12.35-9.46 17.67zM119.22 31.02c0-7.39 2.66-14.34 7.98-20.85 5.32-6.51 11.85-10.17 19.59-11 0 .98.05 2.01.16 3.1.11 1.09.16 2.06.16 2.93 0 7.39-2.61 14.28-7.83 20.67-5.22 6.39-11.95 10.05-20.19 10.97.11-1.95.13-3.89.13-5.82z"
        fill="rgb(28,42,36)"
      />
    </Svg>
  );
}

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

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setOnboardingStep = useAuthStore((s) => s.setOnboardingStep);
  const startDemo = useAuthStore((s) => s.startDemo);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinueWithSocial(provider: "apple" | "google") {
    setLoading(true);
    setError(null);
    try {
      const mockName = provider === "apple" ? "Apple User" : "Google User";
      const timestamp = Date.now();
      const mockEmail = `${provider}.user.${timestamp}@carbonloop.app`;
      // Call backend signup with default budget, marking onboarding incomplete
      const res = await api.signup({
        name: mockName,
        email: mockEmail,
        password: "social-oauth-token-12345",
        monthly_budget_kg: 90,
      });
      setAuth(res.user, res.access_token, false);
      setOnboardingStep("baseline");
      router.push("/onboarding/baseline" as import("expo-router").Href);
    } catch {
      // Offline fallback: create guest authenticated profile
      const guestUser = {
        id: `guest-${Date.now()}`,
        name: provider === "apple" ? "Apple Member" : "Google Member",
        email: `${provider}@carbonloop.app`,
        circularity_score: 642,
        impact_points: 0,
        streak_days: 1,
        trend_delta: 0,
        loop_level: 1,
        offset_kg_total: 0,
        monthly_budget_kg: 90,
      };
      setAuth(guestUser, "social-session-token", false);
      setOnboardingStep("baseline");
      router.push("/onboarding/baseline" as import("expo-router").Href);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignup() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.signup({
        name: name.trim() || "New Member",
        email: email.trim().toLowerCase(),
        password: password.trim(),
        monthly_budget_kg: 90,
      });
      setAuth(res.user, res.access_token, false);
      setOnboardingStep("baseline");
      router.push("/onboarding/baseline" as import("expo-router").Href);
    } catch (err: any) {
      setError(err?.message || "Could not create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      className="flex-1 bg-background"
      style={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
      }}
    >
      {/* Top Navigation */}
      <HStack className="items-center justify-between mb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-card items-center justify-center border border-border"
          hitSlop={8}
        >
          <ArrowLeft size={18} color="rgb(28,42,36)" />
        </Pressable>

        <Pressable
          onPress={() => {
            startDemo();
            router.replace("/(tabs)");
          }}
          hitSlop={8}
        >
          <Text size="xs" bold className="text-muted-foreground font-body">
            Explore demo
          </Text>
        </Pressable>
      </HStack>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Block */}
        <VStack space="xs" className="mt-2">
          <Heading size="2xl" className="font-heading text-foreground">
            Start your Carbon Loop
          </Heading>
          <Text size="sm" className="text-muted-foreground mt-1 leading-relaxed font-body">
            Your Carbon Score, actions and rewards are saved to your account.
          </Text>
        </VStack>

        {error ? (
          <Box className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30">
            <Text size="xs" className="text-destructive font-medium">
              {error}
            </Text>
          </Box>
        ) : null}

        {/* Primary Social Options */}
        <VStack space="sm" className="mt-2">
          <Pressable
            onPress={() => handleContinueWithSocial("apple")}
            disabled={loading}
            className="w-full h-13 rounded-2xl bg-card border border-border flex-row items-center justify-center gap-3 active:bg-secondary/40"
          >
            <AppleLogo />
            <Text bold size="sm" className="text-foreground font-body">
              Continue with Apple
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleContinueWithSocial("google")}
            disabled={loading}
            className="w-full h-13 rounded-2xl bg-card border border-border flex-row items-center justify-center gap-3 active:bg-secondary/40"
          >
            <GoogleLogo />
            <Text bold size="sm" className="text-foreground font-body">
              Continue with Google
            </Text>
          </Pressable>
        </VStack>

        {/* Divider */}
        <HStack className="items-center gap-3 my-1">
          <Box className="flex-1 h-[1px] bg-border" />
          <Text size="xs" className="text-muted-foreground font-body uppercase tracking-wider">
            or
          </Text>
          <Box className="flex-1 h-[1px] bg-border" />
        </HStack>

        {/* Email & Phone Section */}
        {!showEmailForm ? (
          <Pressable
            onPress={() => setShowEmailForm(true)}
            className="w-full h-13 rounded-2xl bg-secondary/70 border border-border/80 flex-row items-center justify-center gap-2"
          >
            <Mail size={18} color="rgb(46,168,110)" />
            <Text bold size="sm" className="text-foreground font-body">
              Continue with phone or email
            </Text>
          </Pressable>
        ) : (
          <Card variant="outline" className="p-4 gap-3.5 border-border">
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
              onPress={handleEmailSignup}
              disabled={loading || !email || !password}
              className="mt-2 h-12 rounded-xl"
            >
              {loading ? (
                <HStack className="items-center gap-2">
                  <ActivityIndicator color="white" size="small" />
                  <Text bold className="text-primary-foreground font-body">
                    Creating Account...
                  </Text>
                </HStack>
              ) : (
                <HStack className="items-center justify-center gap-2">
                  <Text bold className="text-primary-foreground font-body">
                    Continue to Baseline
                  </Text>
                  <ArrowRight size={16} color="white" />
                </HStack>
              )}
            </Button>
          </Card>
        )}
      </ScrollView>

      {/* Footer Navigation */}
      <HStack className="justify-center items-center gap-1.5 pt-2">
        <Text size="sm" className="text-muted-foreground font-body">
          Existing user?
        </Text>
        <Pressable
          onPress={() => router.push("/auth/signin" as import("expo-router").Href)}
          hitSlop={8}
        >
          <Text size="sm" bold className="text-primary font-body">
            Sign in
          </Text>
        </Pressable>
      </HStack>
    </Box>
  );
}
