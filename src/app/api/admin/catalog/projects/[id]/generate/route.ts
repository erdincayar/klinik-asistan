import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";
import { catalogJobQueue } from "@/lib/catalog/jobQueue";
import { runGenerate } from "@/lib/catalog/pipeline";

/**
 * POST /api/admin/catalog/projects/[id]/generate
 *
 * Body:
 *   templateSlug?: string                     (defaults to project.template or natural-stone-modern)
 *   brandKit?: {primary, secondary, accent, logoPath, fontFamily}
 *   metadata?: {title, subtitle, companyName, edition, year, contactInfo: {...}}
 *   generatePreviews?: boolean
 *
 * Returns { queued: true, status: "GENERATING" } and runs the
 * Jinja+WeasyPrint pipeline in the background.
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
    select: { id: true, status: true, _count: { select: { products: true } } },
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
  if (project._count.products === 0) {
    return NextResponse.json(
      { error: "Projede ürün yok. Önce 'analyze' çalıştırın." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { templateSlug, brandKit, metadata, generatePreviews } =
    body as Record<string, any>;

  catalogJobQueue.enqueue(async () => {
    await runGenerate({
      projectId: id,
      templateSlug: typeof templateSlug === "string" ? templateSlug : undefined,
      brandKit: brandKit && typeof brandKit === "object" ? brandKit : undefined,
      metadata: metadata && typeof metadata === "object" ? metadata : undefined,
      generatePreviews:
        typeof generatePreviews === "boolean" ? generatePreviews : undefined,
    });
  });

  return NextResponse.json({
    queued: true,
    projectId: id,
    status: "GENERATING",
  });
}
