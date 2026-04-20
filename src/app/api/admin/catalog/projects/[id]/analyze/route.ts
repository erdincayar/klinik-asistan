import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import { catalogJobQueue } from "@/lib/catalog/jobQueue";
import { runAnalyze } from "@/lib/catalog/pipeline";

/**
 * POST /api/admin/catalog/projects/[id]/analyze
 *
 * Kicks off the analyze pipeline in the background:
 *   parse-pdf → extract-products → match-images → (optional) translate
 *
 * Returns immediately with { status: "ANALYZING" }. Poll
 * GET /api/admin/catalog/projects/[id] to observe the transition to
 * READY_TO_GENERATE (or FAILED).
 *
 * Body (optional):
 *   sector?: string                  — hint for Claude ("NATURAL_STONE" vb.)
 *   brand?: string                   — marka adı
 *   sourceLanguage?: string          — default "tr"
 *   targetLanguage?: string          — default project.targetLanguage
 *   phashThreshold?: number          — default 10
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  const project = await prisma.catalogProject.findFirst({
    where: { id, clinicId: ctx.clinicId },
    select: { id: true, status: true, targetLanguage: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }
  if (project.status === "ANALYZING" || project.status === "GENERATING") {
    return NextResponse.json(
      { error: `Proje şu an ${project.status} durumunda` },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const {
    sector,
    brand,
    sourceLanguage,
    targetLanguage,
    phashThreshold,
  } = body as Record<string, any>;

  catalogJobQueue.enqueue(async () => {
    await runAnalyze({
      projectId: id,
      sector: typeof sector === "string" ? sector : undefined,
      brand: typeof brand === "string" ? brand : undefined,
      sourceLanguage: typeof sourceLanguage === "string" ? sourceLanguage : undefined,
      targetLanguage:
        typeof targetLanguage === "string" ? targetLanguage : project.targetLanguage,
      phashThreshold:
        typeof phashThreshold === "number" ? phashThreshold : undefined,
    });
  });

  // Respond right away; the client polls status
  return NextResponse.json({
    queued: true,
    projectId: id,
    status: "ANALYZING",
  });
}
