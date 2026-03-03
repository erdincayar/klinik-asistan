import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clean up every minute
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((value, key) => {
    if (value.resetTime < now) {
      rateLimitMap.delete(key);
    }
  });
}, 60000);

// Brute force protection
const loginAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
}

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const key = `${ip}`;
  const record = rateLimitMap.get(key);

  if (!record || record.resetTime < now) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

function checkBruteForce(ip: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const record = loginAttemptsMap.get(ip);

  if (record && record.lockedUntil > now) {
    const minutesLeft = Math.ceil((record.lockedUntil - now) / 60000);
    return {
      allowed: false,
      message: `Cok fazla deneme. ${minutesLeft} dakika bekleyin.`,
    };
  }

  return { allowed: true };
}

function recordLoginAttempt(ip: string) {
  const now = Date.now();
  const record = loginAttemptsMap.get(ip);

  if (!record || record.lockedUntil < now) {
    loginAttemptsMap.set(ip, { count: 1, lockedUntil: 0 });
    return;
  }

  record.count++;
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // 15 minutes lockout
  }
}

// Security headers
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  return response;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  // Rate limiting for login
  if (pathname.startsWith("/api/auth")) {
    if (!checkRateLimit(ip, 5, 60000)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Cok fazla istek. Lutfen bekleyin." },
          { status: 429 }
        )
      );
    }

    // Brute force check for credentials login
    if (req.method === "POST" && pathname.includes("callback/credentials")) {
      const bruteCheck = checkBruteForce(ip);
      if (!bruteCheck.allowed) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: bruteCheck.message },
            { status: 429 }
          )
        );
      }
      recordLoginAttempt(ip);
    }
  }

  // Rate limiting for API endpoints
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    if (!checkRateLimit(ip + "-api", 100, 60000)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Istek limiti asildi" },
          { status: 429 }
        )
      );
    }
  }

  // General page rate limiting
  if (!pathname.startsWith("/api/") && !pathname.startsWith("/_next/")) {
    if (!checkRateLimit(ip + "-page", 200, 60000)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Sayfa istek limiti asildi" },
          { status: 429 }
        )
      );
    }
  }

  // Origin check for API routes (CSRF protection)
  if (pathname.startsWith("/api/") && req.method !== "GET") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      // Allow same-origin requests only
      // Skip for auth callbacks which may have different origins
      if (!pathname.startsWith("/api/auth")) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: "Izin verilmeyen kaynak" },
            { status: 403 }
          )
        );
      }
    }
  }

  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
