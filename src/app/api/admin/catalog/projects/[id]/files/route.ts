import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import { PROJECT_QUOTA_BYTES, formatBytes } from "@/lib/catalog/storage";

// GET /api/admin/catalog/projects/[id]/files
// Optional query: fileType=REFERENCE_PDF|PRODUCT_IMAGE|EXCEL_DATA
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id: projectId } = await params;

  // Tenant isolation: project must belong to caller's clinic
  const project = await prisma.catalogProject.findFirst({
    where: { id: projectId, clinicId: ctx.clinicId },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const fileType = searchParams.get("fileType") || undefined;

  const where: any = { projectId };
  if (fileType) where.fileType = fileType;

  const files = await prisma.catalogSourceFile.findMany({
    where,
    orderBy: { uploadedAt: "desc" },
  });

  const usedBytes = files.reduce((s, f) => s + f.fileSize, 0);

  return NextResponse.json({
    files,
    count: files.length,
    usedBytes,
    usedFormatted: formatBytes(usedBytes),
    quotaBytes: PROJECT_QUOTA_BYTES,
    quotaFormatted: formatBytes(PROJECT_QUOTA_BYTES),
  });
}
