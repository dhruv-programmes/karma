import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, type LucideIcon } from "lucide-react-native";

const C = {
  inkSoft: "#183222",
  muted: "#6B8576",
  line: "rgba(46,168,110,0.16)",
  primary: "#2EA86E",
} as const;

export type ActionRowProps = {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onPress: () => void;
  tone?: "default" | "danger";
  showDivider?: boolean;
};

/** Full-width settings-style row — avoids clipped button labels. */
export function ActionRow({
  icon: Icon,
  label,
  hint,
  onPress,
  tone = "default",
  showDivider = false,
}: ActionRowProps) {
  const iconColor = tone === "danger" ? "#C0453C" : C.primary;
  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.actionRow,
          pressed && styles.actionRowPressed,
        ]}
      >
        <View
          style={[
            styles.actionIcon,
            tone === "danger" && styles.actionIconDanger,
          ]}
        >
          <Icon size={18} color={iconColor} strokeWidth={2.1} />
        </View>
        <View style={styles.actionCopy}>
          <Text
            style={[
              styles.actionLabel,
              tone === "danger" && styles.actionLabelDanger,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {hint ? (
            <Text style={styles.actionHint} numberOfLines={1}>
              {hint}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={18} color={C.muted} strokeWidth={2} />
      </Pressable>
      {showDivider ? <View style={styles.actionDivider} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  actionRowPressed: {
    opacity: 0.72,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(46,168,110,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconDanger: {
    backgroundColor: "rgba(230,90,80,0.12)",
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  actionLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: C.inkSoft,
  },
  actionLabelDanger: {
    color: "#C0453C",
  },
  actionHint: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: C.muted,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.line,
    marginLeft: 52,
  },
});
