import React from "react";
import type { Facility } from "@/src/types/api";
import { ProductImage } from "@/components/custom/product-image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type Props = {
  facility: Facility;
  onPress?: () => void;
  selected?: boolean;
};

export function FacilityCard({ facility, onPress, selected }: Props) {
  return (
    <Pressable onPress={onPress}>
      <Card variant={selected ? "softPop" : "soft"} className="overflow-hidden p-0">
        {facility.cover_image_url ? (
          <ProductImage uri={facility.cover_image_url} size="full" radius={0} />
        ) : null}
        <VStack space="sm" className="p-4">
          <HStack className="justify-between gap-3">
            <Text size="md" bold className="flex-1">
              {facility.name}
            </Text>
            <Text size="sm" className="font-mono text-primary">
              {facility.distance_km != null ? `${facility.distance_km} km` : ""}
            </Text>
          </HStack>
          <Text size="xs" className="text-muted-foreground">
            {facility.address}
          </Text>
          <HStack space="sm" className="flex-wrap">
            <Chip tone="info" label={facility.facility_type} />
            <Badge
              action={
                facility.verification_status === "Verified" ? "success" : "warning"
              }
              label={facility.verification_status}
            />
            {facility.open_now != null ? (
              <Badge
                action="muted"
                label={facility.open_now ? "Open now" : "Closed"}
              />
            ) : null}
          </HStack>
        </VStack>
      </Card>
    </Pressable>
  );
}
