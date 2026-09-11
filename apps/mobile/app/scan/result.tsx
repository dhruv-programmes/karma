import React, { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircularityRing } from "@/components/custom/circularity-ring";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { useProduct } from "@/src/hooks/queries";

export default function ScanResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useProduct(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!product.data) return;
    const t = setTimeout(() => {
      router.replace(`/product/${product.data.id}`);
    }, 1400);
    return () => clearTimeout(t);
  }, [product.data, router]);

  const p = product.data;

  return (
    <Box
      className="flex-1 bg-background px-6 items-center gap-3"
      style={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <Animated.View entering={FadeInUp.duration(400)}>
        <Badge action="playful" label="Found it!" />
      </Animated.View>
      {p?.image_url ? (
        <Animated.View entering={FadeInDown.delay(100)}>
          <Image
            source={{ uri: p.image_url }}
            style={{ width: 160, height: 160, borderRadius: 28 }}
          />
        </Animated.View>
      ) : null}
      <Animated.View entering={FadeInDown.delay(150)}>
        <Heading size="xl" className="text-center">
          {p?.name ?? "Resolving…"}
        </Heading>
      </Animated.View>
      <Text className="text-muted-foreground">{p?.brand}</Text>
      {p ? (
        <CircularityRing score={p.circularity_score} size={100} label="circularity" />
      ) : null}
      <Box className="mt-6 w-full">
        <Button onPress={() => p && router.replace(`/product/${p.id}`)}>
          See circular options
        </Button>
      </Box>
    </Box>
  );
}
