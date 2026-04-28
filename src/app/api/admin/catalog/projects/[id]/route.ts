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

// PATCH /api/admin/catalog/projects/[id] — proje ayarlarını güncelle
// Şu an: name, description, userPrompt, outputType, dataSchema, sourceLanguage,
// targetLanguage. Status / file / product alanları başka endpoint'lerden yönetilir.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  const existing = await prisma.catalogProject.findFirst({
    where: { id, clinicId: ctx.clinicId },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }
  if (existing.status === "ANALYZING" || existing.status === "GENERATING") {
    return NextResponse.json(
      { error: "İşlem devam ederken proje düzenlenemez" },
      { status: 409 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const VALID_OUTPUT_TYPES = ["PDF_CATALOG", "SOCIAL_POST", "BROCHURE", "PRICE_LIST", "CUSTOM"];
  const data: Record<string, any> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    if (body.name.length > 200) {
      return NextResponse.json({ error: "Proje adı 200 karakterden uzun olamaz" }, { status: 400 });
    }
    data.name = body.name.trim();
  }
  if (typeof body.description === "string" || body.description === null) {
    data.description = body.description || null;
  }
  if (typeof body.userPrompt === "string" || body.userPrompt === null) {
    if (typeof body.userPrompt === "string" && body.userPrompt.length > 5000) {
      return NextResponse.json(
        { error: "İstek metni 5000 karakterden uzun olamaz" },
        { status: 400 }
      );
    }
    data.userPrompt = body.userPrompt && body.userPrompt.trim() ? body.userPrompt.trim() : null;
  }
  if (typeof body.outputType === "string" && VALID_OUTPUT_TYPES.includes(body.outputType)) {
    data.outputType = body.outputType;
  }
  if (body.dataSchema === null) {
    data.dataSchema = null;
  } else if (body.dataSchema && typeof body.dataSchema === "object") {
    data.dataSchema = body.dataSchema;
  }
  if (typeof body.sourceLanguage === "string") data.sourceLanguage = body.sourceLanguage;
  if (typeof body.targetLanguage === "string") data.targetLanguage = body.targetLanguage;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  try {
    const project = await prisma.catalogProject.update({ where: { id }, data });
    return NextResponse.json({ project });
  } catch (error) {
    console.error("catalog project patch error:", error);
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
  }
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
