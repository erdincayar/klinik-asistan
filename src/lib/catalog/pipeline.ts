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
import { rm, readFile } from "fs/promises";
import * as XLSX from "xlsx";
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
import { CATALOG_STORAGE_ROOT } from "@/lib/catalog/storage";

// Excel-only akış için: dataSchema.excel.mappings'i uygulayıp ExtractedProduct
// listesi üretir. PDF/Claude extract atlanır.
interface ExcelMapping {
  column: string;
  // standart key veya "_extra:<isim>"
  key: string;
}

async function extractFromExcel(
  absPath: string,
  mappings: ExcelMapping[]
): Promise<ExtractedProduct[]> {
  const buf = await readFile(absPath);
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  const out: ExtractedProduct[] = [];
  for (const row of rows) {
    const product: Record<string, any> = {
      product_code: null,
      name: "",
      description: null,
      technical_specs: {},
      category: null,
      page_num: null,
      confidence: 0.95, // user mapping → high trust
    };
    const extra: Record<string, any> = {};
    let imageUrl: string | null = null;
    let priceVal: number | null = null;
    let currencyVal: string | null = null;
    let brandVal: string | null = null;
    let skuVal: string | null = null;

    for (const m of mappings) {
      const raw = row[m.column];
      if (raw === null || raw === undefined || raw === "") continue;
      const s = String(raw).trim();

      if (m.key.startsWith("_extra:")) {
        const fieldName = m.key.slice("_extra:".length);
        if (fieldName) extra[fieldName] = raw;
        continue;
      }

      switch (m.key) {
        case "name":
          product.name = s;
          break;
        case "description":
          product.description = s;
          break;
        case "category":
          product.category = s;
          break;
        case "brand":
          brandVal = s;
          break;
        case "sku":
          skuVal = s;
          break;
        case "price": {
          const n = parseFloat(String(raw).replace(",", "."));
          if (!isNaN(n)) priceVal = n;
          break;
        }
        case "currency":
          currencyVal = s.toUpperCase();
          break;
        case "imageUrl":
          imageUrl = s;
          break;
      }
    }

    if (!product.name) continue; // skip rows without a name

    if (brandVal) extra.marka = brandVal;
    if (skuVal) {
      extra.sku = skuVal;
      product.product_code = skuVal;
    }
    if (priceVal !== null) (product as any)._price = priceVal;
    if (currencyVal) (product as any)._currency = currencyVal;
    if (imageUrl) (product as any)._imageUrl = imageUrl;
    if (Object.keys(extra).length) (product as any)._extra = extra;

    out.push(product as unknown as ExtractedProduct);
  }
  return out;
}

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
    const excels = project.sourceFiles.filter((f) => f.fileType === "EXCEL_DATA");

    // Excel-only akış mı? Kullanıcı dataSchema.excel.mappings tanımladıysa
    // Claude extract atlanır — kolon eşlemesi tek başına yeterli.
    const dataSchema = (project.dataSchema as any) || null;
    const excelMappings: ExcelMapping[] | null =
      dataSchema?.excel?.mappings && Array.isArray(dataSchema.excel.mappings)
        ? dataSchema.excel.mappings
        : null;
    const useExcelFlow = excelMappings && excels.length > 0;

    if (!useExcelFlow && pdfs.length === 0) {
      throw new Error(
        "En az bir REFERENCE_PDF dosyası gerekli (veya Excel + kolon eşlemesi)"
      );
    }

    // 1) PDF'leri parse et — sadece klasik (PDF) akışında.
    const allPages: ParsedPage[] = [];
    const allExtractedImages: ExtractedImage[] = [];

    if (!useExcelFlow) {
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
    }

    // 2) Extract products from all pages
    //    Prompt context'i 3 kaynaktan toplanır:
    //    - Kullanıcının "Ne istiyorsun?" prompt'u (project.userPrompt) — en önemlisi
    //    - Çıktı tipi (project.outputType) — Claude'un format kararını yönlendirir
    //    - Her dosyanın userNote + AI analiz özeti
    const contextSections: string[] = [];

    if (project.userPrompt?.trim()) {
      contextSections.push(
        `Kullanıcının isteği:\n${project.userPrompt.trim()}`
      );
    }

    if (project.outputType && project.outputType !== "PDF_CATALOG") {
      const outputTypeLabel: Record<string, string> = {
        SOCIAL_POST: "Sosyal medya postu (1080×1080)",
        BROCHURE: "Tanıtım broşürü (A5)",
        PRICE_LIST: "Fiyat listesi (A4 tablo)",
        CUSTOM: "Özel format — kullanıcının isteğine göre",
      };
      const label = outputTypeLabel[project.outputType] || project.outputType;
      contextSections.push(`Hedef çıktı: ${label}`);
    }

    const fileLines: string[] = [];
    for (const f of project.sourceFiles) {
      const bits: string[] = [];
      if (f.userNote?.trim()) bits.push(`kullanıcı notu: ${f.userNote.trim()}`);
      const ai = f.aiNote as any;
      if (ai?.summary) bits.push(`ai özeti: ${ai.summary}`);
      if (Array.isArray(ai?.detectedColumns) && ai.detectedColumns.length) {
        bits.push(`kolonlar: ${ai.detectedColumns.join(", ")}`);
      }
      if (Array.isArray(ai?.suggestions) && ai.suggestions.length) {
        bits.push(`öneriler: ${ai.suggestions.slice(0, 3).join("; ")}`);
      }
      if (bits.length) {
        fileLines.push(`• ${f.originalName} (${f.fileType}): ${bits.join(" | ")}`);
      }
    }
    if (fileLines.length) {
      contextSections.push(`Kaynak dosya notları:\n${fileLines.join("\n")}`);
    }

    const extraContext = contextSections.length
      ? contextSections.join("\n\n")
      : undefined;

    let products: ExtractedProduct[] = [];

    if (useExcelFlow) {
      // 2a) Excel akışı — kolon eşleme uygula
      const targetExcel =
        excels.find(
          (e) => e.originalName === dataSchema?.excel?.fileName
        ) || excels[0];
      const absPath = path.isAbsolute(targetExcel.storagePath)
        ? targetExcel.storagePath
        : path.join(CATALOG_STORAGE_ROOT, targetExcel.storagePath);
      products = await extractFromExcel(absPath, excelMappings!);
      if (products.length === 0) {
        throw new Error("Excel'den ürün çıkartılamadı — dosya boş veya isim kolonu eşlenmemiş");
      }
    } else {
      // 2b) PDF akışı — Claude extract
      const extractRef = await CatalogService.startExtractProducts({
        pages: allPages,
        sector: opts.sector ?? undefined,
        brand: opts.brand ?? undefined,
        extraContext,
      });
      const extracted = await CatalogService.waitForJob<ExtractProductsResult>(
        extractRef.jobId,
        { intervalMs: 3000, timeoutMs: 15 * 60 * 1000 }
      );
      products = extracted.products;

      if (products.length === 0) {
        throw new Error("Claude hiç ürün bulamadı");
      }
    }

    // 3) Match images — Excel akışında da PDF gömülü görsellerini kullanma,
    //    sadece foto klasöründekileri yedek olarak kullan.
    let imageByCode: Record<string, string> = {};
    const matchesByCode = new Map<string, string>();

    if (photos.length > 0) {
      const matchRef = await CatalogService.startMatchImages({
        products,
        photoFiles: photos.map((p) => p.storagePath),
        extractedImages: useExcelFlow ? [] : allExtractedImages,
        phashThreshold: opts.phashThreshold ?? 10,
      });
      const matchResult = await CatalogService.waitForJob<MatchImagesResult>(
        matchRef.jobId,
        { intervalMs: 2000, timeoutMs: 10 * 60 * 1000 }
      );
      imageByCode = matchResult.map || {};
      for (const m of matchResult.matches) {
        if (m.image_path && m.product_code) {
          matchesByCode.set(m.product_code, m.image_path);
        }
      }
    }

    // 4) Translate if requested — Excel akışında pas geç (kullanıcı zaten
    //    istediği dilde veri girdi).
    const src = (opts.sourceLanguage || "tr").toLowerCase();
    const tgt = (opts.targetLanguage || project.targetLanguage || "tr").toLowerCase();
    if (!useExcelFlow && src !== tgt) {
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
    await prisma.$transaction(async (tx) => {
      await tx.catalogProduct.deleteMany({ where: { projectId } });
      let order = 0;
      for (const p of products) {
        const code = p.product_code || undefined;
        // Excel akışında imageUrl mapping'i varsa onu kullan; yoksa eşleşeni
        const directImage = (p as any)._imageUrl as string | undefined;
        const image =
          directImage ||
          (code && (imageByCode[code] || matchesByCode.get(code))) ||
          null;
        const priceVal = (p as any)._price as number | undefined;
        const currencyVal = (p as any)._currency as string | undefined;
        const extraVal = (p as any)._extra as Record<string, any> | undefined;

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
            ...(priceVal !== undefined && { price: priceVal }),
            ...(currencyVal && { currency: currencyVal }),
            ...(extraVal && { extra: extraVal as any }),
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

    // outputType → varsayılan template haritası. Kullanıcı şablon seçtiyse
    // ona saygı duyarız; yoksa outputType belirler. CUSTOM tipinde de varsayılan
    // klasik katalog şablonu kullanılır (Python tarafı user_prompt'a bakar).
    const OUTPUT_TYPE_DEFAULT_SLUG: Record<string, string> = {
      PDF_CATALOG: "natural-stone-modern",
      PRICE_LIST: "price-list-modern",
      SOCIAL_POST: "social-post-square",
      BROCHURE: "natural-stone-modern", // henüz özel broşür şablonu yok
      CUSTOM: "natural-stone-modern",
    };
    const templateSlug =
      opts.templateSlug ||
      project.template?.slug ||
      OUTPUT_TYPE_DEFAULT_SLUG[project.outputType] ||
      "natural-stone-modern";

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
        // Kullanıcı tanımlı dinamik alanlar (CatalogProduct.extra). Render
        // template'i bu alanları okuyup gösterebilir (P4).
        extra: (p.extra as Record<string, unknown>) || {},
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
        // Kullanıcının orijinal isteği — Python render tarafı bunu okuyup
        // template seçimi/varyantı için kullanabilsin.
        user_prompt: project.userPrompt || null,
        output_type: project.outputType || "PDF_CATALOG",
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
