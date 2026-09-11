import React from "react";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <Card variant="softPop">
      <VStack space="sm">
        <Text size="md" bold className="text-secondary-foreground">
          {title}
        </Text>
        <Text size="sm" className="text-muted-foreground">
          {body}
        </Text>
      </VStack>
    </Card>
  );
}
