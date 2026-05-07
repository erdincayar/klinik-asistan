/**
 * Catalog görsel işleme — fal.ai BG removal + lifestyle compose.
 *
 * Mevcut akış: kullanıcı bir CatalogSourceFile (PRODUCT_IMAGE) için
 * "arka planı temizle" veya "lifestyle uygula" çağırır. Sonuç dosyaları
 * CATALOG_STORAGE_ROOT altına kaydedilir, relPath döndürülür.
 *
 * fal.ai modelleri:
 *   - 851-labs/background-remover  → BG removal (PNG, transparan)
 *   ileride: fal-ai/iclight-v2     → AI lifestyle relighting
 */
import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { CATALOG_STORAGE_ROOT, subdirFor } from "@/lib/catalog/storage";

const FAL_BG_REMOVE_URL = "https://fal.run/fal-ai/birefnet";

/**
 * Bir görseli fal.ai birefnet ile arka planı temizlenmiş PNG'ye dönüştürür.
 * Geri dönen relPath, CATALOG_STORAGE_ROOT-relative.
 *
 * NOT: birefnet PNG döndürür; transparan arka plan korunur.
 */
export async function removeBackgroundWithFal(
  tenantId: string,
  projectId: string,
  inputAbsPath: string
): Promise<{ relPath: string; absPath: string; bytes: number }> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("FAL_KEY ortam değişkeni ayarlanmamış");
  }

  // Görseli base64 data URI olarak fal'a gönder — public URL'imiz olmadığı
  // için en basit yol bu. fal.ai data URI'ı kabul ediyor (tüm fal modelleri).
  const buf = await readFile(inputAbsPath);
  const ext = path.extname(inputAbsPath).slice(1).toLowerCase() || "png";
  const mime =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "webp"
        ? "image/webp"
        : "image/png";
  const dataUri = `data:${mime};base64,${buf.toString("base64")}`;

  const res = await fetch(FAL_BG_REMOVE_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image_url: dataUri }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`fal.ai BG removal hatası (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = (await res.json()) as { image?: { url?: string } };
  const remoteUrl = data.image?.url;
  if (!remoteUrl) {
    throw new Error("fal.ai yanıtında görsel URL'i bulunamadı");
  }

  const imgRes = await fetch(remoteUrl);
  if (!imgRes.ok) throw new Error("İşlenmiş görsel indirilemedi");
  const outBuf = Buffer.from(await imgRes.arrayBuffer());

  // photos klasörü altına /processed alt klasörüne yaz
  const photosAbs = subdirFor(tenantId, projectId, "PRODUCT_IMAGE");
  const procDir = path.join(photosAbs, "processed");
  await mkdir(procDir, { recursive: true });
  const fileName = `bg_${Date.now()}_${randomUUID().slice(0, 8)}.png`;
  const absOut = path.join(procDir, fileName);
  await writeFile(absOut, outBuf);

  return {
    relPath: path.relative(CATALOG_STORAGE_ROOT, absOut),
    absPath: absOut,
    bytes: outBuf.length,
  };
}

// ─── Lifestyle presetleri ───────────────────────────────────
//
// Her preset için:
//   - background: SVG kaynağı (Sharp ile rasterleştirilir)
//   - bgColor: yedek tek-renk
//   - shadow: ürün altında yumuşak gölge çiz
//
// Boyut: 1080×1080 (sosyal medya odaklı). Kullanıcı sonra sosyal post
// üretirken bu görseli direkt kullanabilir.

const LIFESTYLE_SIZE = 1080;

export type LifestylePreset =
  | "white"
  | "soft-gray"
  | "warm-cream"
  | "marble"
  | "wood"
  | "sunset"
  | "studio-blue"
  | "rose-gold";

const LIFESTYLE_BACKGROUNDS: Record<LifestylePreset, string> = {
  white: `<svg xmlns="http://www.w3.org/2000/svg" width="${LIFESTYLE_SIZE}" height="${LIFESTYLE_SIZE}"><rect width="100%" height="100%" fill="#ffffff"/></svg>`,
  "soft-gray": `<svg xmlns="http://www.w3.org/2000/svg" width="${LIFESTYLE_SIZE}" height="${LIFESTYLE_SIZE}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f1f5f9"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  "warm-cream": `<svg xmlns="http://www.w3.org/2000/svg" width="${LIFESTYLE_SIZE}" height="${LIFESTYLE_SIZE}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fdf6e3"/><stop offset="100%" stop-color="#e8d8b0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  marble: `<svg xmlns="http://www.w3.org/2000/svg" width="${LIFESTYLE_SIZE}" height="${LIFESTYLE_SIZE}"><defs><filter id="t"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.92  0 0 0 0 0.92  0 0 0 0 0.94  0 0 0 0.4 0.6"/></filter></defs><rect width="100%" height="100%" fill="#f8f8f6"/><rect width="100%" height="100%" filter="url(#t)" opacity="0.6"/></svg>`,
  wood: `<svg xmlns="http://www.w3.org/2000/svg" width="${LIFESTYLE_SIZE}" height="${LIFESTYLE_SIZE}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#a47148"/><stop offset="50%" stop-color="#7a4f2c"/><stop offset="100%" stop-color="#5e3a1d"/></linearGradient><filter id="t"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.04" numOctaves="2" seed="12"/><feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.18  0 0 0 0 0.08  0 0 0 0.5 0"/></filter></defs><rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" filter="url(#t)" opacity="0.7"/></svg>`,
  sunset: `<svg xmlns="http://www.w3.org/2000/svg" width="${LIFESTYLE_SIZE}" height="${LIFESTYLE_SIZE}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fde0c4"/><stop offset="50%" stop-color="#f8a978"/><stop offset="100%" stop-color="#c25b5b"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  "studio-blue": `<svg xmlns="http://www.w3.org/2000/svg" width="${LIFESTYLE_SIZE}" height="${LIFESTYLE_SIZE}"><defs><radialGradient id="g" cx="50%" cy="40%" r="70%"><stop offset="0%" stop-color="#7fb1d6"/><stop offset="100%" stop-color="#22324a"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  "rose-gold": `<svg xmlns="http://www.w3.org/2000/svg" width="${LIFESTYLE_SIZE}" height="${LIFESTYLE_SIZE}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f6d6c1"/><stop offset="100%" stop-color="#b76e79"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
};

export const LIFESTYLE_PRESETS: { id: LifestylePreset; label: string; description: string }[] = [
  { id: "white", label: "Stüdyo Beyaz", description: "Düz beyaz zemin" },
  { id: "soft-gray", label: "Yumuşak Gri", description: "Üstten alta açık-koyu gri" },
  { id: "warm-cream", label: "Sıcak Krem", description: "Krem-sarı yumuşak gradient" },
  { id: "marble", label: "Mermer", description: "Doğal mermer dokusu" },
  { id: "wood", label: "Ahşap", description: "Sıcak kahverengi ahşap" },
  { id: "sunset", label: "Gün Batımı", description: "Sıcak turuncu-kırmızı gradient" },
  { id: "studio-blue", label: "Stüdyo Mavi", description: "Profesyonel ürün stüdyosu" },
  { id: "rose-gold", label: "Gül Altın", description: "Şık premium pembe-altın" },
];

/**
 * Arka planı temizlenmiş bir PNG'yi alıp lifestyle preset üzerine yerleştirir.
 * Ürün otomatik olarak ortalanır + altında yumuşak gölge oluşturulur.
 *
 * Input: BG removed PNG (transparan); preset bg üzerine compose edilir.
 * Output: 1080×1080 JPG (ürünü merkeze koyup boşluk bırakır).
 */
export async function composeLifestyle(
  tenantId: string,
  projectId: string,
  productPngAbsPath: string,
  preset: LifestylePreset
): Promise<{ relPath: string; absPath: string; bytes: number; preset: LifestylePreset }> {
  const bgSvg = LIFESTYLE_BACKGROUNDS[preset];
  if (!bgSvg) throw new Error(`Geçersiz lifestyle preset: ${preset}`);

  const bgBuf = await sharp(Buffer.from(bgSvg)).jpeg({ quality: 92 }).toBuffer();

  // Ürünü canvas'ın %72'sini kaplayacak şekilde resize et + gölge için
  // soft alpha-blur kopyası hazırla.
  const targetSize = Math.round(LIFESTYLE_SIZE * 0.72);
  const product = await sharp(productPngAbsPath)
    .resize({ width: targetSize, height: targetSize, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();

  const productMeta = await sharp(product).metadata();
  const pw = productMeta.width || targetSize;
  const ph = productMeta.height || targetSize;

  // Yumuşak gölge: alpha kanalını alıp blur, koyu rengin üstüne basacak şekilde compose et
  const shadow = await sharp(product)
    .extractChannel("alpha")
    .blur(28)
    .toBuffer();

  const shadowOnDark = await sharp({
    create: {
      width: pw,
      height: ph,
      channels: 4,
      background: { r: 20, g: 20, b: 20, alpha: 0.55 },
    },
  })
    .composite([{ input: shadow, blend: "dest-in" }])
    .png()
    .toBuffer();

  // Compose: bg + shadow (offset altta) + product
  const offsetX = Math.round((LIFESTYLE_SIZE - pw) / 2);
  const offsetY = Math.round((LIFESTYLE_SIZE - ph) / 2);
  const shadowOffsetY = offsetY + Math.round(ph * 0.04); // 4% aşağı

  const composed = await sharp(bgBuf)
    .composite([
      { input: shadowOnDark, top: shadowOffsetY, left: offsetX, blend: "multiply" },
      { input: product, top: offsetY, left: offsetX },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();

  const photosAbs = subdirFor(tenantId, projectId, "PRODUCT_IMAGE");
  const lifeDir = path.join(photosAbs, "lifestyle");
  await mkdir(lifeDir, { recursive: true });
  const fileName = `life_${preset}_${Date.now()}_${randomUUID().slice(0, 8)}.jpg`;
  const absOut = path.join(lifeDir, fileName);
  await writeFile(absOut, composed);

  return {
    relPath: path.relative(CATALOG_STORAGE_ROOT, absOut),
    absPath: absOut,
    bytes: composed.length,
    preset,
  };
}
