import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import { deleteStoredFile, deleteImageWithThumb } from "@/lib/catalog/storage";

// DELETE /api/admin/catalog/files/[fileId]
// Removes both the DB row and the stored file (with thumbnail if image).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { fileId } = await params;

  // Tenant isolation: file must live under a project owned by the caller's clinic.
  const file = await prisma.catalogSourceFile.findFirst({
    where: {
      id: fileId,
      project: { clinicId: ctx.clinicId },
    },
    include: {
      project: { select: { id: true, status: true } },
    },
  });

  if (!file) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  if (file.project.status === "GENERATING") {
    return NextResponse.json(
      { error: "Üretim devam ederken dosya silinemez" },
      { status: 409 }
    );
  }

  try {
    await prisma.catalogSourceFile.delete({ where: { id: fileId } });

    // Best-effort filesystem cleanup. If this fails we still report success
    // because the DB row is gone — orphaned file can be swept later.
    try {
      if (file.fileType === "PRODUCT_IMAGE") {
        await deleteImageWithThumb(file.storagePath);
      } else {
        await deleteStoredFile(file.storagePath);
      }
    } catch (fsErr) {
      console.error("catalog file fs cleanup error:", fsErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("catalog file delete error:", error);
    return NextResponse.json({ error: "Silme işlemi başarısız" }, { status: 500 });
  }
}
