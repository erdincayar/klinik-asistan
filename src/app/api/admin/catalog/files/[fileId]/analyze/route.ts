import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import * as XLSX from "xlsx";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import { CATALOG_STORAGE_ROOT } from "@/lib/catalog/storage";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const SYSTEM = `Sen bir ürün kataloğu asistanısın. Kullanıcının yüklediği kaynak dosyayı
kısaca analiz et ve aşağıdaki JSON şemasında dönüş yap (başka metin yazma):
{
  "summary": "1-2 cümlelik genel özet (Türkçe)",
  "detectedColumns": [ "kolon adı" ]  // sadece Excel/CSV için, yoksa []
  "rowCount": sayı | null,
  "issues": [ "kısa sorun başlıkları" ],
  "suggestions": [ "bu dosyayla extract aşamasında şunu yap önerileri" ],
  "usableForExtraction": true | false
}`;

/**
 * POST /api/admin/catalog/files/[fileId]/analyze
 *
 * Body is ignored. Reads the stored file, asks Claude for a short
 * structured summary + column detection (Excel/CSV) or text heuristic
 * (PDF/image), and writes it to CatalogSourceFile.aiNote.
 *
 * Supported file types:
 *   EXCEL_DATA   → xlsx parse, ilk 200 satır Claude'a JSON gönderilir
 *   REFERENCE_PDF → filename + metadata (Claude sadece isimden yorum çıkartır;
 *                   gerçek PDF içeriği analyze pipeline'da parse ediliyor)
 *   PRODUCT_IMAGE → filename + metadata; görsel analizi yapılmaz
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { fileId } = await params;

  const file = await prisma.catalogSourceFile.findFirst({
    where: { id: fileId, project: { clinicId: ctx.clinicId } },
  });
  if (!file) return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY ayarlanmamış" },
      { status: 500 }
    );
  }

  // Read file bytes (CATALOG_STORAGE_ROOT-relative → absolute)
  const abs = path.resolve(CATALOG_STORAGE_ROOT, file.storagePath);
  const safeRoot = path.resolve(CATALOG_STORAGE_ROOT);
  if (!abs.startsWith(safeRoot + path.sep)) {
    return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
  }

  let userContent: string;

  try {
    if (file.fileType === "EXCEL_DATA") {
      const buf = await readFile(abs);
      const wb = XLSX.read(buf, { type: "buffer" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false }) as any[][];
      const header = (rows[0] ?? []).map((v) => (v == null ? "" : String(v)));
      const sampleRows = rows.slice(1, 21); // first 20 data rows
      const totalRows = Math.max(0, rows.length - 1);

      userContent = [
        `Dosya adı: ${file.originalName}`,
        `Tür: Excel/CSV`,
        `Sayfa adı: ${sheetName}`,
        `Toplam veri satırı: ${totalRows}`,
        `Başlık satırı: ${JSON.stringify(header)}`,
        `İlk 20 örnek satır (JSON): ${JSON.stringify(sampleRows)}`,
        file.userNote ? `Kullanıcı notu: ${file.userNote}` : `Kullanıcı notu: (yok)`,
      ].join("\n");
    } else {
      // PDF / image — dosya içeriğini Claude'a yollayamıyoruz burada
      // (FastAPI pipeline'ı onu yapıyor). Bunun yerine metadata + kullanıcı notu.
      const sizeMB = (file.fileSize / 1024 / 1024).toFixed(2);
      userContent = [
        `Dosya adı: ${file.originalName}`,
        `Tür: ${file.fileType}`,
        `MIME: ${file.mimeType}`,
        `Boyut: ${sizeMB} MB`,
        file.userNote ? `Kullanıcı notu: ${file.userNote}` : `Kullanıcı notu: (yok)`,
        "",
        "Not: Bu dosyanın içeriği burada okunmadı. Dosya adı, tür, boyut ve kullanıcı notuna göre,",
        "extraction aşamasında nasıl kullanılması gerektiğine dair kısa bir rehber ver.",
      ].join("\n");
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: `Dosya okunamadı: ${err?.message || err}` },
      { status: 500 }
    );
  }

  const client = new Anthropic({ apiKey });

  let aiNote: any;
  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: SYSTEM,
      messages: [{ role: "user", content: userContent }],
    });
    const text = resp.content
      .map((b: any) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    // Extract outer JSON
    const m = text.match(/\{[\s\S]*\}/);
    aiNote = m ? JSON.parse(m[0]) : { summary: text.slice(0, 500) };
  } catch (err: any) {
    console.error("catalog file analyze claude error:", err);
    return NextResponse.json(
      { error: `Claude hatası: ${err?.message || err}` },
      { status: 502 }
    );
  }

  const updated = await prisma.catalogSourceFile.update({
    where: { id: fileId },
    data: {
      aiNote: aiNote as any,
      aiAnalyzedAt: new Date(),
    },
    select: {
      id: true,
      userNote: true,
      aiNote: true,
      aiAnalyzedAt: true,
    },
  });

  return NextResponse.json({ file: updated });
}
