import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { rm } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import {
  projectRoot,
  PROJECT_QUOTA_BYTES,
  formatBytes,
} from "@/lib/catalog/storage";

// GET /api/admin/catalog/projects/[id] — detay
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  const project = await prisma.catalogProject.findFirst({
    where: { id, clinicId: ctx.clinicId },
    include: {
      template: true,
      sourceFiles: { orderBy: { uploadedAt: "desc" } },
      _count: {
        select: { sourceFiles: true, products: true, generations: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const usedBytes = project.sourceFiles.reduce((s, f) => s + f.fileSize, 0);

  return NextResponse.json({
    project,
    usedBytes,
    usedFormatted: formatBytes(usedBytes),
    quotaBytes: PROJECT_QUOTA_BYTES,
    quotaFormatted: formatBytes(PROJECT_QUOTA_BYTES),
    usagePercent: Math.round((usedBytes / PROJECT_QUOTA_BYTES) * 100),
  });
}

// DELETE /api/admin/catalog/projects/[id] — sil (cascade + dosya sistemi)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  // Tenant kontrolü: başka tenant'ın projesine erişilemez.
  const project = await prisma.catalogProject.findFirst({
    where: { id, clinicId: ctx.clinicId },
    select: { id: true, status: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }
  if (project.status === "GENERATING") {
    return NextResponse.json(
      { error: "Üretim devam ederken silinemez" },
      { status: 409 }
    );
  }

  try {
    // Önce DB — cascade sourceFiles / products / generations siler.
    await prisma.catalogProject.delete({ where: { id } });

    // Sonra dosya sistemi. Best-effort: DB silindiyse dosyalar artık sahipsiz.
    try {
      const root = projectRoot(ctx.clinicId, id);
      // sanity: sadece CATALOG_STORAGE_ROOT altındaki bir yolu sileriz
      if (path.resolve(root).includes(path.sep + "catalog" + path.sep)) {
        await rm(root, { recursive: true, force: true });
      }
    } catch (fsErr) {
      console.error("catalog project fs cleanup error:", fsErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("catalog project delete error:", error);
    return NextResponse.json({ error: "Silme işlemi başarısız" }, { status: 500 });
  }
}
