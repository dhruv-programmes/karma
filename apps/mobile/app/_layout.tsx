import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  useFonts,
} from "@expo-google-fonts/nunito";
import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from "@expo-google-fonts/ibm-plex-mono";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { useAuthStore } from "@/src/store/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function RootLayout() {
  const router = useRouter();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const onboardingStep = useAuthStore((s) => s.onboardingStep);
  const hydrateAuth = useAuthStore((s) => s.hydrateAuth);

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (!fontsLoaded || !isHydrated) return;

    // Path B & D: Completed user or active demo mode -> straight to Home
    if (hasCompletedOnboarding || isDemoMode) {
      return;
    }

    // Path A & C: New user or incomplete sign-up -> resume exact step
    if (onboardingStep === "account") {
      router.replace("/onboarding/account");
    } else if (onboardingStep === "baseline") {
      router.replace("/onboarding/baseline");
    } else if (onboardingStep === "goal") {
      router.replace("/onboarding/goal");
    } else if (onboardingStep === "reveal") {
      router.replace("/onboarding/reveal");
    } else if (onboardingStep === "location") {
      router.replace("/onboarding/location");
    } else {
      router.replace("/onboarding");
    }
  }, [fontsLoaded, isHydrated, hasCompletedOnboarding, isDemoMode, onboardingStep, router]);

  if (!fontsLoaded || !isHydrated) {
    return <View className="flex-1 bg-background" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GluestackUIProvider mode="light">
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "rgb(244, 250, 246)" },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding/index" options={{ animation: "fade" }} />
            <Stack.Screen name="onboarding/account" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="onboarding/baseline" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="onboarding/goal" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="onboarding/reveal" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="onboarding/location" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="auth/signin" options={{ animation: "slide_from_bottom" }} />
            <Stack.Screen name="auth/signup" options={{ animation: "slide_from_right" }} />
            <Stack.Screen
              name="scan/index"
              options={{ presentation: "fullScreenModal" }}
            />
            <Stack.Screen name="scan/result" />
            <Stack.Screen name="product/[id]" />
            <Stack.Screen name="action/[id]" />
            <Stack.Screen name="map/index" />
            <Stack.Screen name="rewards/index" />
            <Stack.Screen name="offsets/index" />
            <Stack.Screen name="receipt/index" />
            <Stack.Screen name="receipt/result" />
          </Stack>
        </QueryClientProvider>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
