import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  X,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
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
  const { height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setOnboardingStep = useAuthStore((s) => s.setOnboardingStep);

  const [showEmailModal, setShowEmailModal] = useState(false);
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
      setShowEmailModal(false);
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

  const buttonsTop = Math.max(screenHeight * 0.365, 305);

  return (
    <Box className="flex-1" style={{ backgroundColor: "#F4F8F5" }}>
      {/* 1. Seamless Full-Screen Replica Background */}
      <Image
        source={require("@/assets/carbon-loop-fullscreen-replica.jpg")}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
        }}
        resizeMode="cover"
      />

      {/* 2. Interactive Back Button Hit Target */}
      <Pressable
        onPress={() => router.back()}
        style={{
          position: "absolute",
          top: insets.top + 6,
          left: 18,
          width: 44,
          height: 44,
          borderRadius: 22,
        }}
        hitSlop={14}
      />

      {/* 3. Interactive Middle Action Buttons */}
      <Box
        style={{
          position: "absolute",
          top: buttonsTop,
          left: 22,
          right: 22,
        }}
      >
        {/* Continue with Google */}
        <Pressable
          onPress={handleContinueWithGoogle}
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-white border border-[#DFEAE2] flex-row items-center justify-center gap-3 px-4 active:bg-neutral-50"
          style={{
            shadowColor: "#184A2C",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 2,
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

        {/* OR Divider */}
        <HStack className="items-center gap-3 my-2.5 px-2">
          <Box className="flex-1 h-[1px] bg-[#DFEAE2]" />
          <Text size="xs" className="text-[#7C9084] font-body uppercase tracking-[2px] text-[11px] font-medium">
            or
          </Text>
          <Box className="flex-1 h-[1px] bg-[#DFEAE2]" />
        </HStack>

        {/* Continue with phone or email button */}
        <Pressable
          onPress={() => setShowEmailModal(true)}
          className="w-full h-14 rounded-2xl bg-[#EAF4ED] border border-[#C8E1D1] flex-row items-center justify-center gap-2.5 px-4 active:bg-[#DFEFE5]"
          style={{
            shadowColor: "#184A2C",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <Mail size={19} color="#1B5E39" strokeWidth={1.8} />
          <Text bold size="sm" style={{ color: "#1B5E39" }} className="font-body text-[15px]">
            Continue with phone or email
          </Text>
        </Pressable>
      </Box>

      {/* 4. Real Interactive Bottom Text: Existing user? Sign in & Privacy Terms Help */}
      <VStack
        className="items-center"
        style={{
          position: "absolute",
          bottom: Math.max(insets.bottom + 12, 24),
          left: 0,
          right: 0,
        }}
        space="xs"
      >
        <HStack className="items-center justify-center">
          <Text className="text-[#3A5043] font-body text-[14.5px]">
            Existing user?{" "}
          </Text>
          <Pressable
            onPress={() => router.push("/auth/signin" as import("expo-router").Href)}
            hitSlop={12}
            className="active:opacity-70"
          >
            <Text
              bold
              style={{ color: "#144D29" }}
              className="font-body text-[14.5px]"
            >
              Sign in
            </Text>
          </Pressable>
        </HStack>

        <HStack className="items-center justify-center gap-2 mt-1">
          <Pressable onPress={() => {}} hitSlop={8} className="active:opacity-70">
            <Text className="text-[#7D9185] font-body text-[11.5px]">Privacy</Text>
          </Pressable>
          <Text className="text-[#7D9185] text-[11.5px]">•</Text>
          <Pressable onPress={() => {}} hitSlop={8} className="active:opacity-70">
            <Text className="text-[#7D9185] font-body text-[11.5px]">Terms</Text>
          </Pressable>
          <Text className="text-[#7D9185] text-[11.5px]">•</Text>
          <Pressable onPress={() => {}} hitSlop={8} className="active:opacity-70">
            <Text className="text-[#7D9185] font-body text-[11.5px]">Help</Text>
          </Pressable>
        </HStack>
      </VStack>

      {/* 6. Email/Password Signup Modal */}
      <Modal
        visible={showEmailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEmailModal(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="rounded-t-3xl bg-white p-6 pb-10 border-t border-[#DFEAE2]"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            <HStack className="justify-between items-center mb-4">
              <VStack>
                <Text
                  style={{
                    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
                    fontSize: 22,
                    fontWeight: "700",
                    color: "#182820",
                  }}
                >
                  Create Account
                </Text>
                <Text size="xs" className="text-muted-foreground font-body">
                  Save your Carbon Loop progress
                </Text>
              </VStack>
              <Pressable
                onPress={() => setShowEmailModal(false)}
                className="w-9 h-9 rounded-full bg-secondary/80 items-center justify-center"
              >
                <X size={18} color="#182820" />
              </Pressable>
            </HStack>

            {error ? (
              <Box className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
                <Text size="xs" className="text-destructive font-medium text-center">
                  {error}
                </Text>
              </Box>
            ) : null}

            <VStack space="md">
              <VStack space="xs">
                <Text size="xs" bold className="text-foreground font-body">
                  Full Name
                </Text>
                <Box className="flex-row items-center h-12 px-3.5 rounded-xl border border-[#DFEAE2] bg-[#F7FAF8]">
                  <User size={18} color="#668072" />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Alex Rivers"
                    placeholderTextColor="#94A89E"
                    className="flex-1 ml-2.5 text-foreground font-body text-sm"
                    autoCapitalize="words"
                  />
                </Box>
              </VStack>

              <VStack space="xs">
                <Text size="xs" bold className="text-foreground font-body">
                  Email
                </Text>
                <Box className="flex-row items-center h-12 px-3.5 rounded-xl border border-[#DFEAE2] bg-[#F7FAF8]">
                  <Mail size={18} color="#668072" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="alex@example.com"
                    placeholderTextColor="#94A89E"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="flex-1 ml-2.5 text-foreground font-body text-sm"
                  />
                </Box>
              </VStack>

              <VStack space="xs">
                <Text size="xs" bold className="text-foreground font-body">
                  Password
                </Text>
                <Box className="flex-row items-center h-12 px-3.5 rounded-xl border border-[#DFEAE2] bg-[#F7FAF8]">
                  <Lock size={18} color="#668072" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#94A89E"
                    secureTextEntry={!showPassword}
                    className="flex-1 ml-2.5 text-foreground font-body text-sm"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={18} color="#668072" />
                    ) : (
                      <Eye size={18} color="#668072" />
                    )}
                  </Pressable>
                </Box>
              </VStack>

              <Button
                size="lg"
                className="mt-2 h-13 rounded-2xl"
                style={{ backgroundColor: "#184A2C" }}
                onPress={handleEmailSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <HStack className="items-center gap-2">
                    <ButtonText className="text-white font-semibold font-body text-[15px]">
                      Sign Up with Email
                    </ButtonText>
                    <ArrowRight size={16} color="white" />
                  </HStack>
                )}
              </Button>
            </VStack>
          </View>
        </View>
      </Modal>
    </Box>
  );
}
