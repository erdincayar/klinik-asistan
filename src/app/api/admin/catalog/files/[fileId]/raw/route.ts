import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import { CATALOG_STORAGE_ROOT } from "@/lib/catalog/storage";

export const runtime = "nodejs";

/**
 * GET /api/admin/catalog/files/[fileId]/raw
 *
 * Streams the file bytes behind a CatalogSourceFile row, subject to
 * tenant-scoped access. Used by the admin UI to show product images
 * and thumbnails without exposing the storage path directly.
 *
 * Query:
 *   thumb=1     — serve the small thumbnail (images only, original)
 *   variant=processed | lifestyle | original
 *               — serve the BG-removed PNG or lifestyle-composed JPG
 *   variant=auto&p=<relPath>
 *               — explicit relative path (must be within tenant's CATALOG_STORAGE_ROOT)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { fileId } = await params;

  const file = await prisma.catalogSourceFile.findFirst({
    where: { id: fileId, project: { clinicId: ctx.clinicId } },
  });
  if (!file) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  const variant = req.nextUrl.searchParams.get("variant");
  const explicitP = req.nextUrl.searchParams.get("p");
  let storagePath = file.storagePath;
  let mimeOverride: string | null = null;

  if (variant === "processed" && file.processedPath) {
    storagePath = file.processedPath;
    mimeOverride = "image/png";
  } else if (variant === "lifestyle" && file.lifestylePath) {
    storagePath = file.lifestylePath;
    mimeOverride = "image/jpeg";
  } else if (variant === "auto" && explicitP) {
    // Doğrula: bu dosyaya ait bilinen path'lerden biri olmalı (yetkilendirme).
    const allowed = new Set<string>(
      [file.storagePath, file.processedPath, file.lifestylePath].filter(
        Boolean
      ) as string[]
    );
    if (!allowed.has(explicitP)) {
      return NextResponse.json({ error: "Yetkisiz path" }, { status: 403 });
    }
    storagePath = explicitP;
    if (storagePath.endsWith(".png")) mimeOverride = "image/png";
    else if (storagePath.endsWith(".jpg") || storagePath.endsWith(".jpeg"))
      mimeOverride = "image/jpeg";
  }

  const wantsThumb =
    req.nextUrl.searchParams.get("thumb") &&
    file.fileType === "PRODUCT_IMAGE" &&
    !variant;

  if (wantsThumb) {
    // photos/<name>.webp → photos/thumbs/thumb_<name>.webp
    const dir = path.posix.dirname(storagePath);
    const name = path.posix.basename(storagePath);
    storagePath = path.posix.join(dir, "thumbs", `thumb_${name}`);
  }

  const root = path.resolve(CATALOG_STORAGE_ROOT);
  const abs = path.resolve(root, storagePath);
  if (!abs.startsWith(root + path.sep)) {
    return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
  }

  let size: number;
  try {
    const st = await stat(abs);
    if (!st.isFile()) throw new Error("not a file");
    size = st.size;
  } catch {
    return NextResponse.json({ error: "Dosya diskte yok" }, { status: 410 });
  }

  const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream<Uint8Array>;
  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": mimeOverride || file.mimeType || "application/octet-stream",
      "Content-Length": String(size),
      "Cache-Control": "private, max-age=600",
    },
  });
}
