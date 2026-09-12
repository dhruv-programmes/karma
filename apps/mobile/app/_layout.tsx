import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
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
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrateAuth = useAuthStore((s) => s.hydrateAuth);

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

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
            <Stack.Screen name="index" />
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
            <Stack.Screen name="receipt/review" />
            <Stack.Screen name="receipt/result" />
          </Stack>
        </QueryClientProvider>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
