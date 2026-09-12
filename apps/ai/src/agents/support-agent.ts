import {
  Experimental_Agent as Agent,
  Experimental_InferAgentUIMessage as InferAgentUIMessage,
  stepCountIs,
  tool,
} from "ai";
import { z } from "zod";
import { getSupportModel } from "@/lib/ai";
import { fastapiGet } from "@/lib/fastapi-client";
import {
  APP_BENEFITS,
  FEATURE_GUIDES,
  OPEN_SCREEN_ROUTES,
  SCORE_AND_POINTS,
} from "@/lib/support-knowledge";

const SUPPORT_SYSTEM = `You are Karma Support for the Karma / Carbon Loop app.

Rules:
- Only answer Karma/Carbon Loop topics (features, KCS, Impact Points, scan/receipt/offers/rewards/offsets/map). Refuse unrelated asks in one short line.
- Never invent live numbers — call tools first for score/points/impact/rewards/offsets/facilities.
- "How much karma / my points / my score" → call getMyKarma once, then answer.
- At most ONE tool call when possible, then a short final reply.
- Keep answers under ~80 words. Markdown: **bold** key numbers, bullets only if needed.
- KCS ≠ Impact Points. Demo offers/offsets: say so briefly.
- openScreen only when navigation clearly helps.`;

const openScreenRouteSchema = z.enum(OPEN_SCREEN_ROUTES);

export function createSupportTools(authHeader: string) {
  const noArgs = z.object({
    intent: z
      .string()
      .optional()
      .describe("Optional short intent note for logging"),
  });

  return {
    getAppBenefits: tool({
      description:
        "Get what Karma / Carbon Loop is and the main user benefits of using the app.",
      inputSchema: noArgs,
      execute: async () => APP_BENEFITS,
    }),

    getFeatureGuide: tool({
      description:
        "Get step-by-step how-to guidance for a Karma feature (scan, receipt, map, rewards, offsets, offers, home).",
      inputSchema: z.object({
        feature: z
          .enum([
            "scan",
            "receipt",
            "map",
            "rewards",
            "offsets",
            "offers",
            "home",
          ])
          .describe("Which feature to explain"),
      }),
      execute: async ({ feature }) =>
        FEATURE_GUIDES[feature] ?? {
          title: feature,
          steps: ["Open Tools and pick the matching card."],
        },
    }),

    explainScoreAndPoints: tool({
      description:
        "Explain Karma Credit Score (KCS) vs Impact Points, and Provisional vs Verified score.",
      inputSchema: noArgs,
      execute: async () => SCORE_AND_POINTS,
    }),

    getMyScore: tool({
      description:
        "Fetch the signed-in user's Karma Credit Score (KCS) only — provisional/verified state and confidence.",
      inputSchema: noArgs,
      execute: async () => {
        const res = await fastapiGet("/users/me/score", authHeader);
        if (!res.ok) return { error: res.error, status: res.status };
        return res.data;
      },
    }),

    getMyKarma: tool({
      description:
        "Fetch the user's live Karma snapshot: Karma Credit Score, Impact Points (karma points), streak, loop level, and offsets. Use for questions like 'how much karma do I have', 'my points', or 'my score'.",
      inputSchema: noArgs,
      execute: async () => {
        const [profileRes, scoreRes] = await Promise.all([
          fastapiGet<Record<string, unknown>>(
            "/profile/circularity-score",
            authHeader
          ),
          fastapiGet<Record<string, unknown>>("/users/me/score", authHeader),
        ]);
        if (!profileRes.ok) {
          return { error: profileRes.error, status: profileRes.status };
        }
        const profile = profileRes.data;
        const score = scoreRes.ok ? scoreRes.data : null;
        const displayScore =
          score && score.state === "verified" && score.verified != null
            ? score.verified
            : score?.provisional ?? profile.score;
        return {
          display_score: displayScore,
          score_state: score?.state ?? "unknown",
          provisional: score?.provisional ?? null,
          verified: score?.verified ?? null,
          impact_points: profile.impact_points,
          streak_days: profile.streak_days,
          loop_level: profile.loop_level,
          offset_kg_total: profile.offset_kg_total,
          confidence: score?.confidence ?? null,
          nudge_copy: score?.nudge_copy ?? null,
        };
      },
    }),

    getMyImpact: tool({
      description:
        "Fetch the signed-in user's footprint impact summary (total kg, residual, biggest opportunity).",
      inputSchema: noArgs,
      execute: async () => {
        const res = await fastapiGet("/users/me/impact", authHeader);
        if (!res.ok) return { error: res.error, status: res.status };
        return res.data;
      },
    }),

    listRewards: tool({
      description: "List partner rewards the user can redeem with Impact Points.",
      inputSchema: noArgs,
      execute: async () => {
        const res = await fastapiGet("/rewards", authHeader);
        if (!res.ok) return { error: res.error, status: res.status };
        return res.data;
      },
    }),

    listOffsets: tool({
      description: "List verified carbon offset projects available in the app.",
      inputSchema: noArgs,
      execute: async () => {
        const res = await fastapiGet("/offsets", authHeader);
        if (!res.ok) return { error: res.error, status: res.status };
        return res.data;
      },
    }),

    nearbyFacilities: tool({
      description:
        "Find nearby circularity facilities (repair, recycling, donation, resale).",
      inputSchema: z.object({
        type: z
          .enum(["repair", "recycling", "donation", "resale", "all"])
          .optional()
          .describe("Facility type filter; omit or all for mixed"),
      }),
      execute: async ({ type }) => {
        const path =
          type && type !== "all"
            ? type === "repair"
              ? "/repair/nearby"
              : type === "recycling"
                ? "/recycling/nearby"
                : type === "donation"
                  ? "/donation/nearby"
                  : "/resale/nearby"
            : "/facilities/nearby";
        const res = await fastapiGet(path, authHeader);
        if (!res.ok) return { error: res.error, status: res.status };
        return res.data;
      },
    }),

    /** Suggest an in-app screen; client may offer a navigation button. */
    openScreen: tool({
      description:
        "Suggest opening a Karma app screen for the user (scan, receipt, rewards, offsets, map, tabs). Returns a route the mobile app can open.",
      inputSchema: z.object({
        route: openScreenRouteSchema.describe("Allowlisted app route"),
        reason: z
          .string()
          .optional()
          .describe("Short reason shown to the user"),
      }),
      execute: async ({ route, reason }) => ({
        route,
        reason: reason ?? `Open ${route}`,
        navigable: true,
      }),
    }),
  };
}

export function buildSupportSystem(userName?: string) {
  const firstName = (userName || "").trim().split(/\s+/)[0] || "there";
  return `${SUPPORT_SYSTEM}\nAddress ${firstName} by name when natural.`;
}

export function createSupportAgent(authHeader: string, userName?: string) {
  return new Agent({
    model: getSupportModel(),
    system: buildSupportSystem(userName),
    tools: createSupportTools(authHeader),
    stopWhen: stepCountIs(3),
    maxOutputTokens: 280,
    temperature: 0.2,
  });
}

const _typeAgent = createSupportAgent("");
export type SupportUIMessage = InferAgentUIMessage<typeof _typeAgent>;
export type SupportAgent = ReturnType<typeof createSupportAgent>;
