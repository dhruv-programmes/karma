import { z } from "zod";

export const verificationBlockSchema = z.object({
  legitimate: z.boolean(),
  evidence_type: z.string(),
  confidence: z.number().min(0).max(1),
  sufficient_for_claim: z.boolean(),
  reason: z.string(),
  routing_hint: z.enum(["ev_section", "solar_section", "generic"]),
});

export const assetBlockSchema = z.object({
  type: z.enum([
    "solar_pv",
    "electric_vehicle",
    "solar_water_heater",
    "energy_efficient_appliance",
    "other",
  ]),
  subtype: z.string().nullable(),
  identifier: z.string().nullable(),
  ownership_verified: z.boolean(),
});

export const observationFieldSchema = z.object({
  field_name: z.string(),
  value: z.union([z.string(), z.number()]).nullable(),
});

export const measurementSchema = z.object({
  metric_type: z.string(),
  value: z.number(),
  unit: z.string(),
});

export const observationsBlockSchema = z.object({
  fields: z.array(observationFieldSchema),
  measurements: z.array(measurementSchema),
});

export const temporalBlockSchema = z.object({
  evidence_date: z.string().nullable(),
  billing_period_start: z.string().nullable(),
  billing_period_end: z.string().nullable(),
  recency_status: z.enum(["CURRENT", "RECENT", "EXPIRED", "UNKNOWN"]),
});

export const fraudBlockSchema = z.object({
  needs_manual_review: z.boolean(),
  manipulation_risk: z.number().min(0).max(1),
});

export const impactInputsBlockSchema = z.object({
  capacity_kw: z.number().nullable(),
  generation_kwh: z.number().nullable(),
  distance_km: z.number().nullable(),
  energy_consumption_kwh: z.number().nullable(),
});

export const shortRunBlockSchema = z.object({
  eligible: z.boolean(),
  reward_type: z.enum(["ADOPTION", "GENERATION", "USAGE", "NONE"]),
});

export const longRunBlockSchema = z.object({
  eligible: z.boolean(),
  measurement_type: z.enum(["GENERATION", "USAGE", "ADOPTION", "NONE"]),
});

export const verificationAnalysisSchema = z.object({
  verification: verificationBlockSchema,
  asset: assetBlockSchema,
  observations: observationsBlockSchema,
  temporal: temporalBlockSchema,
  fraud: fraudBlockSchema,
  impact_inputs: impactInputsBlockSchema,
  short_run: shortRunBlockSchema,
  long_run: longRunBlockSchema,
  explanation: z.string(),
});

export type VerificationAnalysis = z.infer<typeof verificationAnalysisSchema>;

export const VERIFY_SYSTEM_PROMPT = `You are the Evidence Verification Vision Model for a sustainability rewards system (EcoProof / EcoScan).
Your task is to inspect ONLY the submitted camera image and extract observable evidence.
Do not award points and do not invent environmental impact numbers.

You must:
1. Identify the document type (e.g. SOLAR_ELECTRICITY_BILL, ELECTRIC_VEHICLE_RC, EV_CHARGING_RECEIPT, SOLAR_INVERTER_DASHBOARD, APPLIANCE_ENERGY_LABEL).
2. Determine the sustainability asset type (solar_pv, electric_vehicle, solar_water_heater, energy_efficient_appliance, or other).
3. Extract visible fields exactly as written (e.g., kWh, dates, registration numbers, owner name, vehicle make/model, consumer number).
4. Use null for fields that cannot be reliably read. Never guess a number.
5. Set routing_hint: "ev_section" for EV RC/invoice/charging, "solar_section" for solar bills/inverter dashboards, "generic" otherwise.
6. Do NOT use <think> tags. Output ONLY the raw JSON object immediately.

Output ONLY valid JSON. Do not enclose in markdown code blocks.`;
