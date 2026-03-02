import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { occasion, businessName, platform } = await req.json();

    if (!occasion) {
      return NextResponse.json({ error: "Özel gün gerekli" }, { status: 400 });
    }

    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `${businessName || "İşletmemiz"} için ${occasion} kutlama metni yaz. ${platform === "instagram" ? "Instagram" : "Facebook"} paylaşımı için uygun olsun.

Kurallar:
- Türkçe yaz
- 2-3 cümle olsun
- Samimi ve profesyonel bir ton kullan
- Emoji kullan (2-3 tane)
- Hashtag ekle (3-4 tane)
- İşletme adını metne dahil et

Sadece paylaşım metnini döndür, başka açıklama yapma.`,
        },
      ],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Generate content error:", error);
    return NextResponse.json({ error: "İçerik oluşturulamadı" }, { status: 500 });
  }
}
