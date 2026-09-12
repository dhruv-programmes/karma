import { NextResponse } from "next/server";
import { fastapiBase, requireApiKey } from "@/lib/ai";
import { jsonError, optionsResponse, withCors } from "@/lib/cors";

export const maxDuration = 30;

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

type ConfirmItem = {
  id?: string;
  merchant: string;
  amount_inr: number;
  date: string;
  category?: string;
  confidence?: "high" | "medium" | "low";
  discarded?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: Request) {
  // Confirm does not need Gemini; key check optional. Keep soft so confirm works offline from AI key issues after extract.
  void requireApiKey;

  let body: { items?: ConfirmItem[]; userName?: string; documentTitle?: string };
  try {
    const raw = await req.json();
    if (!isRecord(raw)) throw new Error("Expected a JSON object");
    if (!Array.isArray(raw.items)) throw new Error("items must be an array");
    const malformedIndex = raw.items.findIndex((item) => {
      if (!isRecord(item)) return true;
      return (
        (item.id !== undefined &&
          (typeof item.id !== "string" || item.id.trim().length === 0)) ||
        typeof item.merchant !== "string" ||
        item.merchant.trim().length === 0 ||
        typeof item.amount_inr !== "number" ||
        !Number.isFinite(item.amount_inr) ||
        item.amount_inr < 0 ||
        typeof item.date !== "string" ||
        item.date.trim().length === 0 ||
        (item.category !== undefined && typeof item.category !== "string") ||
        (item.confidence !== undefined &&
          (typeof item.confidence !== "string" ||
            !["high", "medium", "low"].includes(item.confidence))) ||
        (item.discarded !== undefined && typeof item.discarded !== "boolean")
      );
    });
    if (malformedIndex >= 0) {
      throw new Error(`items[${malformedIndex}] is missing valid merchant, amount_inr, or date`);
    }
    if (raw.userName !== undefined && typeof raw.userName !== "string") {
      throw new Error("userName must be a string");
    }
    if (raw.documentTitle !== undefined && typeof raw.documentTitle !== "string") {
      throw new Error("documentTitle must be a string");
    }
    body = raw as unknown as typeof body;
  } catch (e) {
    return jsonError(
      400,
      `Invalid confirmation body: ${
        e instanceof Error
          ? e.message
          : "expected an items array with merchant, amount_inr, and date"
      }`,
      req
    );
  }

  const items = (body.items ?? []).filter((i) => !i.discarded);
  const firstName = (body.userName || "").trim().split(/\s+/)[0] || "";
  const docTitle = (body.documentTitle || "").trim();

  if (items.length === 0) {
    return withCors(
      NextResponse.json({
        imported: 0,
        transactions: [],
        message: firstName
          ? `${firstName}, nothing was selected to import — tweak the list and try again.`
          : "No items to import.",
        badges_unlocked: [],
      }),
      req
    );
  }

  const rows = items.map((i) => ({
    // Keep the extraction line identity through the proxy. Without this,
    // two identical line items collapse onto one canonical receipt key and
    // a repeated confirmation can incorrectly lose a legitimate purchase.
    source_key: i.id
      ? `document:${docTitle || "uploaded"}:line:${i.id}`
      : undefined,
    merchant: i.merchant,
    amount_inr: i.amount_inr,
    date: i.date,
    category: i.category,
    // Preserve confidence through the proxy so FastAPI can apply its
    // risk-adjusted receipt reward multiplier for medium/low lines.
    confidence: i.confidence ?? "high",
  }));

  const auth = req.headers.get("authorization") || "";
  const base = fastapiBase();

  try {
    const res = await fetch(`${base}/api/v1/transactions/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth || "Bearer demo-carbon-loop-token",
      },
      body: JSON.stringify({ rows }),
    });

    if (!res.ok) {
      const err = await res.text();
      return jsonError(
        res.status,
        `FastAPI import failed: ${err.slice(0, 200)}`,
        req
      );
    }

    const rawData = await res.json().catch(() => null);
    const imported = isRecord(rawData) ? rawData.imported : undefined;
    const transactions = isRecord(rawData) ? rawData.transactions : undefined;
    if (
      typeof imported !== "number" ||
      !Number.isInteger(imported) ||
      imported < 0 ||
      !Array.isArray(transactions)
    ) {
      return jsonError(
        502,
        "FastAPI returned an invalid import response; nothing was confirmed",
        req
      );
    }
    const data = rawData as {
      imported: number;
      transactions: { merchant?: string; amount_inr?: number }[];
      co2e_kg_added?: number;
      reward_points_awarded?: number;
      duplicate_count?: number;
      reward_formula_version?: string;
    };
    if (data.imported > items.length) {
      return jsonError(
        502,
        "FastAPI returned an inconsistent import count; nothing was confirmed",
        req
      );
    }

    const totalInr = items.reduce(
      (sum, i) => sum + (Number(i.amount_inr) || 0),
      0
    );
    const merchants = [
      ...new Set(items.map((i) => i.merchant.trim()).filter(Boolean)),
    ];
    const merchantBit =
      merchants.length === 1
        ? merchants[0]
        : merchants.length === 2
          ? `${merchants[0]} and ${merchants[1]}`
          : `${merchants[0]} and ${merchants.length - 1} others`;
    const titleBit = docTitle ? ` from “${docTitle}”` : "";
    const hello = firstName ? `${firstName}, ` : "";
    const message = `${hello}${data.imported} spend line${
      data.imported === 1 ? "" : "s"
    }${titleBit} ${
      data.imported === 1 ? "is" : "are"
    } on your footprint (₹${Math.round(totalInr).toLocaleString("en-IN")} via ${merchantBit}).`;

    return withCors(
      NextResponse.json({
        imported: data.imported,
        transactions: data.transactions,
        message,
        badges_unlocked: [],
        is_mock: false,
        total_inr: totalInr,
        ...(typeof data.co2e_kg_added === "number"
          ? { co2e_kg_added: data.co2e_kg_added }
          : {}),
        ...(typeof data.reward_points_awarded === "number"
          ? { reward_points_awarded: data.reward_points_awarded }
          : {}),
        ...(typeof data.duplicate_count === "number"
          ? { duplicate_count: data.duplicate_count }
          : {}),
        ...(typeof data.reward_formula_version === "string"
          ? { reward_formula_version: data.reward_formula_version }
          : {}),
      }),
      req
    );
  } catch (e) {
    return jsonError(
      502,
      e instanceof Error
        ? `Cannot reach FastAPI at ${base}: ${e.message}`
        : "Cannot reach FastAPI",
      req
    );
  }
}
