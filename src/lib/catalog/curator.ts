/**
 * AI Curator — Excel/PDF'den çıkartılmış ürünleri kullanıcı isteğine göre
 * filtrele, sırala, sahte adları flag et.
 *
 * userPrompt'taki ifadeleri Claude'a yorumlatır:
 *   - "9 ürün koy"        → en fazla 9 ürün seç
 *   - "kategori X olanlar" → o kategori filtresi
 *   - "fiyata göre sırala" → ordering
 *   - "protokol formatı"   → renderHint döndür (template hint)
 *
 * Pipeline analyze'ın sonunda, persist'ten önce çağrılır.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedProduct } from "@/lib/services/CatalogService";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface CuratorInput {
  products: ExtractedProduct[];
  userPrompt: string;
  outputType?: string; // PDF_CATALOG | PRICE_LIST | SOCIAL_POST | ...
  language?: string;
}

export interface CuratorReport {
  /** Final ürün listesi — pipeline bunu DB'ye yazar */
  selectedCodes: string[];
  /** Sıralama istendiyse final order, yoksa selectedCodes ile aynı */
  orderedCodes: string[];
  /** Ürün adı şüpheli görülen kayıtlar */
  fakeNameCodes: string[];
  /** Kullanıcıya gösterilecek özet */
  notes: string;
  /** Render aşaması için ipucu (örn. "protocol-table", "grid-3col") */
  renderHint?: string;
  /** Hata/uyarılar */
  warnings: string[];
}

const CURATOR_SYSTEM = `Sen bir ürün katalog editörüsün. Görevin: Excel/PDF'den çıkartılmış ürünleri kullanıcının isteğine göre seçmek, sıralamak ve kalite kontrol etmek. Yanıtını SADECE geçerli JSON olarak ver, başka açıklama yazma.`;

/**
 * Ürünleri Claude curator'a gönder, filtered+ordered listeyi al.
 * Çok ürün varsa (>200) curator çağrılmaz — büyük katalogların filtreleme
 * ihtiyacı varsa kullanıcı zaten sayı sınırı koymuştur.
 */
export async function runCurator(input: CuratorInput): Promise<CuratorReport> {
  const { products, userPrompt, outputType = "PDF_CATALOG" } = input;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY ayarlanmamış");
  }
  if (products.length === 0) {
    return {
      selectedCodes: [],
      orderedCodes: [],
      fakeNameCodes: [],
      notes: "Ürün yok.",
      warnings: [],
    };
  }

  // Token tasarrufu: her ürünü kompakt forma indirge
  const compact = products.map((p, i) => ({
    code: p.product_code || `ROW-${i + 1}`,
    name: p.name,
    description: p.description?.slice(0, 200) || null,
    category: p.category || null,
    price: (p as any)._price ?? null,
    currency: (p as any)._currency ?? null,
    extra: (p as any)._extra ?? null,
  }));

  const prompt = `KULLANICI İSTEĞİ:
"""
${userPrompt.trim()}
"""

HEDEF ÇIKTI: ${outputType}

ÜRÜNLER (toplam ${products.length} adet):
${JSON.stringify(compact, null, 2)}

GÖREV:
1. Kullanıcı belirli sayıda ürün istediyse (örn. "9 ürün", "ilk 10 tanesi", "öne çıkan 5"), o sayıya filtrele. Hangi ürünleri seçeceğini kullanıcının kriterine göre belirle (yoksa: en bilgi-zengin olanlar — adı dolu, açıklaması olan, fiyatı net).
2. Kullanıcı kriter belirttiyse (kategori, marka, fiyat aralığı, durum, vb.) uygula.
3. Sıralama isteği varsa (alfabetik, fiyat artan/azalan, kategori bazlı) uygula. Yoksa orijinal sıra kalsın.
4. Ürün adı şüpheli mi? Şüphelidir eğer:
   - Tüm satırlarda 2-3 farklı değer tekrar ediyorsa (örn. "ÜRETİMİ BİTECEK", "YENİ ÜRÜN"),
   - Genel bir durum/etiket gibi okunuyorsa,
   - SKU/kod ile aynı veya çok benzerse.
   Bu kayıtların kodlarını "fakeNameCodes" listesine ekle.
5. Format ipucu: kullanıcı "protokol", "tablo", "kart", "grid" gibi format istediyse renderHint olarak ver. Yoksa null.
6. Türkçe 1-2 cümlelik özet yaz: kaç ürün seçildi, neye göre sıralandı, dikkat çeken bir şey var mı.

YANIT FORMATI (sadece JSON, başka şey yazma):

{
  "selectedCodes": ["code1", "code2", ...],
  "orderedCodes": ["code1", "code2", ...],
  "fakeNameCodes": ["codeX", ...],
  "renderHint": "protocol-table" | "grid-3col" | null,
  "notes": "1-2 cümle özet",
  "warnings": ["uyarı 1", ...]
}

ÖNEMLI: selectedCodes ve orderedCodes alanlarındaki kod değerleri, yukarıdaki ürün listesindeki "code" alanıyla TAM eşleşmeli. Uydurma kod yazma.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    system: CURATOR_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b: any) => b.text)
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Curator yanıtı çözümlenemedi");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const validCodes = new Set(compact.map((c) => c.code));

  // Doğrula: Claude uydurma kod ürettiyse temizle
  const cleanCodes = (arr: any): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (c) => typeof c === "string" && validCodes.has(c)
    );
  };

  let selected = cleanCodes(parsed.selectedCodes);
  let ordered = cleanCodes(parsed.orderedCodes);
  const fakes = cleanCodes(parsed.fakeNameCodes);

  // Selected boşsa fallback: tüm ürünler (yani filtreleme istenmemişti)
  if (selected.length === 0) {
    selected = compact.map((c) => c.code);
  }
  if (ordered.length === 0) {
    ordered = selected;
  }

  // ordered, selected'ın superset'i olabilir — selected'ı korur sırası ordered'dan
  const orderedSet = new Set(ordered);
  const finalOrdered = [
    ...ordered.filter((c) => selected.includes(c)),
    ...selected.filter((c) => !orderedSet.has(c)), // ordered'da olmayan selected'lar sona
  ];

  return {
    selectedCodes: selected,
    orderedCodes: finalOrdered,
    fakeNameCodes: fakes,
    renderHint:
      typeof parsed.renderHint === "string" && parsed.renderHint.trim()
        ? parsed.renderHint.trim()
        : undefined,
    notes: typeof parsed.notes === "string" ? parsed.notes : "",
    warnings: Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((w: any) => typeof w === "string")
      : [],
  };
}
