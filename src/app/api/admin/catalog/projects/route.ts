import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import { ensureProjectDirs, PROJECT_QUOTA_BYTES } from "@/lib/catalog/storage";

// POST /api/admin/catalog/projects — yeni proje oluştur
export async function POST(req: NextRequest) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const {
    name,
    description,
    sourceLanguage,
    targetLanguage,
    templateId,
    userPrompt,
    outputType,
    pageSize,
    dataSchema,
  } = body || {};
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Proje adı gerekli" }, { status: 400 });
  }
  if (name.length > 200) {
    return NextResponse.json({ error: "Proje adı 200 karakterden uzun olamaz" }, { status: 400 });
  }
  if (userPrompt && typeof userPrompt === "string" && userPrompt.length > 5000) {
    return NextResponse.json(
      { error: "İstek metni 5000 karakterden uzun olamaz" },
      { status: 400 }
    );
  }
  const VALID_OUTPUT_TYPES = ["PDF_CATALOG", "SOCIAL_POST", "BROCHURE", "PRICE_LIST", "CUSTOM"];
  const safeOutputType =
    typeof outputType === "string" && VALID_OUTPUT_TYPES.includes(outputType)
      ? outputType
      : "PDF_CATALOG";

  // pageSize doğrulama: { width, height, unit: mm|px } — boş bırakılırsa null
  let safePageSize: { width: number; height: number; unit: string; label?: string } | null = null;
  if (pageSize && typeof pageSize === "object") {
    const w = Number(pageSize.width);
    const h = Number(pageSize.height);
    const unit = pageSize.unit === "px" ? "px" : "mm";
    if (w >= 50 && w <= 5000 && h >= 50 && h <= 5000) {
      safePageSize = { width: w, height: h, unit };
      if (typeof pageSize.label === "string" && pageSize.label.length <= 40) {
        safePageSize.label = pageSize.label;
      }
    }
  }

  try {
    const project = await prisma.catalogProject.create({
      data: {
        clinicId: ctx.clinicId,
        userId: ctx.userId,
        name: name.trim(),
        description: description || null,
        sourceLanguage: sourceLanguage || "tr",
        targetLanguage: targetLanguage || "tr",
        templateId: templateId || null,
        status: "DRAFT",
        userPrompt: typeof userPrompt === "string" && userPrompt.trim() ? userPrompt.trim() : null,
        outputType: safeOutputType,
        pageSize: safePageSize ?? undefined,
        dataSchema: dataSchema && typeof dataSchema === "object" ? dataSchema : undefined,
      },
    });

    // Create storage directories eagerly so first upload doesn't race.
    await ensureProjectDirs(ctx.clinicId, project.id);

    return NextResponse.json(
      {
        project,
        quotaBytes: PROJECT_QUOTA_BYTES,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("catalog project create error:", error);
    return NextResponse.json({ error: "Proje oluşturulamadı" }, { status: 500 });
  }
}

// GET /api/admin/catalog/projects — mevcut projeleri listele
export async function GET(req: NextRequest) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  try {
    const where: any = { clinicId: ctx.clinicId };
    if (status) where.status = status;

    const [projects, total] = await Promise.all([
      prisma.catalogProject.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { sourceFiles: true, products: true, generations: true },
          },
        },
      }),
      prisma.catalogProject.count({ where }),
    ]);

    return NextResponse.json({
      projects,
      total,
      limit,
      offset,
      quotaBytes: PROJECT_QUOTA_BYTES,
    });
  } catch (error) {
    console.error("catalog projects list error:", error);
    return NextResponse.json({ error: "Projeler getirilemedi" }, { status: 500 });
  }
}
