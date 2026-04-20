import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import {
  canvaConfigured,
  exchangeCodeForTokens,
  fetchProfile,
} from "@/lib/catalog/canva";

/**
 * GET /api/admin/catalog/canva/callback?code=...&state=...
 *
 * Canva redirects here after user authorizes. We verify state, exchange
 * code → tokens, persist per-clinic, and bounce back to the catalog UI.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  if (!canvaConfigured()) {
    return NextResponse.json({ error: "Canva yapılandırılmamış" }, { status: 500 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return redirectBack(req, `canva_error=${encodeURIComponent(error)}`);
  }

  const cookieState = req.cookies.get("poby-canva-state")?.value;
  if (!code || !state || !cookieState || cookieState !== state) {
    return redirectBack(req, "canva_error=invalid_state");
  }

  try {
    const tok = await exchangeCodeForTokens(code);
    const expiresAt = new Date(Date.now() + tok.expires_in * 1000);

    const profile = await fetchProfile(tok.access_token);

    await prisma.catalogCanvaConnection.upsert({
      where: { clinicId: ctx.clinicId },
      update: {
        userId: ctx.userId,
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        tokenType: tok.token_type ?? "Bearer",
        scope: tok.scope ?? null,
        expiresAt,
        canvaUserId: profile.id ?? null,
        canvaDisplay: profile.display_name ?? null,
      },
      create: {
        clinicId: ctx.clinicId,
        userId: ctx.userId,
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        tokenType: tok.token_type ?? "Bearer",
        scope: tok.scope ?? null,
        expiresAt,
        canvaUserId: profile.id ?? null,
        canvaDisplay: profile.display_name ?? null,
      },
    });
  } catch (err: any) {
    console.error("canva callback error:", err);
    const msg = String(err?.message || err).slice(0, 200);
    return redirectBack(req, `canva_error=${encodeURIComponent(msg)}`);
  }

  const res = redirectBack(req, "canva=connected");
  res.cookies.delete("poby-canva-state");
  return res;
}

function redirectBack(req: NextRequest, qs: string): NextResponse {
  const base = new URL(req.url);
  base.pathname = "/admin/content-studio/catalog";
  base.search = "?" + qs;
  return NextResponse.redirect(base.toString());
}
