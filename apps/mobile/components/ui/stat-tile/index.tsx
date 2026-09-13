import React from "react";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "accent" | "info" | "warning";
}) {
  const valueColor =
    tone === "primary"
      ? "text-primary"
      : tone === "accent"
        ? "text-accent-foreground"
        : tone === "info"
          ? "text-info"
          : tone === "warning"
            ? "text-warning"
            : "text-foreground";
  return (
    <Card variant="soft" className="flex-1 min-w-0 p-3">
      <VStack space="xs">
        <Text size="xs" className="text-muted-foreground">
          {label}
        </Text>
        <Text size="xl" bold className={`font-mono ${valueColor}`}>
          {value}
        </Text>
        {hint ? (
          <Text size="xs" className="text-muted-foreground">
            {hint}
          </Text>
        ) : null}
      </VStack>
    </Card>
  );
}
