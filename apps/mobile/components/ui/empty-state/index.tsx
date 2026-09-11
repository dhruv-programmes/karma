import React from "react";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card variant="flat" className="items-center py-8 px-4">
      <VStack space="sm" className="items-center">
        <Text bold>{title}</Text>
        <Text size="sm" className="text-muted-foreground text-center">
          {body}
        </Text>
        {actionLabel && onAction ? (
          <Button size="sm" variant="secondary" onPress={onAction} className="mt-2">
            {actionLabel}
          </Button>
        ) : null}
      </VStack>
    </Card>
  );
}
