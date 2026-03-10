import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { TOKEN_COSTS } from "@/lib/token-costs";
import { checkBalance, deductTokens } from "@/lib/token-service";

const EXTRACT_PROMPT = `Bu fotoğrafta ürünler veya ürün faturası/listesi görünüyor. Lütfen tespit ettiğin ürünleri JSON formatında çıkar:
{
  "products": [
    {
      "name": "Ürün adı",
      "brand": "Marka adı veya null",
      "category": "KOZMETIK|MEDIKAL|SARF_MALZEME|DIGER",
      "sku": "Varsa ürün kodu veya null",
      "purchasePrice": "Alış fiyatı (sayı) veya null",
      "currency": "TRY|USD|EUR"
    }
  ]
}
Sadece JSON döndür, başka açıklama yapma. Fiyat bilgisi yoksa purchasePrice null olsun. Para birimi belirlenemezse TRY kullan.`;

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getMediaType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const user = session.user as any;
    const clinicId = user.clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const isDemo = user.isDemo || user.role === "ADMIN";
    if (!isDemo) {
      const hasBalance = await checkBalance(clinicId, TOKEN_COSTS.PRODUCT_AI_EXTRACT);
      if (!hasBalance) {
        return NextResponse.json(
          { error: "Token bakiyeniz yetersiz. Ayarlar sayfasından token satın alabilirsiniz." },
          { status: 402 }
        );
      }
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }

    const mediaType = getMediaType(file.name);
    if (!SUPPORTED_IMAGE_TYPES.includes(mediaType)) {
      return NextResponse.json(
        { error: "Desteklenmeyen format. JPG, PNG veya WebP yükleyin." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    const anthropic = new Anthropic();
    const response = await Promise.race([
      anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType as "image/jpeg" | "image/png" | "image/webp",
                  data: base64,
                },
              },
              { type: "text", text: EXTRACT_PROMPT },
            ],
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("API timeout")), 90000)
      ),
    ]);

    const aiText =
      response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Ürün bilgisi okunamadı. Lütfen farklı bir fotoğraf deneyin." },
        { status: 422 }
      );
    }

    const extracted = JSON.parse(jsonMatch[0]);

    if (!isDemo) {
      await deductTokens(clinicId, "PRODUCT_AI_EXTRACT", TOKEN_COSTS.PRODUCT_AI_EXTRACT);
    }

    return NextResponse.json(extracted);
  } catch (error) {
    console.error("AI product extraction error:", error);
    const msg =
      error instanceof Error && error.message === "API timeout"
        ? "Zaman aşımı — tekrar deneyin."
        : "AI ürün tanıma başarısız oldu.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
