import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import { canvaConfigured } from "@/lib/catalog/canva";

/**
 * GET /api/admin/catalog/canva/status
 *
 * Returns whether the clinic has a linked Canva account, and some
 * safe metadata for the UI to render.
 */
export async function GET(_req: NextRequest) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const configured = canvaConfigured();
  const conn = await prisma.catalogCanvaConnection.findUnique({
    where: { clinicId: ctx.clinicId },
    select: {
      canvaDisplay: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    configured,
    connected: !!conn,
    display: conn?.canvaDisplay ?? null,
    expiresAt: conn?.expiresAt ?? null,
    linkedAt: conn?.createdAt ?? null,
  });
}

/**
 * DELETE /api/admin/catalog/canva/status
 *
 * Disconnects Canva. Does not revoke the token on Canva's side
 * (Canva has no simple revoke endpoint for this flow); it just drops
 * the row locally so the user would have to re-auth next time.
 */
export async function DELETE(_req: NextRequest) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  await prisma.catalogCanvaConnection
    .delete({ where: { clinicId: ctx.clinicId } })
    .catch(() => null);

  return NextResponse.json({ success: true });
}
