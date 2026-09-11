import React from "react";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Box } from "@/components/ui/box";

export function ListRow({
  title,
  subtitle,
  trailing,
  onPress,
  leading,
}: {
  title: string;
  subtitle?: string;
  trailing?: string;
  leading?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="py-3 border-b border-border">
      <HStack className="items-center gap-3">
        {leading}
        <VStack className="flex-1" space="xs">
          <Text bold size="sm">
            {title}
          </Text>
          {subtitle ? (
            <Text size="xs" className="text-muted-foreground">
              {subtitle}
            </Text>
          ) : null}
        </VStack>
        {trailing ? (
          <Text size="sm" bold className="font-mono text-primary">
            {trailing}
          </Text>
        ) : (
          <Box className="w-2" />
        )}
      </HStack>
    </Pressable>
  );
}
