/**
 * Backend damage classifier agent.
 *
 * Thin orchestration wrapper around the AI module.
 * Preserves the existing ClassificationResult interface consumed by
 * app/api/claims/[id]/assess/route.ts — DO NOT change the interface.
 *
 * Delegates to lib/ai/damageClassifier.ts which implements:
 *   1. YOLO ONNX inference (if model present)
 *   2. Pixel-stat fallback (always available)
 */

import { classifyDamageAI } from "../ai/damageClassifier";
import type { DamageType, Severity } from "../pricing";

/** Output interface consumed by the assess route — never change */
export interface ClassificationResult {
  damage_type: DamageType;
  severity: Severity;
  confidence: number;
}

/**
 * Classifies vehicle damage from an image buffer.
 * Routes through YOLO ONNX → pixel-stat fallback → UNCLEAR safe default.
 * NEVER throws. NEVER crashes the backend.
 */
export async function classifyDamage(imageBuffer: Buffer): Promise<ClassificationResult> {
  try {
    const result = await classifyDamageAI(imageBuffer);

    // Map "unclear" to "unknown" for backward compat with pricing engine
    const damage_type: DamageType =
      result.damage_type === "unclear" ? "unknown" : (result.damage_type as DamageType);

    return {
      damage_type,
      severity: result.severity as Severity,
      confidence: result.confidence,
    };
  } catch {
    // Ultimate fallback — should never reach here due to AI module's own safety
    return { damage_type: "unknown", severity: "minor", confidence: 0 };
  }
}
