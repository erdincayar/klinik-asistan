import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import {
  FileType,
  FILE_LIMITS,
  PROJECT_QUOTA_BYTES,
  ensureProjectDirs,
  storeProductImage,
  storeGenericFile,
  validateFile,
  formatBytes,
  deleteStoredFile,
  deleteImageWithThumb,
} from "@/lib/catalog/storage";

export const runtime = "nodejs";
// Allow reasonable upload sizes; Next trims the request at this boundary.
export const maxDuration = 60;

// POST /api/admin/catalog/projects/[id]/upload
// Multipart form-data:
//   fileType: REFERENCE_PDF | PRODUCT_IMAGE | EXCEL_DATA
//   files:    one or more File entries (multiple allowed)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id: projectId } = await params;

  // Tenant-scoped project lookup
  const project = await prisma.catalogProject.findFirst({
    where: { id: projectId, clinicId: ctx.clinicId },
    select: { id: true, status: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }
  if (project.status === "GENERATING") {
    return NextResponse.json(
      { error: "Üretim devam ederken dosya yüklenemez" },
      { status: 409 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Geçersiz multipart verisi" }, { status: 400 });
  }

  const fileTypeRaw = String(form.get("fileType") || "").toUpperCase();
  if (!(fileTypeRaw in FILE_LIMITS)) {
    return NextResponse.json(
      { error: "fileType REFERENCE_PDF, PRODUCT_IMAGE veya EXCEL_DATA olmalı" },
      { status: 400 }
    );
  }
  const fileType = fileTypeRaw as FileType;

  const uploads = form.getAll("files").filter((v): v is File => v instanceof File);
  if (uploads.length === 0) {
    return NextResponse.json({ error: "En az bir dosya gerekli" }, { status: 400 });
  }

  // Per-call cap to prevent pathological single-request floods.
  if (uploads.length > 50) {
    return NextResponse.json(
      { error: "Tek seferde en fazla 50 dosya yüklenebilir" },
      { status: 400 }
    );
  }

  // Current used bytes for quota
  const used = await prisma.catalogSourceFile.aggregate({
    where: { projectId },
    _sum: { fileSize: true },
  });
  let usedBytes = used._sum.fileSize ?? 0;

  await ensureProjectDirs(ctx.clinicId, projectId);

  const created: Array<{ id: string; originalName: string; storagePath: string; fileSize: number }> = [];
  const failed: Array<{ name: string; error: string }> = [];
  const writtenPaths: Array<{ relPath: string; isImage: boolean }> = [];

  try {
    for (const f of uploads) {
      // Preflight validation (size + mime)
      const check = validateFile(fileType, f.type || "application/octet-stream", f.size);
      if (!check.ok) {
        failed.push({ name: f.name, error: check.error });
        continue;
      }

      // Quota check (projection)
      if (usedBytes + f.size > PROJECT_QUOTA_BYTES) {
        failed.push({
          name: f.name,
          error: `Kota aşıldı (kullanılan: ${formatBytes(usedBytes)}, limit: ${formatBytes(PROJECT_QUOTA_BYTES)})`,
        });
        continue;
      }

      const buf = Buffer.from(await f.arrayBuffer());

      try {
        let relPath: string;
        let bytes: number;
        let isImage = false;

        if (fileType === "PRODUCT_IMAGE") {
          const stored = await storeProductImage(ctx.clinicId, projectId, f.name, buf);
          relPath = stored.relPath;
          bytes = stored.bytes;
          isImage = true;
        } else {
          const stored = await storeGenericFile(
            ctx.clinicId,
            projectId,
            fileType,
            f.name,
            buf
          );
          relPath = stored.relPath;
          bytes = stored.bytes;
        }

        writtenPaths.push({ relPath, isImage });

        const rec = await prisma.catalogSourceFile.create({
          data: {
            projectId,
            fileType,
            originalName: f.name,
            storagePath: relPath,
            fileSize: bytes,
            mimeType: f.type || "application/octet-stream",
          },
          select: {
            id: true,
            originalName: true,
            storagePath: true,
            fileSize: true,
          },
        });

        usedBytes += bytes;
        created.push(rec);
      } catch (err: any) {
        console.error("catalog upload item error:", err);
        failed.push({ name: f.name, error: err?.message || "Kayıt hatası" });
      }
    }

    // If DB writes never happened but files hit disk, clean up.
    if (created.length === 0 && writtenPaths.length > 0) {
      for (const p of writtenPaths) {
        if (p.isImage) await deleteImageWithThumb(p.relPath);
        else await deleteStoredFile(p.relPath);
      }
    }

    // Touch updatedAt
    if (created.length > 0) {
      await prisma.catalogProject.update({
        where: { id: projectId },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json(
      {
        uploaded: created,
        failed,
        usedBytes,
        usedFormatted: formatBytes(usedBytes),
        quotaBytes: PROJECT_QUOTA_BYTES,
      },
      { status: created.length > 0 ? 201 : 400 }
    );
  } catch (error) {
    console.error("catalog upload fatal:", error);
    // Best-effort rollback
    for (const p of writtenPaths) {
      try {
        if (p.isImage) await deleteImageWithThumb(p.relPath);
        else await deleteStoredFile(p.relPath);
      } catch {}
    }
    return NextResponse.json({ error: "Yükleme hatası" }, { status: 500 });
  }
}
