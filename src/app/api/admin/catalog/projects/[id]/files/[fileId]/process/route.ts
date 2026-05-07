import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import { CATALOG_STORAGE_ROOT } from "@/lib/catalog/storage";
import {
  removeBackgroundWithFal,
  composeLifestyle,
  LIFESTYLE_PRESETS,
  type LifestylePreset,
} from "@/lib/catalog/image-processing";

// POST /api/admin/catalog/projects/[id]/files/[fileId]/process
//
// Body: { action: "remove-bg" | "lifestyle" | "set-active",
//         preset?: LifestylePreset, variant?: "original"|"processed"|"lifestyle" }
//
// Davranışlar:
//   - "remove-bg":     fal.ai birefnet ile arka planı temizler →
//                      processedPath kaydedilir, activeVariant = "processed"
//   - "lifestyle":     processedPath yoksa önce BG kaldır, sonra preset üzerine
//                      compose et → lifestylePath kaydedilir, activeVariant = "lifestyle"
//   - "set-active":    sadece hangi varyantın render'da kullanılacağını değiştirir
const VALID_PRESETS = LIFESTYLE_PRESETS.map((p) => p.id);
const VALID_VARIANTS = ["original", "processed", "lifestyle"] as const;
type Variant = (typeof VALID_VARIANTS)[number];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id: projectId, fileId } = await params;

  const file = await prisma.catalogSourceFile.findFirst({
    where: { id: fileId, projectId, project: { clinicId: ctx.clinicId } },
  });
  if (!file) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }
  if (file.fileType !== "PRODUCT_IMAGE") {
    return NextResponse.json(
      { error: "Yalnızca ürün görselleri işlenebilir" },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const action = String(body?.action || "");

  // ── set-active: sadece varyant tercihi değiştir
  if (action === "set-active") {
    const variant = String(body?.variant || "");
    if (!VALID_VARIANTS.includes(variant as Variant)) {
      return NextResponse.json({ error: "Geçersiz varyant" }, { status: 400 });
    }
    if (variant === "processed" && !file.processedPath) {
      return NextResponse.json(
        { error: "Bu görselde işlenmiş varyant yok" },
        { status: 400 }
      );
    }
    if (variant === "lifestyle" && !file.lifestylePath) {
      return NextResponse.json(
        { error: "Bu görselde lifestyle varyantı yok" },
        { status: 400 }
      );
    }
    const updated = await prisma.catalogSourceFile.update({
      where: { id: fileId },
      data: { activeVariant: variant },
    });
    return NextResponse.json({ file: updated });
  }

  const inputAbs = path.isAbsolute(file.storagePath)
    ? file.storagePath
    : path.join(CATALOG_STORAGE_ROOT, file.storagePath);

  // ── remove-bg
  if (action === "remove-bg") {
    try {
      const out = await removeBackgroundWithFal(ctx.clinicId, projectId, inputAbs);
      const updated = await prisma.catalogSourceFile.update({
        where: { id: fileId },
        data: { processedPath: out.relPath, activeVariant: "processed" },
      });
      return NextResponse.json({ file: updated, bytes: out.bytes });
    } catch (err: any) {
      console.error("remove-bg error:", err);
      return NextResponse.json(
        { error: err?.message || "Arka plan temizleme başarısız" },
        { status: 500 }
      );
    }
  }

  // ── lifestyle
  if (action === "lifestyle") {
    const preset = body?.preset as LifestylePreset | undefined;
    if (!preset || !VALID_PRESETS.includes(preset)) {
      return NextResponse.json({ error: "Geçersiz lifestyle preset" }, { status: 400 });
    }

    try {
      // BG temizlenmemişse önce temizle
      let processedAbs: string;
      let processedRel: string | null = file.processedPath;
      if (!processedRel) {
        const removed = await removeBackgroundWithFal(ctx.clinicId, projectId, inputAbs);
        processedAbs = removed.absPath;
        processedRel = removed.relPath;
        await prisma.catalogSourceFile.update({
          where: { id: fileId },
          data: { processedPath: processedRel },
        });
      } else {
        processedAbs = path.isAbsolute(processedRel)
          ? processedRel
          : path.join(CATALOG_STORAGE_ROOT, processedRel);
      }

      const out = await composeLifestyle(ctx.clinicId, projectId, processedAbs, preset);
      const updated = await prisma.catalogSourceFile.update({
        where: { id: fileId },
        data: {
          lifestylePath: out.relPath,
          lifestylePreset: preset,
          activeVariant: "lifestyle",
        },
      });
      return NextResponse.json({ file: updated, bytes: out.bytes });
    } catch (err: any) {
      console.error("lifestyle compose error:", err);
      return NextResponse.json(
        { error: err?.message || "Lifestyle uygulama başarısız" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Geçersiz action — beklenen: remove-bg | lifestyle | set-active" },
    { status: 400 }
  );
}
