/**
 * Shared types for the AI module layer.
 *
 * These types are the canonical contract between:
 *   - AI modules (lib/ai/*)
 *   - Backend agents (lib/agents/*)
 *   - API routes (app/api/claims/*)
 *
 * NEVER change exported interface shapes — backend contracts depend on them.
 */

// ─── Damage classification ────────────────────────────────────────

/**
 * Canonical damage type values.
 * Must stay in sync with lib/pricing.ts PRICE_TABLE keys.
 */
export type DamageType =
  | "scratches"
  | "dents"
  | "broken_glass"
  | "structural"
  | "flood"
  | "fire"
  | "total_loss"
  | "unclear"   // low-confidence / cannot assess
  | "unknown";  // fallback

export type Severity = "minor" | "moderate" | "severe" | "total_loss";

/** Primary output of the damage classification pipeline */
export interface DamageDetection {
  damage_type: DamageType;
  severity: Severity;
  confidence: number;   // [0, 1]
}

/** Axis-aligned bounding box in pixel coords (relative to original image) */
export interface BoundingBox {
  x: number;      // top-left x
  y: number;      // top-left y
  width: number;
  height: number;
}

/** Raw detection from YOLO before mapping to DamageDetection */
export interface YOLODetection {
  classId: number;
  className: string;
  confidence: number;   // [0, 1]
  bbox: BoundingBox;
}

// ─── AI explanation ───────────────────────────────────────────────

/** Input to the LLM explanation module — ONLY structured backend values */
export interface ExplanationInput {
  damage_type: string;
  severity: string;
  confidence: number;
  estimated_cost: number;
  /** Fraud flag types that were triggered, e.g. ["duplicate_image"] */
  fraud_flags: string[];
}

/** Output of the LLM explanation module */
export interface ExplanationOutput {
  summary: string;  // 2–3 sentences, plain language
}

// ─── Fraud scoring ────────────────────────────────────────────────

/** Input to pure fraud scoring helpers */
export interface FraudHelperInput {
  phashA: string;           // 64-bit binary string
  phashB: string;           // 64-bit binary string
  damageType: string;
  severity: string;
  estimatedCost: number;
  imageMetadata?: ImageMetadata;
}

export interface FraudScoreResult {
  duplicate_flagged: boolean;
  cost_anomaly: boolean;
  metadata_anomaly: boolean;
  /** Composite score 0–100; 0 = clean, 100 = extremely suspicious */
  overall_score: number;
}

/** Extracted metadata from the image buffer */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  hasExifData: boolean;
  fileSize: number;
  /** Whether the dimensions are suspiciously small for a real photo */
  suspiciouslySmall: boolean;
}

// ─── Constants ────────────────────────────────────────────────────

export const PHASH_BITS = 64;
export const PHASH_DUPLICATE_THRESHOLD = Number(
  process.env["PHASH_DUPLICATE_THRESHOLD"] ?? 5
);

/** Unclear / low-confidence fallback result */
export const UNCLEAR_DETECTION: DamageDetection = {
  damage_type: "unclear",
  severity: "minor",
  confidence: 0,
};

/** Standard Output structure required by CV lead */
export interface AssessmentResult {
  damage_type: string;
  severity: "minor" | "moderate" | "severe";
  confidence: number;
  explanation: string;
}

export const UNCLEAR_ASSESSMENT: AssessmentResult = {
  damage_type: "unclear",
  severity: "minor",
  confidence: 0,
  explanation: "Unable to confidently detect vehicle damage.",
};

/** Fallback explanation when LLM is unavailable */
export const FALLBACK_EXPLANATION: ExplanationOutput = {
  summary: "Unable to assess image. Please contact support for manual review.",
};
