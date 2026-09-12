import type { LeagueTier } from "@/src/types/api";

/** Shared local asset mapping for the server-selected league tier. */
export function leagueBadgeSource(tier: LeagueTier) {
  switch (tier) {
    case "bronze":
      return require("@/assets/league-badges/bronze.png");
    case "silver":
      return require("@/assets/league-badges/silver.png");
    case "gold":
      return require("@/assets/league-badges/gold.png");
    case "platinum":
      return require("@/assets/league-badges/platinum.png");
  }
}

/** Avoid rendering NaN/Infinity if an API payload is incomplete. */
export function formatLeagueNumber(value: unknown): string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric).toLocaleString() : "—";
}

