import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import { CATALOG_STORAGE_ROOT } from "@/lib/catalog/storage";

export const runtime = "nodejs";
// A single catalog PDF could be multi-MB; give the response time to stream.
export const maxDuration = 120;

/**
 * GET /api/admin/catalog/projects/[id]/download
 * Streams the latest successfully-generated PDF for the project.
 *
 * Query:
 *   generationId?: string   — stream a specific generation instead of latest
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  const project = await prisma.catalogProject.findFirst({
    where: { id, clinicId: ctx.clinicId },
    select: { id: true, name: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const generationId = searchParams.get("generationId");

  const generation = generationId
    ? await prisma.catalogGeneration.findFirst({
        where: { id: generationId, projectId: id },
      })
    : await prisma.catalogGeneration.findFirst({
        where: { projectId: id, status: "COMPLETED", pdfPath: { not: null } },
        orderBy: { generatedAt: "desc" },
      });

  if (!generation || !generation.pdfPath) {
    return NextResponse.json(
      { error: "Henüz üretilmiş bir PDF yok" },
      { status: 404 }
    );
  }

  const abs = path.resolve(CATALOG_STORAGE_ROOT, generation.pdfPath);
  // Defence: make sure we only serve files under CATALOG_STORAGE_ROOT
  if (!abs.startsWith(path.resolve(CATALOG_STORAGE_ROOT) + path.sep)) {
    return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
  }

  let size: number;
  try {
    const st = await stat(abs);
    size = st.size;
    if (!st.isFile()) throw new Error("not a file");
  } catch {
    return NextResponse.json(
      { error: "PDF dosyası diskte bulunamadı" },
      { status: 410 }
    );
  }

  const safeName =
    (project.name || "katalog")
      .replace(/[\/\\]/g, "_")
      .replace(/[^\w.\-]+/g, "_")
      .slice(0, 80) + ".pdf";

  const nodeStream = createReadStream(abs);
  // Convert Node Readable → Web ReadableStream for Response
  const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
