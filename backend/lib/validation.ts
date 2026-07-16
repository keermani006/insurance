import { z } from "zod";

// ─── Primitives ──────────────────────────────────────────────────

/** Validates a UUID v4 string — used for all route params like :id */
export const uuidSchema = z
  .string()
  .uuid("Invalid resource identifier");

// ─── Route params ────────────────────────────────────────────────

export const claimIdParamSchema = z.object({
  id: uuidSchema,
});

// ─── Query params ────────────────────────────────────────────────

export const claimsListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1).max(1000)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
});

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Parses and validates a UUID from a route segment.
 * Returns the validated UUID string or null on invalid input.
 * Defends against path traversal, malformed UUIDs, etc.
 */
export function parseClaimId(raw: string): string | null {
  const result = uuidSchema.safeParse(raw);
  return result.success ? result.data : null;
}
