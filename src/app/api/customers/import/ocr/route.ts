import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Bu resimde müşteri kayıt bilgileri bulunuyor. Lütfen resimdeki tüm kişi bilgilerini çıkar.

Her kişi için JSON formatında şu bilgileri ver:
- name: Ad Soyad
- phone: Telefon numarası
- email: E-posta adresi (varsa)
- notes: Ek notlar (varsa)

Yanıtını sadece JSON array olarak ver, başka metin ekleme. Örnek:
[{"name": "Ahmet Yılmaz", "phone": "05321234567", "email": "", "notes": "Botoks müşterisi"}]

Eğer bilgi okunamıyorsa boş array [] döndür.`,
            },
          ],
        },
      ],
    });

    let customers: Array<{ name: string; phone: string; email: string; notes: string }> = [];

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        customers = JSON.parse(jsonMatch[0]);
      }
    } catch {
      customers = [];
    }

    return NextResponse.json({ customers });
  } catch (error) {
    return NextResponse.json(
      { error: "OCR işlemi sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
