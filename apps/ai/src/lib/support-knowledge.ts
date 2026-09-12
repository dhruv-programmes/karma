/** Curated Karma / Carbon Loop product knowledge for the support agent. */

export const APP_BENEFITS = {
  productName: "Karma",
  companyName: "Carbon Loop",
  tagline: "Make what you own count for more.",
  summary:
    "Karma is a personal circularity decision engine. Scan purchases, see carbon impact, choose repair/reuse/recycle over replace, earn Impact Points, and build a Karma Credit Score (KCS).",
  benefits: [
    "Decision help — compare Repair, Refurbish, Resell, Donate, Recycle, and Replace (cost vs kg CO₂e).",
    "Footprint visibility — live estimates from onboarding baseline plus receipts and spend.",
    "Karma Credit Score (KCS) — circular creditworthiness from about 480–820; Provisional then Verified.",
    "Impact Points — redeemable rewards track, separate from KCS.",
    "Local action — map nearby repair, recycling, donation, and resale facilities.",
    "Passive credit — step tracking offsets walking vs driving (demo).",
  ],
};

export const SCORE_AND_POINTS = {
  kcs: {
    name: "Karma Credit Score (KCS)",
    range: "480–820",
    meaning:
      "Circular creditworthiness based on footprint. Not the same as Impact Points.",
    provisionalVsVerified:
      "Provisional* is questionnaire/baseline-based and capped until enough real footprint signals (bills, scans, variety). Verified uses recorded data.",
    formulaHint:
      "Score maps from monthly kg CO₂e toward a mid-range around 650; lower footprint → higher score. Goal % only sets a monthly reduction target, not the score itself.",
  },
  impactPoints: {
    name: "Impact Points",
    meaning:
      "Redeemable points earned from verified circular actions (scan, receipt import, facility check-in, etc.). Used for partner rewards and demo offsets.",
    note: "KCS ≠ Impact Points. Score = credit/footprint track; points = rewards track.",
  },
};

export const FEATURE_GUIDES: Record<
  string,
  { title: string; steps: string[]; tip?: string }
> = {
  scan: {
    title: "Scan a product",
    steps: [
      "Open Tools → Scan Product (or the center Scan tab).",
      "Point the camera at a barcode.",
      "Review circularity options and open the product page to compare paths.",
    ],
    tip: "Demo barcode: 8901030865822",
  },
  receipt: {
    title: "Import a receipt",
    steps: [
      "Open Tools → Import Receipt.",
      "Upload a photo or PDF of a bill.",
      "Review AI-extracted lines, ask about the bill if needed, then confirm import.",
    ],
    tip: "Imported purchases feed your footprint and help verify your score.",
  },
  map: {
    title: "Find local facilities",
    steps: [
      "Open Tools → Recycling Hubs (or Map) and filter by type.",
      "Pick a nearby repair, recycle, donate, or resale spot.",
      "Complete a check-in after the action to earn Impact Points.",
    ],
  },
  rewards: {
    title: "Redeem rewards",
    steps: [
      "Open Rewards from Profile or shortcuts.",
      "Spend Impact Points on partner perks.",
      "Copy the claim code after redeeming (demo).",
    ],
  },
  offsets: {
    title: "Buy a carbon offset",
    steps: [
      "Prefer circular actions (repair/reuse) first.",
      "Open Tools → Offset Carbon.",
      "Choose a verified demo project and purchase with Impact Points or demo flow.",
    ],
    tip: "Offsets are demo — not real climate claims.",
  },
  offers: {
    title: "Browse offers",
    steps: [
      "Open the Offers tab (via More).",
      "See govt-style subsidies, partner vouchers, and offset shortcuts.",
    ],
    tip: "Offer content is demo / illustrative.",
  },
  home: {
    title: "Home dashboard",
    steps: [
      "See your KCS ring, habits/streak, and recommendations.",
      "Use quick actions for scan, receipt, repair, recycle, and steps.",
    ],
  },
};

export const OPEN_SCREEN_ROUTES = [
  "/scan",
  "/receipt",
  "/rewards",
  "/offsets",
  "/map",
  "/(tabs)",
  "/(tabs)/tools",
  "/(tabs)/offers",
  "/(tabs)/profile",
  "/support",
] as const;

export type OpenScreenRoute = (typeof OPEN_SCREEN_ROUTES)[number];
