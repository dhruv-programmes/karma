import { Redirect } from "expo-router";
import { useAuthStore } from "@/src/store/auth";

export default function Index() {
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const onboardingStep = useAuthStore((s) => s.onboardingStep);

  if (hasCompletedOnboarding || isDemoMode) {
    return <Redirect href="/(tabs)" />;
  }

  if (onboardingStep === "account") {
    return <Redirect href="/onboarding/account" />;
  }
  if (onboardingStep === "baseline") {
    return <Redirect href="/onboarding/baseline" />;
  }
  if (onboardingStep === "goal") {
    return <Redirect href="/onboarding/goal" />;
  }
  if (onboardingStep === "reveal") {
    return <Redirect href="/onboarding/reveal" />;
  }
  if (onboardingStep === "location") {
    return <Redirect href="/onboarding/location" />;
  }

  return <Redirect href="/onboarding" />;
}
