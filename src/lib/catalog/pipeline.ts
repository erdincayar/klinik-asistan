/**
 * Catalog project pipeline — analyze + generate orchestration.
 *
 * Pure functions that take a projectId (and whatever options) and
 * drive the FastAPI service end-to-end. They read and write Prisma
 * records directly (CatalogProject.status, CatalogProduct rows,
 * CatalogGeneration rows).
 *
 * Meant to be enqueued via `catalogJobQueue`.
 */

import path from "path";
import { rm } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { CatalogService } from "@/lib/services/CatalogService";
import type {
  ExtractedImage,
  ExtractedProduct,
  ExtractProductsResult,
  MatchImagesResult,
  ParsedPage,
  ParsePdfResult,
  TranslateResult,
} from "@/lib/services/CatalogService";

/* ─────────── Analyze ─────────── */

export interface AnalyzeOptions {
  projectId: string;
  sector?: string;
  brand?: string;
  /** When source != target, translate product fields into target. */
  sourceLanguage?: string;
  targetLanguage?: string;
  phashThreshold?: number;
}

/**
 * Run parse-pdf (per reference PDF) → extract-products → match-images →
 * (optional) translate, then persist CatalogProduct rows.
 *
 * Project status transitions:
 *   DRAFT/READY_TO_GENERATE/FAILED → ANALYZING → READY_TO_GENERATE | FAILED
 */
export async function runAnalyze(opts: AnalyzeOptions): Promise<void> {
  const { projectId } = opts;

  await prisma.catalogProject.update({
    where: { id: projectId },
    data: { status: "ANALYZING" },
  });

  try {
    const project = await prisma.catalogProject.findUnique({
      where: { id: projectId },
      include: { sourceFiles: true },
    });
    if (!project) throw new Error("project not found");

    const pdfs = project.sourceFiles.filter((f) => f.fileType === "REFERENCE_PDF");
    const photos = project.sourceFiles.filter((f) => f.fileType === "PRODUCT_IMAGE");

    if (pdfs.length === 0) {
      throw new Error("En az bir REFERENCE_PDF dosyası gerekli");
    }

    // 1) Parse every reference PDF, then concatenate pages + extracted images
    const allPages: ParsedPage[] = [];
    const allExtractedImages: ExtractedImage[] = [];

    for (const pdf of pdfs) {
      const ref = await CatalogService.startParsePdf({ pdfPath: pdf.storagePath });
      const parsed = await CatalogService.waitForJob<ParsePdfResult>(ref.jobId, {
        intervalMs: 2000,
        timeoutMs: 10 * 60 * 1000,
      });
      allPages.push(...parsed.pages);
      allExtractedImages.push(...parsed.extracted_images);
    }

    if (allPages.length === 0) {
      throw new Error("PDF'lerden metin çıkartılamadı");
    }

    // 2) Extract products from all pages
    const extractRef = await CatalogService.startExtractProducts({
      pages: allPages,
      sector: opts.sector ?? undefined,
      brand: opts.brand ?? undefined,
    });
    const extracted = await CatalogService.waitForJob<ExtractProductsResult>(
      extractRef.jobId,
      { intervalMs: 3000, timeoutMs: 15 * 60 * 1000 }
    );

    let products: ExtractedProduct[] = extracted.products;

    if (products.length === 0) {
      throw new Error("Claude hiç ürün bulamadı");
    }

    // 3) Match images
    const matchRef = await CatalogService.startMatchImages({
      products,
      photoFiles: photos.map((p) => p.storagePath),
      extractedImages: allExtractedImages,
      phashThreshold: opts.phashThreshold ?? 10,
    });
    const matchResult = await CatalogService.waitForJob<MatchImagesResult>(
      matchRef.jobId,
      { intervalMs: 2000, timeoutMs: 10 * 60 * 1000 }
    );

    // 4) Translate if requested
    const src = (opts.sourceLanguage || "tr").toLowerCase();
    const tgt = (opts.targetLanguage || project.targetLanguage || "tr").toLowerCase();
    if (src !== tgt) {
      const trRef = await CatalogService.startTranslate({
        products,
        sourceLanguage: src,
        targetLanguage: tgt,
        sector: opts.sector ?? undefined,
      });
      const tr = await CatalogService.waitForJob<TranslateResult>(trRef.jobId, {
        intervalMs: 3000,
        timeoutMs: 15 * 60 * 1000,
      });
      products = tr.products;
    }

    // 5) Persist products. Fresh-replace strategy for now
    //    (user re-runs analysis → old draft products replaced).
    const imageByCode: Record<string, string> = matchResult.map || {};
    const matchesByCode = new Map<string, string>();
    for (const m of matchResult.matches) {
      if (m.image_path && m.product_code) {
        matchesByCode.set(m.product_code, m.image_path);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.catalogProduct.deleteMany({ where: { projectId } });
      let order = 0;
      for (const p of products) {
        const code = p.product_code || undefined;
        const image =
          (code && (imageByCode[code] || matchesByCode.get(code))) || null;

        await tx.catalogProduct.create({
          data: {
            projectId,
            productCode: code || undefined, // falls back to cuid default
            order: order++,
            name: p.name,
            originalName: p.name,
            description: p.description ?? null,
            originalDescription: p.description ?? null,
            technicalSpecs: (p.technical_specs as any) ?? {},
            category: p.category ?? null,
            imageStoragePath: image,
            aiConfidence: p.confidence ?? 0.5,
            status: "DRAFT",
          },
        });
      }

      await tx.catalogProject.update({
        where: { id: projectId },
        data: { status: "READY_TO_GENERATE" },
      });
    });

    console.log(`[catalog] analyze ok project=${projectId} products=${products.length}`);
  } catch (err: any) {
    console.error(`[catalog] analyze failed project=${projectId}:`, err);
    await prisma.catalogProject.update({
      where: { id: projectId },
      data: { status: "FAILED" },
    });
    throw err;
  }
}

/* ─────────── Generate ─────────── */

export interface GenerateOptions {
  projectId: string;
  templateSlug?: string; // overrides project.template
  brandKit?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    logoPath?: string | null;
    fontFamily?: string;
  };
  metadata?: {
    title?: string;
    subtitle?: string;
    companyName?: string;
    edition?: string;
    year?: number;
    contactInfo?: {
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
    };
  };
  /** Relative to CATALOG_STORAGE_ROOT. Defaults to catalog/<tenant>/<project>/output/. */
  outputDir?: string;
  generatePreviews?: boolean;
}

interface CatalogGenerationResult {
  pdf_path: string;
  preview_paths: string[];
  page_count: number;
  file_size: number;
}

export async function runGenerate(
  opts: GenerateOptions
): Promise<{ generationId: string; pdfPath: string; pageCount: number }> {
  const { projectId } = opts;

  await prisma.catalogProject.update({
    where: { id: projectId },
    data: { status: "GENERATING" },
  });

  try {
    const project = await prisma.catalogProject.findUnique({
      where: { id: projectId },
      include: {
        products: { orderBy: { order: "asc" } },
        template: true,
        clinic: { select: { id: true, name: true, phone: true, address: true } },
      },
    });
    if (!project) throw new Error("project not found");
    if (project.products.length === 0) {
      throw new Error("Projede ürün yok — önce analiz çalıştırın");
    }

    const templateSlug =
      opts.templateSlug ||
      (project.template?.slug ?? "natural-stone-modern");

    // Find the template row (for book-keeping + ensuring it exists)
    const template = await prisma.catalogTemplate.findUnique({
      where: { slug: templateSlug },
    });
    if (!template) {
      throw new Error(`Şablon bulunamadı: ${templateSlug}`);
    }

    // Default output dir: catalog/<tenant>/<project>/output/
    const outputDir =
      opts.outputDir ||
      path.posix.join("catalog", project.clinicId, project.id, "output");

    // Assemble generator payload
    const payload = {
      products: project.products.map((p) => ({
        product_code: p.productCode,
        name: p.name,
        description: p.description,
        technical_specs: (p.technicalSpecs as Record<string, unknown>) || {},
        category: p.category,
        image_path: p.imageStoragePath,
        price: p.price,
        currency: p.currency,
      })),
      template_slug: templateSlug,
      brand_kit: {
        primary: opts.brandKit?.primary ?? "#1F2937",
        secondary: opts.brandKit?.secondary ?? "#F9FAFB",
        accent: opts.brandKit?.accent ?? "#D4A574",
        logo_path: opts.brandKit?.logoPath ?? null,
        font_family: opts.brandKit?.fontFamily ?? "Inter",
      },
      metadata: {
        title: opts.metadata?.title ?? project.name,
        subtitle: opts.metadata?.subtitle ?? null,
        company_name: opts.metadata?.companyName ?? project.clinic?.name ?? null,
        edition: opts.metadata?.edition ?? null,
        year: opts.metadata?.year ?? new Date().getFullYear(),
        language: project.targetLanguage || "tr",
        contact_info: opts.metadata?.contactInfo ?? {
          address: project.clinic?.address ?? null,
          phone: project.clinic?.phone ?? null,
          email: null,
          website: null,
        },
      },
      output_dir: outputDir,
      generate_previews: opts.generatePreviews !== false,
    };

    const ref = await fetch(
      `${process.env.CATALOG_SERVICE_URL || "http://127.0.0.1:8001"}/generate-catalog`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      }
    );
    if (!ref.ok) {
      const txt = await ref.text().catch(() => "");
      throw new Error(`catalog-service: HTTP ${ref.status}: ${txt.slice(0, 300)}`);
    }
    const { job_id: jobId } = await ref.json();
    const result = await CatalogService.waitForJob<CatalogGenerationResult>(jobId, {
      intervalMs: 2500,
      timeoutMs: 15 * 60 * 1000,
    });

    // Record a CatalogGeneration row
    const generation = await prisma.catalogGeneration.create({
      data: {
        projectId,
        templateId: template.id,
        status: "COMPLETED",
        pdfPath: result.pdf_path,
        pageCount: result.page_count,
        fileSize: result.file_size,
        generatedAt: new Date(),
      },
    });

    await prisma.catalogProject.update({
      where: { id: projectId },
      data: {
        status: "COMPLETED",
        templateId: template.id,
      },
    });

    console.log(
      `[catalog] generate ok project=${projectId} pages=${result.page_count} path=${result.pdf_path}`
    );

    return {
      generationId: generation.id,
      pdfPath: result.pdf_path,
      pageCount: result.page_count,
    };
  } catch (err: any) {
    console.error(`[catalog] generate failed project=${projectId}:`, err);
    try {
      await prisma.catalogGeneration.create({
        data: {
          projectId,
          templateId: (
            await prisma.catalogTemplate.findFirst({
              where: { slug: opts.templateSlug || "natural-stone-modern" },
              select: { id: true },
            })
          )?.id ?? "",
          status: "FAILED",
          errorLog: String(err?.message || err).slice(0, 1000),
        },
      });
    } catch {}
    await prisma.catalogProject.update({
      where: { id: projectId },
      data: { status: "FAILED" },
    });
    throw err;
  }
}

/* ─────────── Cleanup helpers (used by project delete) ─────────── */

export async function cleanupGeneratedPdfs(projectId: string): Promise<void> {
  const root = process.env.CATALOG_STORAGE_ROOT || "/var/www/klinik-asistan/storage";
  const gens = await prisma.catalogGeneration.findMany({
    where: { projectId, pdfPath: { not: null } },
    select: { pdfPath: true },
  });
  for (const g of gens) {
    if (!g.pdfPath) continue;
    try {
      await rm(path.join(root, g.pdfPath), { force: true });
    } catch {}
  }
}
