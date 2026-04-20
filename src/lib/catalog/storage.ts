import path from "path";
import { mkdir, unlink, stat } from "fs/promises";
import { randomUUID } from "crypto";
import sharp from "sharp";

// ═══════════════════════════════════════════════════════════
// Storage root — configurable via env, default: /var/www/klinik-asistan/storage
// ═══════════════════════════════════════════════════════════
export const CATALOG_STORAGE_ROOT =
  process.env.CATALOG_STORAGE_ROOT ||
  path.join(process.cwd(), "storage");

// Per-project quota in bytes (default 500 MB, env override possible)
export const PROJECT_QUOTA_BYTES = Number(
  process.env.CATALOG_PROJECT_QUOTA_BYTES || 500 * 1024 * 1024
);

// Per-file limits
export const FILE_LIMITS = {
  REFERENCE_PDF: { max: 50 * 1024 * 1024, mimes: ["application/pdf"] },
  PRODUCT_IMAGE: {
    max: 10 * 1024 * 1024,
    mimes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  },
  EXCEL_DATA: {
    max: 10 * 1024 * 1024,
    mimes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/csv",
    ],
  },
} as const;

export type FileType = keyof typeof FILE_LIMITS;

export const FILE_TYPE_SUBDIR: Record<FileType, string> = {
  REFERENCE_PDF: "source",
  PRODUCT_IMAGE: "photos",
  EXCEL_DATA: "data",
};

// ═══════════════════════════════════════════════════════════
// Path builders (defense-in-depth: validate ids against cuid format)
// ═══════════════════════════════════════════════════════════
const SAFE_ID = /^[a-z0-9-_]{1,60}$/i;

function assertSafeId(id: string, label: string) {
  if (!SAFE_ID.test(id)) {
    throw new Error(`Geçersiz ${label} formatı`);
  }
}

export function projectRoot(tenantId: string, projectId: string): string {
  assertSafeId(tenantId, "tenant");
  assertSafeId(projectId, "project");
  return path.join(CATALOG_STORAGE_ROOT, "catalog", tenantId, projectId);
}

export function subdirFor(
  tenantId: string,
  projectId: string,
  fileType: FileType
): string {
  return path.join(projectRoot(tenantId, projectId), FILE_TYPE_SUBDIR[fileType]);
}

export function outputDir(tenantId: string, projectId: string): string {
  return path.join(projectRoot(tenantId, projectId), "output");
}

export function thumbDir(tenantId: string, projectId: string): string {
  return path.join(subdirFor(tenantId, projectId, "PRODUCT_IMAGE"), "thumbs");
}

/** Ensure all standard subdirectories exist for a project. */
export async function ensureProjectDirs(
  tenantId: string,
  projectId: string
): Promise<void> {
  const root = projectRoot(tenantId, projectId);
  await mkdir(path.join(root, "source"), { recursive: true });
  await mkdir(path.join(root, "photos"), { recursive: true });
  await mkdir(path.join(root, "photos", "thumbs"), { recursive: true });
  await mkdir(path.join(root, "data"), { recursive: true });
  await mkdir(path.join(root, "output"), { recursive: true });
}

// ═══════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════
export function validateFile(
  fileType: FileType,
  mimeType: string,
  size: number
): { ok: true } | { ok: false; error: string } {
  const limit = FILE_LIMITS[fileType];
  if (!limit) {
    return { ok: false, error: "Geçersiz dosya türü" };
  }
  if (size > limit.max) {
    return {
      ok: false,
      error: `Dosya boyutu ${(limit.max / 1024 / 1024).toFixed(0)}MB'ı aşamaz`,
    };
  }
  const mimeOk = (limit.mimes as readonly string[]).includes(mimeType.toLowerCase());
  if (!mimeOk) {
    return {
      ok: false,
      error: `Desteklenmeyen MIME türü: ${mimeType}`,
    };
  }
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════
// Filename sanitization
// ═══════════════════════════════════════════════════════════
export function sanitizeFileName(original: string): string {
  // keep basename only, strip directory separators
  const base = path.basename(original).replace(/[/\\]/g, "_");
  // limit length, replace whitespace and risky chars
  return base
    .replace(/\s+/g, "_")
    .replace(/[^\w.\-]/g, "")
    .slice(0, 180) || "file";
}

export function storedFileName(original: string): string {
  const safe = sanitizeFileName(original);
  const ext = path.extname(safe);
  const stem = path.basename(safe, ext);
  return `${Date.now()}_${randomUUID().slice(0, 8)}_${stem}${ext}`;
}

// ═══════════════════════════════════════════════════════════
// Image processing (sharp)
// Resize to max 1920px on long edge, generate 200px thumbnail.
// Returns storage paths RELATIVE to CATALOG_STORAGE_ROOT (portable).
// ═══════════════════════════════════════════════════════════
interface StoredImage {
  relPath: string;       // relative path from CATALOG_STORAGE_ROOT
  absPath: string;       // absolute path on disk
  bytes: number;         // final file size
  thumbRelPath: string;  // relative path of thumbnail
  thumbAbsPath: string;
  width: number;
  height: number;
}

export async function storeProductImage(
  tenantId: string,
  projectId: string,
  originalName: string,
  buffer: Buffer
): Promise<StoredImage> {
  const photosAbs = subdirFor(tenantId, projectId, "PRODUCT_IMAGE");
  const thumbsAbs = thumbDir(tenantId, projectId);
  await mkdir(photosAbs, { recursive: true });
  await mkdir(thumbsAbs, { recursive: true });

  // Force .webp for both main and thumb to unify downstream handling
  const base = sanitizeFileName(originalName).replace(/\.[^.]+$/, "");
  const main = `${Date.now()}_${randomUUID().slice(0, 8)}_${base}.webp`;
  const thumb = `thumb_${main}`;

  const mainAbs = path.join(photosAbs, main);
  const thumbAbs = path.join(thumbsAbs, thumb);

  const img = sharp(buffer, { failOn: "none" });
  const meta = await img.metadata();

  await img
    .rotate() // respect EXIF orientation
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(mainAbs);

  await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({ width: 200, height: 200, fit: "inside" })
    .webp({ quality: 75 })
    .toFile(thumbAbs);

  const st = await stat(mainAbs);
  const rel = (abs: string) => path.relative(CATALOG_STORAGE_ROOT, abs);

  return {
    relPath: rel(mainAbs),
    absPath: mainAbs,
    bytes: st.size,
    thumbRelPath: rel(thumbAbs),
    thumbAbsPath: thumbAbs,
    width: meta.width || 0,
    height: meta.height || 0,
  };
}

// ═══════════════════════════════════════════════════════════
// Generic file write (non-image: PDF, excel, csv)
// ═══════════════════════════════════════════════════════════
export async function storeGenericFile(
  tenantId: string,
  projectId: string,
  fileType: FileType,
  originalName: string,
  buffer: Buffer
): Promise<{ relPath: string; absPath: string; bytes: number }> {
  if (fileType === "PRODUCT_IMAGE") {
    throw new Error("Use storeProductImage() for images");
  }
  const dirAbs = subdirFor(tenantId, projectId, fileType);
  await mkdir(dirAbs, { recursive: true });
  const finalName = storedFileName(originalName);
  const abs = path.join(dirAbs, finalName);

  const { writeFile } = await import("fs/promises");
  await writeFile(abs, buffer);

  const st = await stat(abs);
  return {
    relPath: path.relative(CATALOG_STORAGE_ROOT, abs),
    absPath: abs,
    bytes: st.size,
  };
}

// ═══════════════════════════════════════════════════════════
// Delete (tolerant — missing file is not an error)
// ═══════════════════════════════════════════════════════════
export async function deleteStoredFile(relOrAbsPath: string): Promise<void> {
  const abs = path.isAbsolute(relOrAbsPath)
    ? relOrAbsPath
    : path.join(CATALOG_STORAGE_ROOT, relOrAbsPath);
  try {
    await unlink(abs);
  } catch (err: any) {
    if (err?.code !== "ENOENT") throw err;
  }
}

/**
 * Delete an image along with its thumbnail (best-effort).
 * relPath is the main image relative path stored in DB.
 */
export async function deleteImageWithThumb(relPath: string): Promise<void> {
  await deleteStoredFile(relPath);
  // Thumb convention: same dir + /thumbs/thumb_<name>
  const dir = path.dirname(relPath);
  const name = path.basename(relPath);
  const thumbRel = path.join(dir, "thumbs", `thumb_${name}`);
  await deleteStoredFile(thumbRel);
}

// ═══════════════════════════════════════════════════════════
// Quota helpers
// ═══════════════════════════════════════════════════════════
export function quotaRemaining(usedBytes: number): number {
  return Math.max(0, PROJECT_QUOTA_BYTES - usedBytes);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}
