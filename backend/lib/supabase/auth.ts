import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createUserClient } from "./client";

export interface AuthResult {
  user: User;
}

/**
 * Extracts and verifies the Bearer JWT from the Authorization header.
 *
 * @throws Never — returns null on any failure so callers decide the response.
 *
 * Usage:
 *   const auth = await requireAuth(request);
 *   if (!auth) return Errors.unauthorized();
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice(7).trim();
    if (!token || token.length < 10) {
      return null;
    }

    const client = createUserClient(token);
    const { data, error } = await client.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return { user: data.user };
  } catch {
    // Any unexpected error → treat as unauthenticated, never leak details
    return null;
  }
}
