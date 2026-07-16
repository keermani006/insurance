import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import { rateLimit } from "@/lib/rateLimit";
import { Errors } from "@/lib/errors";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Auth check
  const auth = await requireAuth(request);
  if (!auth) return Errors.unauthorized();

  const userId = auth.user.id;

  // 2. Rate limit check
  if (!rateLimit.read(userId)) return Errors.tooManyRequests();

  // 3. Query all user claims
  const { data: claims, error: claimsError } = await supabaseAdmin
    .from("claims")
    .select("id")
    .eq("user_id", userId);

  if (claimsError || !claims) {
    return Errors.internal();
  }

  const claimIds = claims.map(c => c.id);
  let damageAssessments: any[] = [];
  let fraudFlags: any[] = [];

  if (claimIds.length > 0) {
    const { data: assessData } = await supabaseAdmin
      .from("damage_assessments")
      .select("claim_id, estimated_cost, confidence")
      .in("claim_id", claimIds);
    if (assessData) {
      damageAssessments = assessData;
    }

    const { data: flagsData } = await supabaseAdmin
      .from("fraud_flags")
      .select("claim_id")
      .in("claim_id", claimIds);
    if (flagsData) {
      fraudFlags = flagsData;
    }
  }

  // 4. Compute statistics
  const total = claims.length;
  let pending = 0;
  let completed = 0;
  let fraudAlerts = 0;
  let totalCost = 0;
  let totalConfidence = 0;
  let assessedCount = 0;

  for (const claim of claims) {
    const assessment = damageAssessments.find(a => a.claim_id === claim.id);
    const cFlags = fraudFlags.filter(f => f.claim_id === claim.id);
    const computedStatus = cFlags.length > 0 ? "flagged" : (assessment ? "assessed" : "pending");

    if (computedStatus === "pending") {
      pending++;
    } else if (computedStatus === "assessed" || computedStatus === "flagged") {
      completed++;
    }

    if (computedStatus === "flagged") {
      fraudAlerts++;
    }

    if (assessment) {
      assessedCount++;
      totalCost += assessment.estimated_cost || 0;
      totalConfidence += Number(assessment.confidence) || 0;
    }
  }

  const averageCost = assessedCount > 0 ? Math.round(totalCost / assessedCount) : 0;
  const averageConfidence = assessedCount > 0 ? Math.round((totalConfidence / assessedCount) * 100) : 0;

  return NextResponse.json({
    total,
    pending,
    completed,
    fraudAlerts,
    averageCost,
    averageConfidence,
  });
}

// Reject all other HTTP methods
export async function POST(): Promise<NextResponse> {
  return Errors.badRequest("Method not allowed");
}
