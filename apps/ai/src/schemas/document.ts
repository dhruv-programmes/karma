import { z } from "zod";

export const productCategorySchema = z.enum([
  "Electronics",
  "Clothing",
  "Food",
  "Transport",
  "Home",
  "Energy",
  "Furniture",
  "Personal care",
  "Other",
]);

export const extractedItemSchema = z.object({
  merchant: z
    .string()
    .describe("Merchant or payee name as shown on the document"),
  amount_inr: z.number().describe("Line or charge amount in INR"),
  date: z.string().describe("ISO date YYYY-MM-DD when known, else best guess"),
  category: productCategorySchema.describe("Carbon footprint category"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("high only when amount and merchant are clear"),
  needs_review_reason: z
    .string()
    .nullable()
    .describe("Why confidence is not high, else null"),
});

export const documentExtractionSchema = z.object({
  title: z.string().describe("Short document title"),
  doc_type: z.enum(["receipt", "utility", "invoice", "other"]),
  items: z
    .array(extractedItemSchema)
    .describe("Purchases or bill line items that affect footprint"),
});

export type DocumentExtraction = z.infer<typeof documentExtractionSchema>;
export type ExtractedItem = z.infer<typeof extractedItemSchema>;

export const EXTRACT_SYSTEM_PROMPT = `You extract footprint-relevant spend from Indian bills and receipts (INR).
Return structured data only matching the schema.
Categories: Electronics, Clothing, Food, Transport, Home, Energy, Furniture, Personal care, Other.
Use confidence "high" only when merchant and amount are clearly readable.
Use "medium" or "low" when blurry, partial, or ambiguous — set needs_review_reason.
Prefer separate line items over a single total when line amounts are visible.
Dates: prefer YYYY-MM-DD. If year missing, use current year context from the document.`;
