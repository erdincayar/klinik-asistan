import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import { CATALOG_STORAGE_ROOT } from "@/lib/catalog/storage";

// GET /api/admin/catalog/projects/[id]/data-preview
// Projedeki EXCEL_DATA dosyalarının kolonlarını ve ilk N satırını döndürür.
// Kullanıcı wizard'daki "Veri Eşleme" adımında hangi kolon ne anlama geliyor
// seçecek; o yüzden sadece sütun başlıkları + birkaç örnek satır yeter.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  const project = await prisma.catalogProject.findFirst({
    where: { id, clinicId: ctx.clinicId },
    select: {
      id: true,
      sourceFiles: {
        where: { fileType: "EXCEL_DATA" },
        orderBy: { uploadedAt: "asc" },
      },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const files: {
    fileId: string;
    fileName: string;
    columns: string[];
    rows: Record<string, any>[];
    totalRows: number;
  }[] = [];

  for (const f of project.sourceFiles) {
    try {
      const abs = path.isAbsolute(f.storagePath)
        ? f.storagePath
        : path.join(CATALOG_STORAGE_ROOT, f.storagePath);
      const buf = await readFile(abs);
      const wb = XLSX.read(buf, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) continue;

      const all: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, {
        defval: null,
      });
      if (all.length === 0) {
        files.push({
          fileId: f.id,
          fileName: f.originalName,
          columns: [],
          rows: [],
          totalRows: 0,
        });
        continue;
      }

      // Tüm satırlardan birleşik kolon kümesini topla — bazı satırlarda
      // boş hücreler olabilir, ilk satırı tek başına referans almak yanıltır.
      const colSet = new Set<string>();
      for (const row of all.slice(0, 50)) {
        for (const k of Object.keys(row)) colSet.add(k);
      }
      const columns = Array.from(colSet);

      files.push({
        fileId: f.id,
        fileName: f.originalName,
        columns,
        rows: all.slice(0, 5),
        totalRows: all.length,
      });
    } catch (err) {
      console.error(
        `[catalog data-preview] failed to parse ${f.originalName}:`,
        err
      );
      files.push({
        fileId: f.id,
        fileName: f.originalName,
        columns: [],
        rows: [],
        totalRows: 0,
      });
    }
  }

  return NextResponse.json({ files });
}
