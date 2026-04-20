import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";

/**
 * GET /api/admin/catalog/projects/[id]/products
 * Returns all products for the given project (tenant-scoped).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  const project = await prisma.catalogProject.findFirst({
    where: { id, clinicId: ctx.clinicId },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const products = await prisma.catalogProduct.findMany({
    where: { projectId: id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ products, count: products.length });
}
