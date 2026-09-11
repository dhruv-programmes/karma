import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, Sparkles, UserCheck } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/avatar";
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
import { api } from "@/src/lib/api";
import { useAppStore } from "@/src/store/app";
import { useAuthStore } from "@/src/store/auth";
import type { DemoUserSummary } from "@/src/types/api";

const FALLBACK_DEMO_USERS: DemoUserSummary[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Aisha Sharma",
    email: "aisha@example.com",
    role_description: "Urban Commuter · Balanced tech & transit circularity",
    circularity_score: 74,
    impact_points: 420,
    streak_days: 5,
    monthly_budget_kg: 90.0,
  },
  {
    id: "11111111-1111-1111-1111-111111111112",
    name: "Rohan Patel",
    email: "rohan@example.com",
    role_description: "Eco Minimalist · Transit-heavy, repair-first lifestyle",
    circularity_score: 88,
    impact_points: 850,
    streak_days: 19,
    monthly_budget_kg: 60.0,
  },
  {
    id: "11111111-1111-1111-1111-111111111113",
    name: "Maya Sen",
    email: "maya@example.com",
    role_description: "Convenience Shopper · High-footprint starter seeking wins",
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
  const setOnboardingDone = useAppStore((s) => s.setOnboardingDone);

  const [email, setEmail] = useState("aisha@example.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoUsers, setDemoUsers] = useState<DemoUserSummary[]>(FALLBACK_DEMO_USERS);
  const [selectedPersonaEmail, setSelectedPersonaEmail] = useState("aisha@example.com");

  useEffect(() => {
    api
      .getDemoUsers()
      .then((users) => {
        if (users && users.length > 0) {
          setDemoUsers(users);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSignIn(targetEmail = email, targetPassword = password) {
    setError(null);
    setLoading(true);
    try {
      const res = await api.signin(targetEmail, targetPassword);
      setAuth(res.user, res.access_token);
      setOnboardingDone(true);
      queryClient.invalidateQueries();
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Try password123 for demo accounts.");
    } finally {
      setLoading(false);
    }
  }

  function selectPersona(user: DemoUserSummary) {
    setSelectedPersonaEmail(user.email);
    setEmail(user.email);
    setPassword("password123");
    handleSignIn(user.email, "password123");
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 20,
        gap: 20,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Decorative Brand Accent */}
      <Box className="items-center mb-2">
        <Box className="w-14 h-14 rounded-2xl bg-primary/15 items-center justify-center mb-3">
          <Sparkles size={28} color="rgb(46,168,110)" />
        </Box>
        <Heading size="2xl" className="text-center">
          Welcome back
        </Heading>
        <Text size="sm" className="text-muted-foreground text-center mt-1">
          Log in to track your personal circularity and real carbon metrics.
        </Text>
      </Box>

      {/* Quick-Switch Demo Personas */}
      <Card variant="soft" className="gap-3 border border-primary/20 bg-primary/5">
        <HStack className="items-center justify-between">
          <HStack className="items-center gap-2">
            <UserCheck size={18} color="rgb(46,168,110)" />
            <Text bold size="sm" className="text-primary">
              Quick Demo Switcher
            </Text>
          </HStack>
          <Badge action="playful" label="3 Personas" />
        </HStack>
        <Text size="xs" className="text-muted-foreground">
          Tap any persona below to instantaneously authenticate with their live database metrics:
        </Text>

        <VStack space="sm">
          {demoUsers.map((persona) => {
            const isSelected = selectedPersonaEmail === persona.email;
            return (
              <Pressable
                key={persona.id}
                onPress={() => selectPersona(persona)}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isSelected
                    ? "bg-card border-primary shadow-sm"
                    : "bg-card/70 border-border/60 hover:bg-card"
                }`}
              >
                <HStack className="items-center justify-between">
                  <HStack className="items-center gap-3 flex-1">
                    <Avatar
                      name={persona.name}
                      size="sm"
                    />
                    <VStack className="flex-1">
                      <HStack className="items-center gap-2">
                        <Text bold size="sm">
                          {persona.name}
                        </Text>
                        <Text size="xs" bold className="text-primary font-mono">
                          {persona.circularity_score} pts
                        </Text>
                      </HStack>
                      <Text
                        size="xs"
                        numberOfLines={1}
                        className="text-muted-foreground"
                      >
                        {persona.role_description}
                      </Text>
                    </VStack>
                  </HStack>
                  <Box className="pl-2">
                    <ArrowRight
                      size={16}
                      color={isSelected ? "rgb(46,168,110)" : "rgb(100,120,110)"}
                    />
                  </Box>
                </HStack>

                <HStack className="mt-2.5 gap-2 items-center">
                  <Box className="px-2 py-0.5 rounded-md bg-secondary">
                    <Text size="xs" bold className="text-secondary-foreground font-mono">
                      Level {Math.max(1, Math.floor(persona.impact_points / 250) + 1)}
                    </Text>
                  </Box>
                  <Box className="px-2 py-0.5 rounded-md bg-secondary">
                    <Text size="xs" className="text-secondary-foreground font-mono">
                      🔥 {persona.streak_days}d streak
                    </Text>
                  </Box>
                  <Box className="px-2 py-0.5 rounded-md bg-secondary">
                    <Text size="xs" className="text-secondary-foreground font-mono">
                      ~{persona.monthly_budget_kg} kg target
                    </Text>
                  </Box>
                </HStack>
              </Pressable>
            );
          })}
        </VStack>
      </Card>

      {/* Standard Credentials Form */}
      <Card variant="outline" className="gap-4">
        <Text bold size="md">
          Or sign in with email
        </Text>

        {error ? (
          <Box className="p-3 rounded-xl bg-destructive/10 border border-destructive/30">
            <Text size="xs" className="text-destructive font-medium">
              {error}
            </Text>
          </Box>
        ) : null}

        <VStack space="sm">
          <Text size="xs" bold className="text-foreground">
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

        <VStack space="sm">
          <Text size="xs" bold className="text-foreground">
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
          className="mt-2"
          onPress={() => handleSignIn()}
          disabled={loading || !email || !password}
        >
          {loading ? (
            <HStack className="items-center gap-2">
              <ActivityIndicator color="white" size="small" />
              <Text bold className="text-primary-foreground">
                Signing in...
              </Text>
            </HStack>
          ) : (
            "Sign In"
          )}
        </Button>
      </Card>

      {/* Footer Navigation */}
      <HStack className="justify-center items-center gap-1 mt-2">
        <Text size="sm" className="text-muted-foreground">
          Don't have an account?
        </Text>
        <Pressable onPress={() => router.push("/auth/signup" as import("expo-router").Href)}>
          <Text size="sm" bold className="text-primary underline">
            Create account
          </Text>
        </Pressable>
      </HStack>
    </ScrollView>
  );
}
