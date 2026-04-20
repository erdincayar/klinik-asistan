import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/catalog/auth";
import { buildAuthUrl, canvaConfigured } from "@/lib/catalog/canva";

/**
 * GET /api/admin/catalog/canva/auth
 *
 * Starts the Canva OAuth flow. Generates a random `state`, stores it
 * in a short-lived httpOnly cookie, and redirects to Canva's authorize
 * endpoint. Callback will verify state before exchanging the code.
 */
export async function GET(_req: NextRequest) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  if (!canvaConfigured()) {
    return NextResponse.json(
      { error: "Canva yapılandırılmamış — CANVA_CLIENT_ID/SECRET/REDIRECT_URI gerekli" },
      { status: 500 }
    );
  }

  const state = randomBytes(16).toString("hex");
  const url = buildAuthUrl(state);

  const res = NextResponse.redirect(url);
  // 10 minutes — enough for the user to authenticate on Canva
  res.cookies.set({
    name: "poby-canva-state",
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return res;
}
