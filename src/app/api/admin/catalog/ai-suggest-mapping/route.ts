import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin } from "@/lib/catalog/auth";

// POST /api/admin/catalog/ai-suggest-mapping
//
// Body: { columns: string[], sampleRows: Record<string, any>[] }
// Yanıt: { mappings: Record<string, "name"|"description"|"category"|"brand"|"sku"|"price"|"currency"|"imageUrl"|`_extra:${string}`|""> ,
//          notes: string,
//          warnings: string[] }
//
// Wizard'ın "Veri Eşleme" adımı bu endpoint'i çağırır. Heuristik + insan
// keşfine güvenmek yerine Claude'a kolon başlıkları + ilk birkaç satır
// verip "bu hangi alana karşılık geliyor?" diye sorar.

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const VALID_KEYS = new Set([
  "name",
  "description",
  "category",
  "brand",
  "sku",
  "price",
  "currency",
  "imageUrl",
  "",
]);

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY ayarlanmamış" },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const columns: string[] = Array.isArray(body?.columns) ? body.columns : [];
  const sampleRows: Record<string, any>[] = Array.isArray(body?.sampleRows)
    ? body.sampleRows.slice(0, 5)
    : [];

  if (columns.length === 0) {
    return NextResponse.json({ error: "columns gerekli" }, { status: 400 });
  }
  if (columns.length > 60) {
    return NextResponse.json(
      { error: "Çok fazla kolon (max 60)" },
      { status: 400 }
    );
  }

  // Örnek satırları her kolon için temizle/kısalt (token tasarrufu)
  const trimmedRows = sampleRows.map((row) => {
    const out: Record<string, any> = {};
    for (const col of columns) {
      const v = row[col];
      if (v === null || v === undefined) {
        out[col] = null;
      } else {
        const s = String(v);
        out[col] = s.length > 80 ? s.slice(0, 80) + "…" : s;
      }
    }
    return out;
  });

  const prompt = `Sen bir ürün kataloğu veri eşleme asistanısın. Kullanıcının yüklediği Excel/CSV dosyasındaki kolonların hangi standart alana karşılık geldiğini belirleyeceksin.

KOLONLAR:
${JSON.stringify(columns)}

İLK ${trimmedRows.length} ÖRNEK SATIR:
${JSON.stringify(trimmedRows, null, 2)}

GÖREV: Her kolon için aşağıdaki listeden EN UYGUN tek bir karşılığı seç. Hiçbiri uymuyorsa veya kolon ürün verisi değilse boş string ("") ver. Kullanıcının kendi tanımlayabileceği ek alanlar için "_extra:<TÜRKÇE_KISA_İSİM>" formatı kullan (örn. "_extra:durum", "_extra:miktar").

STANDART ALANLAR:
- "name"        → Ürün adı/başlığı (ÖNEMLİ: kategorik tekrarlayan değil; her satır farklı/spesifik)
- "description" → Ürün açıklaması, detayı
- "category"    → Kategori, grup, sınıf
- "brand"       → Marka adı, üretici
- "sku"         → Stok kodu, ürün kodu, barkod
- "price"       → Fiyat (sayısal)
- "currency"    → Para birimi (TRY, USD, EUR, ...)
- "imageUrl"    → Görsel URL'si veya dosya adı
- ""            → Hiçbir karşılık yok (atla)
- "_extra:xxx"  → Yukarıdakilerden hiçbiri tutmuyorsa, kullanıcının özel alanı

KRİTİK KURALLAR:
1. "name" için kolonun değerleri ÇOK TEKRAR EDİYORSA (örn. tüm satırlarda 3-4 farklı değer varsa) bu büyük ihtimalle "category", "brand" veya "_extra:durum" gibi kategorik bir alandır — name OLAMAZ.
2. Bir kolon ürün için anlamlı değilse (boş, kullanıcının iç notu, ID-only) "" ver.
3. SKU genelde alfanumerik kısa kod (örn. "JE001", "MK-2"); fiyat genelde ondalık sayı.
4. Türkçe başlıkları doğru anla: "Stok Kodu"=sku, "Stok Adı"/"Ürün İsmi"=name, "Liste Fiyatı"/"Birim Fiyat"=price, "Birim"=currency veya unit.

ÇIKTI: SADECE şu JSON formatında yanıtla, başka açıklama yazma:

{
  "mappings": { "<kolon adı>": "<key>", ... },
  "notes": "Genel değerlendirme — 1-2 cümle Türkçe",
  "warnings": ["uyarı 1", "uyarı 2", ...]
}

warnings: emin olamadığın veya kullanıcının kontrol etmesi gereken durumlar (örn. "Stok Adı kolonu boş görünüyor; gerçek ürün ismi başka yerde olabilir").
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    // Claude'un yanıtından JSON çıkar — markdown fence olabilir
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("ai-suggest-mapping: no JSON in response:", text.slice(0, 300));
      return NextResponse.json(
        { error: "AI yanıtı çözümlenemedi" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const rawMappings = parsed.mappings || {};

    // Doğrula: sadece bilinen key'lere veya "_extra:..." ile başlayanlara izin ver
    const cleanMappings: Record<string, string> = {};
    for (const col of columns) {
      const v = rawMappings[col];
      if (typeof v !== "string") {
        cleanMappings[col] = "";
        continue;
      }
      if (v.startsWith("_extra:") && v.length > "_extra:".length && v.length < 60) {
        cleanMappings[col] = v;
      } else if (VALID_KEYS.has(v)) {
        cleanMappings[col] = v;
      } else {
        cleanMappings[col] = "";
      }
    }

    return NextResponse.json({
      mappings: cleanMappings,
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    });
  } catch (err: any) {
    console.error("ai-suggest-mapping error:", err);
    return NextResponse.json(
      { error: err?.message || "AI öneri başarısız" },
      { status: 500 }
    );
  }
}
