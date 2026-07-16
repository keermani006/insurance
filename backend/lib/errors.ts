import { NextResponse } from "next/server";

/** Standard error shapes returned to clients. Never leaks internals. */
export type ApiError = { error: string };

/**
 * Returns a NextResponse with a clean { error } JSON body.
 * Stack traces, Supabase messages, and Gemini output are never forwarded.
 */
export function safeError(message: string, status: number): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status });
}

// ─── Common error factories ──────────────────────────────────────

export const Errors = {
  unauthorized: () => safeError("Unauthorized", 401),
  forbidden: () => safeError("Access denied", 403),
  notFound: () => safeError("Resource not found", 404),
  badRequest: (msg: string) => safeError(msg, 400),
  conflict: (msg: string) => safeError(msg, 409),
  tooLarge: () => safeError("File too large. Maximum size is 10 MB", 413),
  tooManyRequests: () => safeError("Too many requests. Please try again later", 429),
  internal: () => safeError("An internal error occurred", 500),
  unsupportedMedia: (msg: string) => safeError(msg, 415),
} as const;
