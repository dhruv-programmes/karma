import React, { useState } from "react";
import {
  ActivityIndicator,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Eye, EyeOff, Leaf, Lock, Mail, Target, User } from "lucide-react-native";
import { Image } from "expo-image";
import { DecorativeBackground } from "@/components/custom/decorative-background";
import { useQueryClient } from "@tanstack/react-query";
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

const BUDGET_OPTIONS = [
  {
    kg: 60,
    title: "Low Footprint",
    desc: "Metro & buses, repair-first, home cooking",
    tag: "Minimalist",
  },
  {
    kg: 90,
    title: "Balanced Loop",
    desc: "Mixed transit, conscious tech buyer",
    tag: "Typical",
  },
  {
    kg: 140,
    title: "Reduction Focus",
    desc: "Frequent delivery, high electricity & retail",
    tag: "Starter",
  },
];

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setOnboardingDone = useAppStore((s) => s.setOnboardingDone);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await api.signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        monthly_budget_kg: selectedBudget,
      });
      setAuth(res.user, res.access_token);
      setOnboardingDone(true);
      queryClient.invalidateQueries();
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err?.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box className="flex-1 bg-background">
      <DecorativeBackground />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Box className="items-center mb-2">
          <Image
            source={require("@/assets/karma-text.png")}
            style={{ width: 110, height: 32, marginBottom: 12 }}
            contentFit="contain"
          />
          <Heading size="2xl" className="text-center">
            Create Account
          </Heading>
          <Text size="sm" className="text-muted-foreground text-center mt-1">
            Close the consumer loop with real data metrics and verified hubs.
          </Text>
        </Box>

      {error ? (
        <Box className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30">
          <Text size="xs" className="text-destructive font-medium">
            {error}
          </Text>
        </Box>
      ) : null}

      {/* Account Info Form */}
      <Card variant="outline" className="gap-4">
        <VStack space="sm">
          <Text size="xs" bold className="text-foreground">
            Full Name
          </Text>
          <Box className="flex-row items-center h-12 px-3.5 rounded-xl border border-border bg-card">
            <User size={18} color="rgb(100,120,110)" />
            <TextInput
              className="flex-1 ml-3 text-foreground font-body text-sm"
              placeholder="Aisha Sharma"
              placeholderTextColor="rgb(150,170,160)"
              value={name}
              onChangeText={setName}
            />
          </Box>
        </VStack>

        <VStack space="sm">
          <Text size="xs" bold className="text-foreground">
            Email address
          </Text>
          <Box className="flex-row items-center h-12 px-3.5 rounded-xl border border-border bg-card">
            <Mail size={18} color="rgb(100,120,110)" />
            <TextInput
              className="flex-1 ml-3 text-foreground font-body text-sm"
              placeholder="aisha@example.com"
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
            Password (min 6 chars)
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
      </Card>

      {/* Target Monthly Budget Selection */}
      <Card variant="soft" className="gap-3">
        <HStack className="items-center gap-2">
          <Target size={18} color="rgb(46,168,110)" />
          <Text bold size="sm">
            Set Monthly Carbon Target
          </Text>
        </HStack>
        <Text size="xs" className="text-muted-foreground">
          Choose a realistic initial CO₂e goal based on your lifestyle:
        </Text>

        <VStack space="sm">
          {BUDGET_OPTIONS.map((opt) => {
            const isSelected = selectedBudget === opt.kg;
            return (
              <Pressable
                key={opt.kg}
                onPress={() => setSelectedBudget(opt.kg)}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isSelected
                    ? "bg-card border-primary shadow-sm"
                    : "bg-card/70 border-border/60 hover:bg-card"
                }`}
              >
                <HStack className="justify-between items-center">
                  <VStack className="flex-1 pr-2">
                    <HStack className="items-center gap-2">
                      <Text bold size="sm">
                        {opt.title}
                      </Text>
                      <Box className="px-2 py-0.5 rounded-full bg-secondary">
                        <Text size="xs" bold className="text-secondary-foreground font-mono">
                          ~{opt.kg} kg/mo
                        </Text>
                      </Box>
                    </HStack>
                    <Text size="xs" className="text-muted-foreground mt-1">
                      {opt.desc}
                    </Text>
                  </VStack>
                  <Box
                    className={`w-6 h-6 rounded-full items-center justify-center border ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-border bg-card"
                    }`}
                  >
                    {isSelected ? <Check size={14} color="white" /> : null}
                  </Box>
                </HStack>
              </Pressable>
            );
          })}
        </VStack>
      </Card>

      <Button
        className="mt-1"
        onPress={handleSignUp}
        disabled={loading}
      >
        {loading ? (
          <HStack className="items-center gap-2">
            <ActivityIndicator color="white" size="small" />
            <Text bold className="text-primary-foreground">
              Creating Account...
            </Text>
          </HStack>
        ) : (
          "Start Carbon Loop"
        )}
      </Button>

      {/* Footer Navigation */}
      <HStack className="justify-center items-center gap-1 mt-1">
        <Text size="sm" className="text-muted-foreground">
          Already have an account?
        </Text>
        <Pressable onPress={() => router.push("/auth/signin" as import("expo-router").Href)}>
          <Text size="sm" bold className="text-primary underline">
            Sign In
          </Text>
        </Pressable>
      </HStack>
    </ScrollView>
  </Box>
  );
}
