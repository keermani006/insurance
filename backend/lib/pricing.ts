/**
 * Deterministic pricing engine.
 *
 * Rules:
 *  - NEVER ask Gemini for prices.
 *  - All costs are fixed lookup values.
 *  - Returns 0 for unknown combinations rather than throwing.
 */

export type DamageType =
  | "scratches"
  | "dents"
  | "broken_glass"
  | "structural"
  | "flood"
  | "fire"
  | "total_loss"
  | "unknown";

export type Severity = "minor" | "moderate" | "severe" | "total_loss";

/**
 * Pricing table — all values in USD.
 * Structure: priceTable[damage_type][severity] = estimated_cost
 */
const PRICE_TABLE: Record<DamageType, Record<Severity, number>> = {
  scratches: {
    minor: 300,
    moderate: 800,
    severe: 1_500,
    total_loss: 2_000,
  },
  dents: {
    minor: 500,
    moderate: 1_500,
    severe: 4_000,
    total_loss: 6_000,
  },
  broken_glass: {
    minor: 400,
    moderate: 900,
    severe: 2_200,
    total_loss: 3_500,
  },
  structural: {
    minor: 2_000,
    moderate: 6_000,
    severe: 15_000,
    total_loss: 25_000,
  },
  flood: {
    minor: 3_000,
    moderate: 8_000,
    severe: 18_000,
    total_loss: 30_000,
  },
  fire: {
    minor: 4_000,
    moderate: 12_000,
    severe: 25_000,
    total_loss: 40_000,
  },
  total_loss: {
    minor: 10_000,
    moderate: 20_000,
    severe: 35_000,
    total_loss: 50_000,
  },
  unknown: {
    minor: 500,
    moderate: 1_500,
    severe: 5_000,
    total_loss: 10_000,
  },
};

/**
 * Returns the estimated cost for the given damage type and severity.
 * Fully deterministic — no external calls.
 */
export function getEstimatedCost(damageType: string, severity: string): number {
  const normalDamage = (damageType.toLowerCase() as DamageType) in PRICE_TABLE
    ? (damageType.toLowerCase() as DamageType)
    : "unknown";

  const normalSeverity = (["minor", "moderate", "severe", "total_loss"].includes(severity.toLowerCase())
    ? severity.toLowerCase()
    : "minor") as Severity;

  return PRICE_TABLE[normalDamage][normalSeverity] ?? 0;
}

/**
 * Returns true if the given cost is anomalous (> 2x the expected price).
 * Used by fraud detection.
 */
export function isCostAnomaly(damageType: string, severity: string, reportedCost: number): boolean {
  const expected = getEstimatedCost(damageType, severity);
  return reportedCost > expected * 2;
}
