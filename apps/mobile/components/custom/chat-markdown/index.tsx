import React, { useMemo } from "react";
import { Text, View, type TextStyle } from "react-native";

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "code"; text: string }
  | { type: "quote"; text: string };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (inCode) {
      if (line.trim().startsWith("```")) {
        blocks.push({ type: "code", text: codeLines.join("\n") });
        codeLines = [];
        inCode = false;
      } else {
        codeLines.push(raw);
      }
      continue;
    }

    if (line.trim().startsWith("```")) {
      flushParagraph();
      inCode = true;
      codeLines = [];
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      flushParagraph();
      const level = Math.min(heading[1]!.length, 3) as 1 | 2 | 3;
      blocks.push({ type: "heading", level, text: heading[2]!.trim() });
      continue;
    }

    const bullet = /^[-*•]\s+(.+)$/.exec(line.trim());
    if (bullet) {
      flushParagraph();
      blocks.push({ type: "bullet", text: bullet[1]!.trim() });
      continue;
    }

    const ordered = /^\d+[.)]\s+(.+)$/.exec(line.trim());
    if (ordered) {
      flushParagraph();
      blocks.push({ type: "bullet", text: ordered[1]!.trim() });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line.trim());
    if (quote) {
      flushParagraph();
      blocks.push({ type: "quote", text: quote[1]!.trim() });
      continue;
    }

    paragraph.push(line.trim());
  }

  if (inCode && codeLines.length) {
    blocks.push({ type: "code", text: codeLines.join("\n") });
  }
  flushParagraph();
  return blocks;
}

type InlineSeg =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string };

function parseInline(text: string): InlineSeg[] {
  const segs: InlineSeg[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) {
      segs.push({ type: "text", value: text.slice(last, match.index) });
    }
    const token = match[0]!;
    if (token.startsWith("**")) {
      segs.push({ type: "bold", value: token.slice(2, -2) });
    } else if (token.startsWith("*")) {
      segs.push({ type: "italic", value: token.slice(1, -1) });
    } else {
      segs.push({ type: "code", value: token.slice(1, -1) });
    }
    last = match.index + token.length;
  }
  if (last < text.length) segs.push({ type: "text", value: text.slice(last) });
  return segs.length ? segs : [{ type: "text", value: text }];
}

function InlineText({
  text,
  baseStyle,
}: {
  text: string;
  baseStyle?: TextStyle;
}) {
  const segs = useMemo(() => parseInline(text), [text]);
  return (
    <Text style={baseStyle}>
      {segs.map((seg, i) => {
        if (seg.type === "bold") {
          return (
            <Text
              key={i}
              style={{ fontFamily: "Nunito_700Bold", color: "#0D1811" }}
            >
              {seg.value}
            </Text>
          );
        }
        if (seg.type === "italic") {
          return (
            <Text key={i} style={{ fontStyle: "italic" }}>
              {seg.value}
            </Text>
          );
        }
        if (seg.type === "code") {
          return (
            <Text
              key={i}
              style={{
                fontFamily: "IBMPlexMono_500Medium",
                fontSize: 12,
                backgroundColor: "rgba(46,168,110,0.12)",
                color: "#183222",
              }}
            >
              {` ${seg.value} `}
            </Text>
          );
        }
        return <Text key={i}>{seg.value}</Text>;
      })}
    </Text>
  );
}

export function ChatMarkdown({ children }: { children: string }) {
  const blocks = useMemo(() => parseBlocks(children), [children]);
  if (!children.trim()) return null;

  return (
    <View style={{ gap: 6 }}>
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          const size = block.level === 1 ? 18 : block.level === 2 ? 16 : 15;
          return (
            <InlineText
              key={i}
              text={block.text}
              baseStyle={{
                fontSize: size,
                lineHeight: size + 6,
                fontFamily: "Nunito_800ExtraBold",
                color: "#0D1811",
              }}
            />
          );
        }
        if (block.type === "bullet") {
          return (
            <View key={i} style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ color: "#2EA86E", lineHeight: 21 }}>•</Text>
              <View style={{ flex: 1 }}>
                <InlineText
                  text={block.text}
                  baseStyle={{
                    fontSize: 14,
                    lineHeight: 21,
                    fontFamily: "Nunito_400Regular",
                    color: "#183222",
                  }}
                />
              </View>
            </View>
          );
        }
        if (block.type === "code") {
          return (
            <View
              key={i}
              style={{
                backgroundColor: "rgba(13,24,17,0.06)",
                borderColor: "rgba(46,168,110,0.16)",
                borderWidth: 1,
                borderRadius: 12,
                padding: 10,
              }}
            >
              <Text
                style={{
                  fontFamily: "IBMPlexMono_500Medium",
                  fontSize: 12,
                  color: "#183222",
                }}
              >
                {block.text}
              </Text>
            </View>
          );
        }
        if (block.type === "quote") {
          return (
            <View
              key={i}
              style={{
                borderLeftWidth: 3,
                borderLeftColor: "#2EA86E",
                paddingLeft: 10,
                backgroundColor: "rgba(46,168,110,0.08)",
                paddingVertical: 4,
                borderRadius: 4,
              }}
            >
              <InlineText
                text={block.text}
                baseStyle={{
                  fontSize: 14,
                  lineHeight: 21,
                  fontFamily: "Nunito_400Regular",
                  color: "#183222",
                }}
              />
            </View>
          );
        }
        return (
          <InlineText
            key={i}
            text={block.text}
            baseStyle={{
              fontSize: 14,
              lineHeight: 21,
              fontFamily: "Nunito_400Regular",
              color: "#183222",
            }}
          />
        );
      })}
    </View>
  );
}
