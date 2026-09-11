import React from "react";
import { ActivityIndicator } from "react-native";
import { Card } from "@/components/ui/card";

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <Card variant="soft" className="items-center justify-center" style={{ height }}>
      <ActivityIndicator color="rgb(46,168,110)" />
    </Card>
  );
}
