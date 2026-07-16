/**
 * Structured logger for audit and security events.
 *
 * Rules:
 *  - NEVER log passwords, tokens, API keys, or raw file content.
 *  - Log all security-relevant events with user context.
 *  - In production, replace console with a structured sink (e.g., Axiom, Logtail).
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  action: string;
  userId?: string;
  resourceId?: string;
  detail?: Record<string, unknown>;
  timestamp: string;
}

function emit(entry: LogEntry): void {
  // In production wire this to a structured logging service.
  // Console is acceptable for hackathon scope.
  const line = JSON.stringify(entry);
  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function log(
  level: LogLevel,
  action: string,
  opts: { userId?: string; resourceId?: string; detail?: Record<string, unknown> } = {}
): void {
  emit({
    level,
    action,
    userId: opts.userId,
    resourceId: opts.resourceId,
    detail: opts.detail,
    timestamp: new Date().toISOString(),
  });
}

export const logger = {
  /** User successfully authenticated */
  login: (userId: string, ip?: string) =>
    log("info", "auth.login", { userId, detail: { ip } }),

  /** Image upload completed */
  upload: (userId: string, claimId: string, fileSize: number) =>
    log("info", "claim.upload", { userId, resourceId: claimId, detail: { fileSize } }),

  /** Assessment completed */
  assessment: (userId: string, claimId: string, duplicateFlagged: boolean) =>
    log("info", "claim.assessment", {
      userId,
      resourceId: claimId,
      detail: { duplicateFlagged },
    }),

  /** Fraud event detected */
  fraud: (userId: string, claimId: string, flagType: string, detail?: string) =>
    log("warn", "claim.fraud", {
      userId,
      resourceId: claimId,
      detail: { flagType, detail },
    }),

  /** Generic error — do NOT include raw errors, tokens, or stack traces */
  error: (action: string, userId?: string, detail?: Record<string, unknown>) =>
    log("error", action, { userId, detail }),

  /** Rate limit triggered */
  rateLimit: (userId: string, route: string) =>
    log("warn", "rate_limit.triggered", { userId, detail: { route } }),

  /** Authorization failure (IDOR attempt, cross-user access, etc.) */
  authzFailure: (userId: string, resourceId: string, route: string) =>
    log("warn", "authz.failure", { userId, resourceId, detail: { route } }),
};
