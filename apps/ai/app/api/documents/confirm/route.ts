import { NextResponse } from "next/server";
import { fastapiBase, requireApiKey } from "@/lib/ai";
import { jsonError, optionsResponse, withCors } from "@/lib/cors";

export const maxDuration = 30;

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

type ConfirmItem = {
  merchant: string;
  amount_inr: number;
  date: string;
  category?: string;
  discarded?: boolean;
};

export async function POST(req: Request) {
  // Confirm does not need Gemini; key check optional. Keep soft so confirm works offline from AI key issues after extract.
  void requireApiKey;

  let body: { items?: ConfirmItem[]; userName?: string; documentTitle?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body", req);
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
    merchant: i.merchant,
    amount_inr: i.amount_inr,
    date: i.date,
    category: i.category,
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

    const data = (await res.json()) as {
      imported: number;
      transactions: { merchant?: string; amount_inr?: number }[];
    };

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
