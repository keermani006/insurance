import { NextRequest, NextResponse } from "next/server";

/**
 * Global middleware — runs before every request.
 *
 * Responsibilities:
 *  1. Block all non-API routes (this is a backend-only project)
 *  2. Apply hardened security headers on all API responses
 *  3. Reject requests with suspicious characteristics early
 */
export function middleware(request: NextRequest): NextResponse {
  const origin = request.headers.get("origin") || "*";

  // ─── Handle CORS OPTIONS Preflight ──────────────────────────────
  if (request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    preflight.headers.set("Access-Control-Allow-Origin", origin);
    preflight.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    preflight.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    preflight.headers.set("Access-Control-Max-Age", "86400");
    return preflight;
  }

  const { pathname } = request.nextUrl;

  // ─── Allow only /api/* routes ─────────────────────────────────
  // Any other path gets a 404. This hardens the attack surface — there
  // are no frontend pages, health endpoints, or admin panels to probe.
  if (!pathname.startsWith("/api/")) {
    return new NextResponse(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // ─── Reject excessively long paths (path traversal mitigation) ──
  if (pathname.length > 512) {
    return new NextResponse(
      JSON.stringify({ error: "Request URI too long" }),
      {
        status: 414,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // ─── Block path traversal patterns ──────────────────────────────
  if (pathname.includes("..") || pathname.includes("//")) {
    return new NextResponse(
      JSON.stringify({ error: "Bad request" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // ─── Pass request through with security headers ──────────────────
  const response = NextResponse.next();

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-XSS-Protection", "0");
  response.headers.set("Content-Security-Policy", "default-src 'none'");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  // Remove any server identification headers
  response.headers.delete("Server");

  return response;
}

export const config = {
  // Run middleware on every route (including API)
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
