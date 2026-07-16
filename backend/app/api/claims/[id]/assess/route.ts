import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import { parseClaimId } from "@/lib/validation";
import { classifyDamage } from "@/lib/agents/damageClassifier";
import { runFraudDetection } from "@/lib/agents/fraudDetection";
import { generateExplanation } from "@/lib/agents/geminiExplainer";
import { getEstimatedCost } from "@/lib/pricing";
import { rateLimit } from "@/lib/rateLimit";
import { Errors } from "@/lib/errors";
import { logger } from "@/lib/logger";

const BUCKET = process.env["SUPABASE_STORAGE_BUCKET"] ?? "claim-images";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  // ─── 1. Authentication ──────────────────────────────────────────
  const auth = await requireAuth(request);
  if (!auth) return Errors.unauthorized();

  const userId = auth.user.id;

  // ─── 2. Rate limiting ───────────────────────────────────────────
  if (!rateLimit.assess(userId)) {
    logger.rateLimit(userId, "assess");
    return Errors.tooManyRequests();
  }

  // ─── 3. Validate and parse claim ID ────────────────────────────
  const { id: rawId } = await context.params;
  const claimId = parseClaimId(rawId);
  if (!claimId) {
    return Errors.badRequest("Invalid claim identifier");
  }

  // ─── 4. Fetch claim + ownership verification ────────────────────
  // We explicitly filter by user_id — NEVER rely solely on RLS.
  const { data: claim, error: claimError } = await supabaseAdmin
    .from("claims")
    .select("id, user_id, image_path")
    .eq("id", claimId)
    .eq("user_id", userId)   // ownership enforced here
    .single();

  if (claimError || !claim) {
    logger.authzFailure(userId, claimId, "assess");
    return Errors.notFound();
  }

  // Ownership double-check (defence-in-depth)
  if (claim.user_id !== userId) {
    logger.authzFailure(userId, claimId, "assess");
    return Errors.forbidden();
  }

  // ─── 5. Prevent double assessment (application-level check) ─────
  // DB has a UNIQUE constraint on assessments.claim_id — this is the
  // application-level check that runs before the race-condition window.
  const { data: existingAssessment } = await supabaseAdmin
    .from("damage_assessments")
    .select("id")
    .eq("claim_id", claimId)
    .single();

  if (existingAssessment) {
    return Errors.conflict("This claim has already been assessed");
  }

  // ─── 6. Download image from storage ────────────────────────────
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(claim.image_path as string);

  if (downloadError || !fileData) {
    logger.error("assess.image_download_failed", userId, { claimId });
    return Errors.internal();
  }

  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(await fileData.arrayBuffer());
  } catch {
    return Errors.internal();
  }

  // ─── 7. Damage classification ───────────────────────────────────
  let classification: Awaited<ReturnType<typeof classifyDamage>>;
  try {
    classification = await classifyDamage(imageBuffer);
  } catch {
    logger.error("assess.classify_failed", userId, { claimId });
    return Errors.internal();
  }

  const { damage_type, severity, confidence } = classification;

  // If the pretrained model fails or has low confidence, return unclear fallback structure
  if (damage_type === "unknown" || confidence < 0.30) {
    return NextResponse.json({
      damage_type: "unclear",
      severity: "minor",
      confidence: 0,
      explanation: "Unable to confidently detect vehicle damage.",
      estimated_cost: 0,
      duplicate_flagged: false
    });
  }

  // ─── 8. Pricing (deterministic — never Gemini) ──────────────────
  const estimated_cost = getEstimatedCost(damage_type, severity);

  // ─── 9. Fraud detection ─────────────────────────────────────────
  let fraudResult: Awaited<ReturnType<typeof runFraudDetection>>;
  try {
    fraudResult = await runFraudDetection(
      imageBuffer,
      userId,
      claimId,
      damage_type,
      severity,
      estimated_cost
    );
  } catch {
    // Fraud failure should not block assessment
    logger.error("assess.fraud_failed", userId, { claimId });
    fraudResult = { duplicate_flagged: false, fraud_flags: [], phash: "" };
  }

  const { duplicate_flagged, fraud_flags, phash } = fraudResult;

  // ─── 10. Gemini explanation (structured input only) ─────────────
  let explanation: string;
  try {
    explanation = await generateExplanation({
      damage_type,
      severity,
      confidence,
      estimated_cost,
      duplicate_flagged,
    });
  } catch {
    explanation = `Damage classified as ${damage_type} (${severity}). Estimated cost: $${estimated_cost}.`;
  }

  // ─── 11. Persist assessment + update claim ───────────────────────
  // These are performed sequentially — if assessment insert fails we don't
  // want partial state. DB UNIQUE constraint on claim_id prevents race conditions.
  const { error: assessError } = await supabaseAdmin
    .from("damage_assessments")
    .insert({
      claim_id: claimId,
      damage_type,
      severity,
      confidence,
      explanation,
      estimated_cost,
    });

  if (assessError) {
    // Handle race condition where another request completed assessment first
    if (assessError.code === "23505") {
      // Unique violation — another request already inserted
      return Errors.conflict("This claim has already been assessed");
    }
    logger.error("assess.insert_failed", userId, { claimId });
    return Errors.internal();
  }

  // ─── 12. Persist fraud flags ────────────────────────────────────
  // Note: claims status is computed dynamically based on the existence of assessments and fraud flags.
  // We do not update status or phash on the claims table as the hosted schema does not contain these columns.
  if (fraud_flags.length > 0) {
    const flagRows = fraud_flags.map((flag) => ({
      claim_id: claimId,
      user_id: userId,
      flag_type: flag.flag_type,
      detail: flag.detail,
    }));

    await supabaseAdmin.from("fraud_flags").insert(flagRows);
  }

  logger.assessment(userId, claimId, duplicate_flagged);

  // ─── 13. Return response (exact contract) ───────────────────────
  return NextResponse.json({
    damage_type,
    severity,
    confidence,
    explanation,
    estimated_cost,
    duplicate_flagged,
  });
}

// Reject all other HTTP methods
export async function GET(): Promise<NextResponse> {
  return Errors.badRequest("Method not allowed");
}
