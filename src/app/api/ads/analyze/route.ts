import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { TOKEN_COSTS } from "@/lib/token-costs";
import { checkBalance, deductTokens } from "@/lib/token-service";

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
      const hasBalance = await checkBalance(clinicId, TOKEN_COSTS.ADS_ANALYSIS);
      if (!hasBalance) {
        return NextResponse.json(
          { error: "Token bakiyeniz yetersiz." },
          { status: 402 }
        );
      }
    }

    const { campaigns, insights, dateRange } = await req.json();

    const prompt = `Sen bir dijital pazarlama uzmanısın. Aşağıdaki Meta (Facebook/Instagram) reklam verilerini analiz et ve Türkçe öneriler sun.

Tarih Aralığı: ${dateRange || "Son 30 gün"}

Kampanya Verileri:
${JSON.stringify(campaigns, null, 2)}

Performans Verileri:
${JSON.stringify(insights, null, 2)}

Lütfen şu başlıklar altında analiz yap:
1. **CPC (Tıklama Başı Maliyet) Değerlendirmesi** — Yüksek/düşük mü? Sektör ortalamasıyla karşılaştır.
2. **CTR (Tıklama Oranı) Değerlendirmesi** — Hangi kampanya iyi, hangisi kötü?
3. **En Verimli Kampanya** — Hangisi en iyi ROI sağlıyor?
4. **Bütçe Optimizasyonu** — Hangi kampanyaya daha fazla bütçe ayrılmalı?
5. **Hedef Kitle Önerisi** — Daha iyi hedefleme için öneriler.
6. **Görsel/Metin Değişiklik Önerisi** — Reklam içeriği nasıl iyileştirilir?

Kısa, net ve uygulanabilir öneriler ver. Veriler yoksa veya yetersizse bunu belirt.`;

    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    if (!isDemo) {
      await deductTokens(clinicId, "ADS_ANALYSIS", TOKEN_COSTS.ADS_ANALYSIS);
    }

    return NextResponse.json({ analysis: text });
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json({ error: "AI analiz hatası" }, { status: 500 });
  }
}
