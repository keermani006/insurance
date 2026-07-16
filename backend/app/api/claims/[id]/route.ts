import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import { parseClaimId } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";
import { Errors } from "@/lib/errors";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── GET /api/claims/:id ─────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  // 1. Auth
  const auth = await requireAuth(request);
  if (!auth) return Errors.unauthorized();

  const userId = auth.user.id;

  // 2. Rate limit
  if (!rateLimit.read(userId)) return Errors.tooManyRequests();

  // 3. Validate claim ID (UUID format)
  const { id: rawId } = await context.params;
  const claimId = parseClaimId(rawId);
  if (!claimId) {
    return Errors.badRequest("Invalid claim identifier");
  }

  // 4. Fetch claim, filtering by BOTH id AND user_id
  const { data: claim, error: claimError } = await supabaseAdmin
    .from("claims")
    .select("id, image_path, created_at")
    .eq("id", claimId)
    .eq("user_id", userId)
    .single();

  if (claimError || !claim) {
    logger.authzFailure(userId, claimId, "get_claim");
    return Errors.notFound();
  }

  const { data: flagsData } = await supabaseAdmin
    .from("fraud_flags")
    .select("flag_type, detail")
    .eq("claim_id", claimId);

  const hasFlags = flagsData && flagsData.length > 0;

  let assessments: any[] = [];
  const { data: assessData } = await supabaseAdmin
    .from("damage_assessments")
    .select("id, claim_id, damage_type, severity, confidence, explanation, estimated_cost, created_at")
    .eq("claim_id", claimId);

  const hasAssessments = assessData && assessData.length > 0;
  const computedStatus = hasFlags ? "flagged" : (hasAssessments ? "assessed" : "pending");

  if (hasAssessments) {
    const b = assessData[0] as any;
    assessments = [{
      id: b.id,
      damage_type: b.damage_type,
      severity: b.severity,
      confidence: b.confidence,
      explanation: b.explanation,
      estimated_cost: b.estimated_cost,
      created_at: b.created_at,
      duplicate_flagged: computedStatus === "flagged"
    }];
  }

  const BUCKET = process.env["SUPABASE_STORAGE_BUCKET"] ?? "claim-images";
  let imageUrl = "";
  if (claim.image_path) {
    const { data: urlData } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(claim.image_path, 3600);
    if (urlData) {
      imageUrl = urlData.signedUrl;
    }
  }

  const formattedClaim = {
    id: claim.id,
    image_path: claim.image_path,
    imageUrl,
    status: computedStatus,
    created_at: claim.created_at,
    updated_at: claim.created_at,
    assessments,
    fraud_flags: flagsData || []
  };

  return NextResponse.json({ claim: formattedClaim });
}

// Reject all other HTTP methods
export async function POST(): Promise<NextResponse> {
  return Errors.badRequest("Method not allowed");
}

export async function PUT(): Promise<NextResponse> {
  return Errors.badRequest("Method not allowed");
}

export async function DELETE(): Promise<NextResponse> {
  return Errors.badRequest("Method not allowed");
}
