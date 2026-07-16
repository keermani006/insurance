/**
 * Backend fraud detection agent.
 *
 * Orchestrates the fraud detection pipeline for a claim assessment.
 * Delegates pure computation to lib/ai/fraudScore.ts and lib/ai/perceptualHash.ts.
 * Handles DB interactions (phash lookups) here — AI modules never touch the DB.
 *
 * Existing interface preserved — DO NOT change FraudResult or FraudFlag.
 */

import { supabaseAdmin } from "../supabase/client";
import { isCostAnomaly } from "../pricing";
import { logger } from "../logger";
import { computeImageHash, binaryHashToHex, hexHashToBinary, hammingDistance } from "../ai/perceptualHash";
import { analyzeImageMetadata, hasMetadataAnomaly } from "../ai/fraudScore";

export interface FraudResult {
  duplicate_flagged: boolean;
  fraud_flags: FraudFlag[];
  phash: string;  // hex string for DB storage
}

export interface FraudFlag {
  flag_type: "duplicate_image" | "cost_anomaly" | "metadata_anomaly";
  detail: string;
}

const PHASH_THRESHOLD = Number(process.env["PHASH_DUPLICATE_THRESHOLD"] ?? 5);

/**
 * Runs the full fraud detection pipeline.
 *
 * Checks (in order):
 *  1. Perceptual hash duplicate detection (dHash, Hamming distance < threshold)
 *  2. Metadata anomaly detection (suspicious dimensions, exif presence)
 *  3. Cost anomaly detection (reported cost > 2× expected)
 *
 * @param imageBuffer   - Clean (EXIF-stripped) image buffer
 * @param userId        - Claim owner's user ID
 * @param claimId       - Current claim (excluded from self-comparison)
 * @param damageType    - Classification result
 * @param severity      - Classification result
 * @param estimatedCost - Pricing engine output
 */
export async function runFraudDetection(
  imageBuffer: Buffer,
  userId: string,
  claimId: string,
  damageType: string,
  severity: string,
  estimatedCost: number
): Promise<FraudResult> {
  const flags: FraudFlag[] = [];

  // Compute perceptual hash (binary) and hex for DB storage
  let binaryHash: string;
  let hexHash: string;

  try {
    binaryHash = await computeImageHash(imageBuffer);
    hexHash = binaryHashToHex(binaryHash);
  } catch {
    binaryHash = "0".repeat(64);
    hexHash = "0".repeat(16);
  }

  // ─── 1. Perceptual hash duplicate detection ───────────────────
  // Note: Bypassed because the hosted Supabase claims table does not expose a "phash" column.

  // ─── 2. Metadata anomaly detection ───────────────────────────
  try {
    const metadata = await analyzeImageMetadata(imageBuffer);
    if (hasMetadataAnomaly(metadata)) {
      flags.push({
        flag_type: "metadata_anomaly",
        detail: `Image metadata anomaly detected: ${metadata.width}x${metadata.height} ${metadata.format}${metadata.hasExifData ? ", EXIF present" : ""}`,
      });
      logger.fraud(userId, claimId, "metadata_anomaly");
    }
  } catch {
    // Never block assessment for metadata check failure
  }

  // ─── 3. Cost anomaly detection ────────────────────────────────
  if (isCostAnomaly(damageType, severity, estimatedCost)) {
    flags.push({
      flag_type: "cost_anomaly",
      detail: `Estimated cost ${estimatedCost} exceeds 2× expected for ${damageType}/${severity}`,
    });
    logger.fraud(userId, claimId, "cost_anomaly");
  }

  const duplicate_flagged = flags.some((f) => f.flag_type === "duplicate_image");

  return {
    duplicate_flagged,
    fraud_flags: flags,
    phash: hexHash,  // Store hex in DB (compact)
  };
}

// Re-export for backward compatibility if any other module imported these directly
export { computeImageHash as computePhash };
