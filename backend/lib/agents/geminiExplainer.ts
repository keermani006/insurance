/**
 * Backend Gemini explainer agent.
 *
 * Thin wrapper that bridges the backend's ExplainerInput interface
 * to the AI module's ExplanationInput interface, then returns a plain string
 * as the assess route expects.
 *
 * Existing output contract (string) preserved — the assess route writes
 * this directly as the "explanation" field in the API response.
 */

import { generateExplanation } from "../ai/explanation";
import type { DamageType, Severity } from "../pricing";

/** Input interface consumed by the assess route — never change */
export interface ExplainerInput {
  damage_type: DamageType | string;
  severity: Severity | string;
  confidence: number;
  estimated_cost: number;
  duplicate_flagged: boolean;
}

/**
 * Generates a human-readable explanation string using Gemini 2.5 Flash.
 *
 * Security guarantees:
 *  - Only structured backend values are passed to Gemini (enforced in lib/ai/explanation.ts)
 *  - All inputs are sanitised with character allowlists before prompt construction
 *  - Never throws — returns a deterministic fallback on any failure
 *
 * @returns Plain text explanation string (2–3 sentences)
 */
export async function generateExplanation_backend(input: ExplainerInput): Promise<string> {
  try {
    const result = await generateExplanation({
      damage_type: String(input.damage_type),
      severity: String(input.severity),
      confidence: input.confidence,
      estimated_cost: input.estimated_cost,
      // Map boolean flag to string array for the AI module's interface
      fraud_flags: input.duplicate_flagged ? ["duplicate_image"] : [],
    });
    return result.summary;
  } catch {
    // Absolute last-resort fallback — AI module should never throw, but be safe
    return `Vehicle damage detected: ${input.damage_type} (${input.severity}). Estimated repair cost: $${input.estimated_cost}.`;
  }
}

// Keep original export name for backward compatibility with assess route
export { generateExplanation_backend as generateExplanation };
