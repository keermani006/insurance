import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import { parseClaimId, claimsListQuerySchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";
import { Errors } from "@/lib/errors";

// ─── GET /api/claims ─────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const auth = await requireAuth(request);
  if (!auth) return Errors.unauthorized();

  const userId = auth.user.id;

  // 2. Rate limit
  if (!rateLimit.read(userId)) return Errors.tooManyRequests();

  // 3. Parse + validate query params
  const searchParams = request.nextUrl.searchParams;
  const queryParse = claimsListQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!queryParse.success) {
    return Errors.badRequest("Invalid query parameters");
  }

  const { page, limit } = queryParse.data;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // 4. Query claims list — always filter by user_id
  const { data: claims, error: claimsError, count } = await supabaseAdmin
    .from("claims")
    .select("id, image_path, created_at", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (claimsError) {
    return Errors.internal();
  }

  const claimIds = claims?.map(c => c.id) || [];
  let damageAssessments: any[] = [];
  let fraudFlags: any[] = [];

  if (claimIds.length > 0) {
    const { data: assessData, error: assessError } = await supabaseAdmin
      .from("damage_assessments")
      .select("id, claim_id, damage_type, severity, confidence, explanation, estimated_cost, created_at")
      .in("claim_id", claimIds);

    if (!assessError && assessData) {
      damageAssessments = assessData;
    }

    const { data: flagsData, error: flagsError } = await supabaseAdmin
      .from("fraud_flags")
      .select("flag_type, detail, claim_id")
      .in("claim_id", claimIds);

    if (!flagsError && flagsData) {
      fraudFlags = flagsData;
    }
  }

  const BUCKET = process.env["SUPABASE_STORAGE_BUCKET"] ?? "claim-images";

  const formattedClaimsPromises = (claims || []).map(async c => {
    const bAssess = damageAssessments.find(a => a.claim_id === c.id);
    const cFlags = fraudFlags.filter(f => f.claim_id === c.id);
    const computedStatus = cFlags.length > 0 ? "flagged" : (bAssess ? "assessed" : "pending");
    
    let assessments = null;
    if (bAssess) {
      assessments = [{
        id: bAssess.id,
        damage_type: bAssess.damage_type,
        severity: bAssess.severity,
        confidence: bAssess.confidence,
        explanation: bAssess.explanation,
        estimated_cost: bAssess.estimated_cost,
        created_at: bAssess.created_at,
        duplicate_flagged: computedStatus === "flagged"
      }];
    }

    let imageUrl = "";
    if (c.image_path) {
      const { data: urlData } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(c.image_path, 3600);
      if (urlData) {
        imageUrl = urlData.signedUrl;
      }
    }

    return {
      id: c.id,
      image_path: c.image_path,
      imageUrl,
      status: computedStatus,
      created_at: c.created_at,
      updated_at: c.created_at,
      assessments: assessments || [],
      fraud_flags: cFlags.map(f => ({ flag_type: f.flag_type, detail: f.detail }))
    };
  });

  const formattedClaims = await Promise.all(formattedClaimsPromises);

  return NextResponse.json({
    claims: formattedClaims,
    page,
    limit,
    total: count || 0
  });
}

// Reject all other HTTP methods on this route
export async function POST(): Promise<NextResponse> {
  return Errors.badRequest("Method not allowed");
}
