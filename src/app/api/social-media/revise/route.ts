import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { content, feedback, platform } = await req.json();

    if (!content || !feedback) {
      return NextResponse.json({ error: "İçerik ve düzenleme talebi gerekli" }, { status: 400 });
    }

    const charLimit = platform === "twitter" ? 280 : platform === "instagram" ? 2200 : 5000;

    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Aşağıdaki sosyal medya paylaşım metnini, verilen düzenleme talebine göre düzelt.

Mevcut metin:
"""
${content}
"""

Düzenleme talebi: ${feedback}

Kurallar:
- Türkçe yaz
- Platform: ${platform || "genel"}
- Maksimum ${charLimit} karakter
- Sadece düzeltilmiş metni döndür, başka açıklama yapma
- Düzenleme talebindeki yönergelere kesinlikle uy`,
        },
      ],
    });

    const revisedContent = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ content: revisedContent });
  } catch (error) {
    console.error("Revise content error:", error);
    return NextResponse.json({ error: "İçerik düzeltilemedi" }, { status: 500 });
  }
}
