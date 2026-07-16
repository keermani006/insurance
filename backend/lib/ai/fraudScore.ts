/**
 * Fraud scoring helpers — pure functions, no DB access, no Supabase.
 *
 * Backend handles all persistence. These functions only compute scores
 * from the data passed in.
 *
 * All functions are:
 *   - Pure (no side effects)
 *   - Synchronous (except where image parsing is needed)
 *   - Typed
 *   - Safe (never throw)
 */

import sharp from "sharp";
import { hammingDistance } from "./perceptualHash";
import type { FraudScoreResult, ImageMetadata } from "./types";
import { PHASH_DUPLICATE_THRESHOLD } from "./types";

// ─── Duplicate detection ─────────────────────────────────────────

/**
 * Compares two perceptual hashes and returns true if they are likely
 * the same or very similar image (Hamming distance < threshold).
 *
 * Supports both 64-bit binary strings and 16-char hex strings.
 *
 * @param hashA     - Binary or hex hash from computeImageHash / binaryHashToHex
 * @param hashB     - Binary or hex hash to compare against
 * @param threshold - Override for the default duplicate threshold (env: PHASH_DUPLICATE_THRESHOLD)
 */
export function isDuplicateImage(
  hashA: string,
  hashB: string,
  threshold: number = PHASH_DUPLICATE_THRESHOLD
): boolean {
  if (!hashA || !hashB) return false;

  // Normalise: if hex (length 16), convert to binary for comparison
  const a = hashA.length === 16 ? hexToBinary(hashA) : hashA;
  const b = hashB.length === 16 ? hexToBinary(hashB) : hashB;

  const dist = hammingDistance(a, b);
  return dist < threshold;
}

/** Internal: hex nibble → 4 bits binary */
function hexToBinary(hex: string): string {
  let bits = "";
  for (const char of hex) {
    bits += parseInt(char, 16).toString(2).padStart(4, "0");
  }
  return bits;
}

// ─── Cost anomaly detection ──────────────────────────────────────

/**
 * Expected cost ranges by damage type and severity (USD).
 * Maintained separately from pricing.ts so this module has no backend import.
 * Mirrors the values in lib/pricing.ts — keep in sync.
 */
const EXPECTED_COST_RANGES: Record<string, Record<string, { min: number; max: number }>> = {
  scratches:    { minor: { min: 100, max: 600 },   moderate: { min: 400, max: 1_600 },  severe: { min: 800, max: 3_000 },   total_loss: { min: 1_000, max: 4_000 } },
  dents:        { minor: { min: 200, max: 1_000 },  moderate: { min: 800, max: 3_000 },  severe: { min: 2_000, max: 8_000 }, total_loss: { min: 3_000, max: 12_000 } },
  broken_glass: { minor: { min: 150, max: 800 },   moderate: { min: 500, max: 1_800 },  severe: { min: 1_200, max: 4_400 }, total_loss: { min: 1_800, max: 7_000 } },
  structural:   { minor: { min: 800, max: 4_000 },  moderate: { min: 3_000, max: 12_000 }, severe: { min: 8_000, max: 30_000 }, total_loss: { min: 15_000, max: 50_000 } },
  flood:        { minor: { min: 1_200, max: 6_000 }, moderate: { min: 4_000, max: 16_000 }, severe: { min: 10_000, max: 36_000 }, total_loss: { min: 20_000, max: 60_000 } },
  fire:         { minor: { min: 1_500, max: 8_000 }, moderate: { min: 6_000, max: 24_000 }, severe: { min: 14_000, max: 50_000 }, total_loss: { min: 25_000, max: 80_000 } },
  total_loss:   { minor: { min: 5_000, max: 20_000 }, moderate: { min: 12_000, max: 40_000 }, severe: { min: 25_000, max: 70_000 }, total_loss: { min: 40_000, max: 100_000 } },
  unknown:      { minor: { min: 100, max: 2_000 },  moderate: { min: 500, max: 5_000 },  severe: { min: 2_000, max: 15_000 }, total_loss: { min: 5_000, max: 25_000 } },
  unclear:      { minor: { min: 0, max: 1_000 },    moderate: { min: 0, max: 3_000 },    severe: { min: 0, max: 10_000 },    total_loss: { min: 0, max: 20_000 } },
};

/**
 * Returns true if the reported/estimated cost is anomalously high
 * compared to expected ranges for the given damage type and severity.
 *
 * Threshold: cost > 2.5× the expected maximum is flagged.
 *
 * @pure No side effects.
 */
export function isCostAnomalyHelper(
  damageType: string,
  severity: string,
  cost: number,
  multiplierThreshold: number = 2.5
): boolean {
  try {
    const typeKey = damageType.toLowerCase();
    const sevKey = severity.toLowerCase();
    const range = EXPECTED_COST_RANGES[typeKey]?.[sevKey];

    if (!range) return false; // Unknown type — can't assess

    return cost > range.max * multiplierThreshold;
  } catch {
    return false;
  }
}

// ─── Metadata anomaly detection ──────────────────────────────────

/**
 * Extracts basic metadata from an image buffer for anomaly analysis.
 * Pure — does not write to DB. Does not throw.
 */
export async function analyzeImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  try {
    const metadata = await sharp(buffer).metadata();

    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const format = metadata.format ?? "unknown";

    // A real vehicle photo should be at least 200×200
    const suspiciouslySmall = width < 200 || height < 200;

    // Check for EXIF data — legitimate claim photos should have been stripped
    // If EXIF is still present after upload, that's a metadata anomaly
    const hasExifData = !!(metadata.exif);

    return {
      width,
      height,
      format,
      hasExifData,
      fileSize: buffer.length,
      suspiciouslySmall,
    };
  } catch {
    return {
      width: 0,
      height: 0,
      format: "unknown",
      hasExifData: false,
      fileSize: buffer.length,
      suspiciouslySmall: true,
    };
  }
}

/**
 * Returns true if image metadata shows signs of manipulation.
 * Checks:
 *  - Suspiciously small dimensions (< 200×200)
 *  - EXIF data present (should have been stripped on upload)
 *  - Extremely low file size relative to dimensions (indicator of programmatic generation)
 */
export function hasMetadataAnomaly(metadata: ImageMetadata): boolean {
  if (metadata.suspiciouslySmall) return true;
  if (metadata.hasExifData) return true;

  // File size check: less than 1 byte per pixel is suspicious for a real photo
  const expectedMinBytes = metadata.width * metadata.height;
  if (expectedMinBytes > 0 && metadata.fileSize < expectedMinBytes * 0.05) {
    return true;
  }

  return false;
}

// ─── Composite fraud score ────────────────────────────────────────

interface FraudInput {
  isDuplicate: boolean;
  isCostAnomaly: boolean;
  isMetadataAnomaly: boolean;
}

/**
 * Computes a composite fraud risk score (0–100).
 *
 * Weights:
 *  - Duplicate image: 50 points (highest risk)
 *  - Cost anomaly: 30 points
 *  - Metadata anomaly: 20 points
 *
 * @pure No side effects.
 */
export function computeFraudScore(input: FraudInput): FraudScoreResult {
  let score = 0;

  if (input.isDuplicate) score += 50;
  if (input.isCostAnomaly) score += 30;
  if (input.isMetadataAnomaly) score += 20;

  return {
    duplicate_flagged: input.isDuplicate,
    cost_anomaly: input.isCostAnomaly,
    metadata_anomaly: input.isMetadataAnomaly,
    overall_score: Math.min(100, score),
  };
}
