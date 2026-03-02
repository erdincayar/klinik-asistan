import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { campaigns } = await req.json();

    if (!campaigns || !Array.isArray(campaigns) || campaigns.length === 0) {
      return NextResponse.json({ error: "Kampanya verisi gerekli" }, { status: 400 });
    }

    const anthropic = new Anthropic();

    const campaignSummary = campaigns
      .map(
        (c: { campaignName: string; impressions: number; clicks: number; spend: number; conversions: number; cpc: number; ctr: number }) =>
          `- ${c.campaignName}: ${c.impressions} gösterim, ${c.clicks} tıklama, ₺${c.spend.toFixed(2)} harcama, ${c.conversions} dönüşüm, CPC: ₺${c.cpc?.toFixed(2)}, CTR: %${c.ctr?.toFixed(2)}`
      )
      .join("\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Aşağıdaki reklam kampanyalarını analiz et ve Türkçe öneriler ver. Kısa ve öz ol, madde madde yaz.

Kampanyalar:
${campaignSummary}

Analiz et:
1. En iyi performans gösteren kampanya hangisi ve neden?
2. Hangi kampanya iyileştirme gerektirir?
3. Bütçe optimizasyonu için 2-3 öneri ver
4. Genel performans değerlendirmesi (1 cümle)`,
        },
      ],
    });

    const analysis = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Campaign analysis error:", error);
    return NextResponse.json({ error: "Analiz yapılamadı" }, { status: 500 });
  }
}
