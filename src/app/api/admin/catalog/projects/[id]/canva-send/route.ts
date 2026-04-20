import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import { CATALOG_STORAGE_ROOT } from "@/lib/catalog/storage";
import {
  getValidAccessToken,
  uploadPdfAsset,
  createImportDesign,
} from "@/lib/catalog/canva";

export const runtime = "nodejs";
export const maxDuration = 300; // up to 5 minutes for upload + import jobs

/**
 * POST /api/admin/catalog/projects/[id]/canva-send
 *
 * Body (optional):
 *   { generationId?: string }  // specific generation; default: latest COMPLETED
 *
 * Steps:
 *   1. Resolve the project's latest COMPLETED generation → pdfPath
 *   2. Fetch a valid Canva access token (refresh if needed)
 *   3. Upload the PDF as an asset (sync job, polled)
 *   4. Create an import_job design from that asset (polled)
 *   5. Persist designId + editUrl on the CatalogGeneration row
 *   6. Return { editUrl }
 *
 * The caller opens editUrl in a new tab.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id: projectId } = await params;

  // Project must belong to the caller's clinic
  const project = await prisma.catalogProject.findFirst({
    where: { id: projectId, clinicId: ctx.clinicId },
    select: { id: true, name: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({} as any));
  const generationId: string | undefined = body?.generationId;

  const generation = generationId
    ? await prisma.catalogGeneration.findFirst({
        where: { id: generationId, projectId },
      })
    : await prisma.catalogGeneration.findFirst({
        where: { projectId, status: "COMPLETED", pdfPath: { not: null } },
        orderBy: { generatedAt: "desc" },
      });

  if (!generation || !generation.pdfPath) {
    return NextResponse.json(
      { error: "Önce bir katalog üretilmeli" },
      { status: 400 }
    );
  }

  // Check Canva connection
  let token: string;
  try {
    token = await getValidAccessToken(ctx.clinicId);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Canva bağlantısı yok. Önce bağlanın.",
        needsAuth: true,
      },
      { status: 428 } // Precondition Required
    );
  }

  // Read PDF bytes
  const root = path.resolve(CATALOG_STORAGE_ROOT);
  const abs = path.resolve(root, generation.pdfPath);
  if (!abs.startsWith(root + path.sep)) {
    return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
  }

  let buf: Buffer;
  try {
    buf = await readFile(abs);
  } catch {
    return NextResponse.json(
      { error: "PDF diskten okunamadı" },
      { status: 410 }
    );
  }

  const safeTitle = (project.name || "Katalog")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 100);
  const fileName = safeTitle.replace(/[^\w.\- ]+/g, "_") + ".pdf";

  try {
    const { assetId } = await uploadPdfAsset(token, buf, fileName);
    const { designId, editUrl, viewUrl } = await createImportDesign(
      token,
      assetId,
      safeTitle
    );

    await prisma.catalogGeneration.update({
      where: { id: generation.id },
      data: {
        canvaDesignId: designId,
        canvaEditUrl: editUrl,
        canvaSentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      editUrl,
      viewUrl,
      designId,
      generationId: generation.id,
    });
  } catch (err: any) {
    console.error("canva-send error:", err);
    return NextResponse.json(
      { error: err?.message || "Canva'ya gönderim başarısız" },
      { status: 502 }
    );
  }
}
