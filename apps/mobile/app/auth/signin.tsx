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
  Sparkles,
  UserCheck,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/avatar";
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
import type { DemoUserSummary } from "@/src/types/api";

const FALLBACK_DEMO_USERS: DemoUserSummary[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Aisha Sharma",
    email: "aisha@example.com",
    role_description: "Urban Commuter · 74 Circularity Score · 420 pts",
    circularity_score: 74,
    impact_points: 420,
    streak_days: 5,
    monthly_budget_kg: 90.0,
  },
  {
    id: "11111111-1111-1111-1111-111111111112",
    name: "Rohan Patel",
    email: "rohan@example.com",
    role_description: "Eco Minimalist · 88 Circularity Score · 850 pts",
    circularity_score: 88,
    impact_points: 850,
    streak_days: 19,
    monthly_budget_kg: 60.0,
  },
  {
    id: "11111111-1111-1111-1111-111111111113",
    name: "Maya Sen",
    email: "maya@example.com",
    role_description: "Convenience Shopper · 52 Circularity Score · 110 pts",
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
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);

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

  async function handleSignIn(targetEmail = email, targetPassword = password, forceComplete = true) {
    if (!targetEmail.trim() || !targetPassword.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await api.signin(targetEmail.trim().toLowerCase(), targetPassword);
      // Existing user whose onboarding is complete goes directly to home
      // Check if user has incomplete onboarding flag
      const isComplete = forceComplete || hasCompletedOnboarding;
      setAuth(res.user, res.access_token, isComplete);
      queryClient.invalidateQueries();

      if (isComplete) {
        router.replace("/(tabs)");
      } else {
        // Resume incomplete step
        const step = onboardingStep;
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

  return (
    <Box
      className="flex-1 bg-background"
      style={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 24,
      }}
    >
      {/* Top Header */}
      <HStack className="items-center justify-between mb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-card items-center justify-center border border-border"
          hitSlop={8}
        >
          <ArrowLeft size={18} color="rgb(28,42,36)" />
        </Pressable>

        <Pressable
          onPress={() => launchDemoPersona(demoUsers[0])}
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
        {/* Title */}
        <VStack space="xs" className="mt-1">
          <Heading size="2xl" className="font-heading text-foreground">
            Welcome back
          </Heading>
          <Text size="sm" className="text-muted-foreground mt-1 leading-relaxed font-body">
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

        {/* Credentials Form */}
        <Card variant="outline" className="p-4 gap-4 border-border">
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
                placeholder="••••••••"
                placeholderTextColor="rgb(150,170,160)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                {showPassword ? (
                  <EyeOff size={18} color="rgb(100,120,110)" />
                ) : (
                  <Eye size={18} color="rgb(100,120,110)" />
                )}
              </Pressable>
            </Box>
          </VStack>

          <Button
            onPress={() => handleSignIn()}
            disabled={loading || !email || !password}
            className="mt-1 h-12 rounded-xl"
          >
            {loading ? (
              <HStack className="items-center gap-2">
                <ActivityIndicator color="white" size="small" />
                <Text bold className="text-primary-foreground font-body">
                  Signing in...
                </Text>
              </HStack>
            ) : (
              <HStack className="items-center justify-center gap-2">
                <Text bold className="text-primary-foreground font-body">
                  Sign In
                </Text>
                <ArrowRight size={16} color="white" />
              </HStack>
            )}
          </Button>
        </Card>

        {/* Separated Demo Evaluator Card */}
        <Card variant="soft" className="p-4 gap-3 border border-primary/20 bg-secondary/60">
          <HStack className="items-center justify-between">
            <HStack className="items-center gap-2">
              <UserCheck size={16} color="rgb(46,168,110)" />
              <Text size="xs" bold className="text-primary tracking-wider uppercase font-mono">
                Judge & Hackathon Evaluation
              </Text>
            </HStack>
          </HStack>
          <Text size="xs" className="text-muted-foreground font-body">
            One-tap instant preview of pre-seeded user profiles with distinct scores:
          </Text>

          <VStack space="xs">
            {demoUsers.map((persona) => (
              <Pressable
                key={persona.id}
                onPress={() => launchDemoPersona(persona)}
                className="p-3 rounded-xl bg-card border border-border/70 flex-row items-center justify-between active:bg-secondary"
              >
                <HStack className="items-center gap-2.5 flex-1">
                  <Avatar name={persona.name} size="sm" />
                  <VStack className="flex-1">
                    <Text bold size="sm" className="text-foreground font-body">
                      {persona.name}
                    </Text>
                    <Text size="xs" numberOfLines={1} className="text-muted-foreground font-body">
                      {persona.role_description}
                    </Text>
                  </VStack>
                </HStack>
                <ArrowRight size={14} color="rgb(46,168,110)" />
              </Pressable>
            ))}
          </VStack>
        </Card>
      </ScrollView>

      {/* Footer Navigation */}
      <HStack className="justify-center items-center gap-1.5 pt-2">
        <Text size="sm" className="text-muted-foreground font-body">
          Don't have an account?
        </Text>
        <Pressable
          onPress={() => router.push("/onboarding/account" as import("expo-router").Href)}
          hitSlop={8}
        >
          <Text size="sm" bold className="text-primary font-body">
            Get started
          </Text>
        </Pressable>
      </HStack>
    </Box>
  );
}
