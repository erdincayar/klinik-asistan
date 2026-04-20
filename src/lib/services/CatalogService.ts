/**
 * Client for the catalog FastAPI service (python-services/catalog-service).
 *
 * Usage (server-side, e.g. an API route):
 *   const ref = await CatalogService.startParsePdf({ pdfPath });
 *   const result = await CatalogService.waitForJob<ParsePdfResult>(ref.jobId);
 *
 * All long-running endpoints are async: they return 202 + job_id.
 * This client hides polling; `start*` returns the ref, and
 * `waitForJob` polls until completed/failed.
 */

export const CATALOG_SERVICE_URL =
  process.env.CATALOG_SERVICE_URL || "http://127.0.0.1:8001";

/* ─── Types that mirror app/schemas.py ──────────────────────────── */

export type CatalogJobStatus = "pending" | "running" | "completed" | "failed";

export interface CatalogJobRef {
  jobId: string;
}

export interface CatalogJobInfo<TResult = unknown> {
  jobId: string;
  kind: string;
  status: CatalogJobStatus;
  progress: number | null;
  message: string | null;
  error: string | null;
  result: TResult | null;
  createdAt: number;
  updatedAt: number;
}

export interface ParsedPage {
  num: number;
  text: string;
  char_count: number;
  image_count: number;
}

export interface DetectedProductBlock {
  page_num: number;
  text_snippet: string;
  score: number;
}

export interface ExtractedImage {
  page_num: number;
  bbox: number[];
  path: string; // CATALOG_STORAGE_ROOT-relative
  width: number;
  height: number;
}

export interface ParsePdfResult {
  pages: ParsedPage[];
  detected_products: DetectedProductBlock[];
  extracted_images: ExtractedImage[];
}

export interface ExtractedProduct {
  product_code: string | null;
  name: string;
  description: string | null;
  technical_specs: Record<string, unknown>;
  category: string | null;
  page_num: number | null;
  confidence: number;
}

export interface ExtractProductsResult {
  products: ExtractedProduct[];
  batches: number;
}

export interface MatchEntry {
  product_code: string | null;
  product_name: string;
  image_path: string | null;
  method: "filename" | "phash" | "unmatched";
  score: number;
}

export interface MatchImagesResult {
  matches: MatchEntry[];
  map: Record<string, string>;
}

export interface TranslateResult {
  products: ExtractedProduct[];
  batches: number;
}

/* ─── Request payloads ──────────────────────────────────────────── */

export interface ParsePdfInput {
  pdfPath: string; // CATALOG_STORAGE_ROOT-relative (or absolute under the root)
  extractImagesTo?: string;
}

export interface ExtractProductsInput {
  pages: ParsedPage[];
  sector?: string;
  brand?: string;
}

export interface MatchImagesInput {
  products: ExtractedProduct[];
  photoFiles?: string[];
  extractedImages?: ExtractedImage[];
  phashThreshold?: number;
}

export interface TranslateInput {
  products: ExtractedProduct[];
  sourceLanguage?: string;
  targetLanguage?: string;
  sector?: string;
}

/* ─── Low-level transport ───────────────────────────────────────── */

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${CATALOG_SERVICE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new CatalogServiceError(
      `POST ${path} → HTTP ${res.status}: ${txt.slice(0, 300)}`,
      res.status
    );
  }
  return (await res.json()) as T;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${CATALOG_SERVICE_URL}${path}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new CatalogServiceError(
      `GET ${path} → HTTP ${res.status}: ${txt.slice(0, 300)}`,
      res.status
    );
  }
  return (await res.json()) as T;
}

export class CatalogServiceError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "CatalogServiceError";
  }
}

function toCamelJob(raw: any): CatalogJobInfo {
  return {
    jobId: raw.job_id,
    kind: raw.kind,
    status: raw.status,
    progress: raw.progress ?? null,
    message: raw.message ?? null,
    error: raw.error ?? null,
    result: raw.result ?? null,
    createdAt: Number(raw.created_at) || 0,
    updatedAt: Number(raw.updated_at) || 0,
  };
}

/* ─── Public API ────────────────────────────────────────────────── */

async function startParsePdf(input: ParsePdfInput): Promise<CatalogJobRef> {
  const body = {
    pdf_path: input.pdfPath,
    extract_images_to: input.extractImagesTo,
  };
  const raw = await post<{ job_id: string }>("/parse-pdf", body);
  return { jobId: raw.job_id };
}

async function startExtractProducts(
  input: ExtractProductsInput
): Promise<CatalogJobRef> {
  const body = { pages: input.pages, sector: input.sector, brand: input.brand };
  const raw = await post<{ job_id: string }>("/extract-products", body);
  return { jobId: raw.job_id };
}

async function startMatchImages(
  input: MatchImagesInput
): Promise<CatalogJobRef> {
  const body = {
    products: input.products,
    photo_files: input.photoFiles ?? [],
    extracted_images: input.extractedImages ?? [],
    phash_threshold: input.phashThreshold ?? 10,
  };
  const raw = await post<{ job_id: string }>("/match-images", body);
  return { jobId: raw.job_id };
}

async function startTranslate(input: TranslateInput): Promise<CatalogJobRef> {
  const body = {
    products: input.products,
    source_language: input.sourceLanguage ?? "tr",
    target_language: input.targetLanguage ?? "tr",
    sector: input.sector,
  };
  const raw = await post<{ job_id: string }>("/translate", body);
  return { jobId: raw.job_id };
}

async function getJob<T = unknown>(jobId: string): Promise<CatalogJobInfo<T>> {
  const raw = await get<any>(`/jobs/${encodeURIComponent(jobId)}`);
  return toCamelJob(raw) as CatalogJobInfo<T>;
}

interface WaitOptions {
  intervalMs?: number;    // default 1500
  timeoutMs?: number;     // default 180_000 (3m)
  onProgress?: (info: CatalogJobInfo) => void;
}

/**
 * Poll a job until it completes or fails. Throws on failure or timeout.
 */
async function waitForJob<T = unknown>(
  jobId: string,
  opts: WaitOptions = {}
): Promise<T> {
  const intervalMs = Math.max(300, opts.intervalMs ?? 1500);
  const timeoutMs = Math.max(1000, opts.timeoutMs ?? 180_000);
  const deadline = Date.now() + timeoutMs;

  while (true) {
    const info = await getJob<T>(jobId);
    opts.onProgress?.(info);

    if (info.status === "completed") {
      return (info.result ?? null) as T;
    }
    if (info.status === "failed") {
      throw new CatalogServiceError(info.error || "job failed");
    }
    if (Date.now() > deadline) {
      throw new CatalogServiceError(`job ${jobId} timed out after ${timeoutMs}ms`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

async function health(): Promise<any> {
  return get<any>("/health");
}

export const CatalogService = {
  startParsePdf,
  startExtractProducts,
  startMatchImages,
  startTranslate,
  getJob,
  waitForJob,
  health,
};

export default CatalogService;
