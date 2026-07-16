/**
 * In-memory sliding window rate limiter.
 *
 * Keyed by `userId` — not by IP, which is trivially spoofable.
 * Each entry stores the list of request timestamps within the current window.
 *
 * For multi-instance deployments, replace with a Redis-backed solution.
 */

interface WindowEntry {
  timestamps: number[];
}

// route key → userId → window entry
const store = new Map<string, Map<string, WindowEntry>>();

const WINDOW_MS = 60_000; // 1 minute sliding window

/**
 * Checks whether `userId` has exceeded `maxRequests` for `routeKey` in the last minute.
 *
 * @returns true if the request is allowed, false if rate-limited.
 */
export function checkRateLimit(
  routeKey: string,
  userId: string,
  maxRequests: number
): boolean {
  const now = Date.now();

  if (!store.has(routeKey)) {
    store.set(routeKey, new Map());
  }

  const routeStore = store.get(routeKey)!;

  if (!routeStore.has(userId)) {
    routeStore.set(userId, { timestamps: [] });
  }

  const entry = routeStore.get(userId)!;

  // Purge timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= maxRequests) {
    return false; // rate limited
  }

  entry.timestamps.push(now);
  return true; // allowed
}

// ─── Pre-configured rate limiters ───────────────────────────────

const UPLOAD_RPM = Number(process.env["RATE_LIMIT_UPLOAD_RPM"] ?? 10);
const ASSESS_RPM = Number(process.env["RATE_LIMIT_ASSESS_RPM"] ?? 5);

export const rateLimit = {
  upload: (userId: string) => checkRateLimit("upload", userId, UPLOAD_RPM),
  assess: (userId: string) => checkRateLimit("assess", userId, ASSESS_RPM),
  /** Generic limiter for GET endpoints — 60 req/min */
  read: (userId: string) => checkRateLimit("read", userId, 60),
} as const;
