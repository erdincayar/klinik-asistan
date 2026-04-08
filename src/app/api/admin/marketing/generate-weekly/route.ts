import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { sendTelegramMessage } from "@/lib/telegram/bot";

// Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET || "";
const ADMIN_TELEGRAM_CHAT_ID = process.env.TELEGRAM_AUTHORIZED_CHATS?.split(",")?.[0]?.split(":")?.[0] || "";

// Content generation rules
const CONTENT_RULES = `
SEN: Poby.ai'ın resmi X (Twitter) hesabı @pobyai. "Biz" dili kullan.
ÜRÜN: Poby.ai — işletmeler için AI destekli yönetim platformu.
- Randevu yönetimi, finans takibi (gelir/gider/KDV), stok yönetimi, müşteri CRM, çalışan yönetimi, WhatsApp entegrasyonu, AI asistan
- Fiyat: ₺499/ay + 7 gün ücretsiz deneme
- Web: poby.ai | Kayıt: poby.ai/register
- Hedef: Klinik, restoran, kuaför, güzellik merkezi, distribütör, otel gibi işletmeler

YASAK:
- "Küçük işletme" ifadesi KESİNLİKLE kullanılmayacak
- Rakip isimleri geçmeyecek
- Aşırı emoji kullanılmayacak (max 2-3 per tweet)
- Boş vaatler yapılmayacak

TWEET KURALLARI:
- Her tweet Türkçe ve max 280 karakter
- Doğal, samimi, profesyonel ton
- CTA olarak poby.ai veya poby.ai/register
- Hashtag'ler: #işletmeyönetimi #dijitalleşme #pobyai
- Thread'ler eğitici/bilgilendirici olsun
`;

export async function POST(req: Request) {
  try {
    // Auth: either cron secret or admin session
    const authHeader = req.headers.get("authorization");
    const isCron = authHeader === `Bearer ${CRON_SECRET}` && CRON_SECRET;

    if (!isCron) {
      // Check admin session
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const role = (session.user as any).role;
      if (role !== "ADMIN" && role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
      }
    }

    // Find the clinic (use first admin's clinic for cron)
    const adminUser = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] }, clinicId: { not: null } },
      select: { clinicId: true },
    });
    if (!adminUser?.clinicId) return NextResponse.json({ error: "Clinic not found" }, { status: 400 });
    const clinicId = adminUser.clinicId;

    // Calculate next week dates (Monday to Sunday)
    const now = new Date();
    const nextMonday = new Date(now);
    const dayOfWeek = now.getDay();
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    nextMonday.setDate(now.getDate() + daysUntilNextMonday);
    nextMonday.setHours(0, 0, 0, 0);

    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(nextMonday);
      d.setDate(nextMonday.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    // Get strategy settings
    const strategy = await prisma.tweetStrategy.findUnique({ where: { clinicId } });
    const tweetsPerDay = strategy?.tweetsPerDay || 2;
    const postTimes: string[] = strategy?.postTimes ? JSON.parse(strategy.postTimes) : ["09:00", "17:00"];
    const contentMix = strategy?.contentMix ? JSON.parse(strategy.contentMix) : {};
    const focusFeatures: string[] = strategy?.focusFeatures ? JSON.parse(strategy.focusFeatures) : [];
    const videoRhythm = strategy?.videoRhythm || "evening";
    const videoScenarios: string[] = strategy?.videoScenarios ? JSON.parse(strategy.videoScenarios) : [];
    const toneStyle = strategy?.toneStyle || "samimi-profesyonel";
    const hashtagStrategy = strategy?.hashtagStrategy || "#pobyai #işletmeyönetimi #dijitalleşme";
    const avoidTopics = strategy?.avoidTopics || "";

    const totalWeeklyContent = tweetsPerDay * 7;

    const strategyContext = `
STRATEJI AYARLARI:
- Günde ${tweetsPerDay} tweet, saatler: ${postTimes.join(", ")} (Europe/Istanbul)
- Ton: ${toneStyle}
- Öne çıkarılacak özellikler: ${focusFeatures.join(", ") || "genel"}
- Hashtag'ler: ${hashtagStrategy}
- Video ritmi: ${videoRhythm === "evening" ? "Akşam video/görsel içerik" : videoRhythm === "morning" ? "Sabah video/görsel içerik" : videoRhythm === "both" ? "Sabah ve akşam video" : "Video yok"}
- Video senaryoları: ${videoScenarios.join(", ") || "belirtilmedi"}
${avoidTopics ? `- KAÇINILACAK: ${avoidTopics}` : ""}
${Object.keys(contentMix).length > 0 ? `- İçerik karışımı: ${Object.entries(contentMix).map(([k, v]) => `${k} %${v}`).join(", ")}` : ""}
`;

    // Get past performance data for context
    const pastPosts = await prisma.scheduledPost.findMany({
      where: {
        clinicId,
        status: "POSTED",
        likes: { not: null },
      },
      orderBy: { likes: "desc" },
      take: 10,
      select: { content: true, type: true, likes: true, retweets: true, replies: true, impressions: true },
    });

    const performanceContext = pastPosts.length > 0
      ? `\n\nGEÇMİŞ PERFORMANS (en iyi içerikler):\n${pastPosts.map(p => `- "${p.content?.slice(0, 80)}..." → ${p.likes} like, ${p.retweets} RT, ${p.impressions} gösterim`).join("\n")}\nBu tarz içeriklere benzer üret.`
      : "";

    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: `${CONTENT_RULES}${strategyContext}${performanceContext}

Gelecek hafta (${weekDates[0]} — ${weekDates[6]}) için toplam ${totalWeeklyContent} içerik üret.

İçerik planı kuralları:
- Günde ${tweetsPerDay} içerik, saatler: ${postTimes.join(", ")} (Europe/Istanbul)
- Haftada en az 2 THREAD (5-7 tweet, eğitici/bilgilendirici)
- Haftada en az 1 ANKET (poll formatında)
- Geri kalanı tek tweet
- ${videoRhythm !== "none" ? `${videoRhythm === "evening" ? "Akşam saatlerinde" : videoRhythm === "morning" ? "Sabah saatlerinde" : "Hem sabah hem akşam"} video/görsel önerisi ekle. Video senaryoları: ${videoScenarios.join(", ")}` : "Video önerme"}
- Sabah metin ağırlıklı (bilgi, ipucu, thread), akşam görsel/video ağırlıklı (etkileyici, CTA)
- Öne çıkar: ${focusFeatures.join(", ") || "tüm özellikler"}
- Hafta sonu daha rahat ton, hafta içi profesyonel

Her içerik için MUTLAKA medya önerisi ekle:
- mediaSuggestion: "image" | "video" | "none"
- mediaSuggestionReason: neden bu medya türü öneriliyor (Türkçe, 1 cümle)

Kurallar:
- Thread'lerin ilk tweet'ine görsel öner (konuya dikkat çekmek için)
- İstatistik/veri paylaşımları için infografik görsel öner
- Motivasyon/ilham tweet'leri için görsel öner
- CTA tweet'leri için görsel öner (ürün ekran görüntüsü vs.)
- Anket tweet'lerinde genelde metin yeterli
- Kısa ipucu tweet'lerinde metin yeterli olabilir

JSON array olarak döndür:
[
  {"type": "tweet"|"thread"|"poll", "content": "ana metin", "threadContent": ["tweet1", "tweet2", ...] (sadece thread için), "pollOptions": ["seçenek1", "seçenek2"] (sadece poll için), "scheduledAt": "YYYY-MM-DDTHH:mm:00", "occasion": "kısa açıklama", "mediaSuggestion": "image"|"video"|"none", "mediaSuggestionReason": "sebep"}
]

Thread'lerin content alanı ilk tweet'i içersin. threadContent tüm tweet'leri (ilk dahil) içersin.
Sadece JSON array döndür, başka açıklama yapma.`,
      }],
    });

    const text = (response.content[0] as any).text;
    let contents: Array<{
      type: string;
      content: string;
      threadContent?: string[];
      pollOptions?: string[];
      scheduledAt: string;
      occasion: string;
      mediaSuggestion?: string;
      mediaSuggestionReason?: string;
    }>;

    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      contents = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      return NextResponse.json({ error: "AI yanıtı parse edilemedi" }, { status: 500 });
    }

    // Filter out any content with "küçük işletme"
    contents = contents.filter(c => {
      const allText = [c.content, ...(c.threadContent || [])].join(" ").toLowerCase();
      return !allText.includes("küçük işletme");
    });

    let created = 0;
    for (const item of contents) {
      // Convert Istanbul time to UTC for storage
      const istanbulDate = new Date(item.scheduledAt + "+03:00");

      await prisma.scheduledPost.create({
        data: {
          clinicId,
          type: item.type === "poll" ? "tweet" : item.type,
          platform: "twitter",
          content: item.type === "poll"
            ? `${item.content}\n\n${(item.pollOptions || []).map((o, i) => `${["🅰️", "🅱️", "🅲️", "🅳️"][i]} ${o}`).join("\n")}`
            : item.content,
          threadContent: item.threadContent ? JSON.stringify(item.threadContent) : null,
          scheduledAt: istanbulDate,
          status: "DRAFT",
          occasion: item.occasion || null,
          mediaSuggestion: item.mediaSuggestion || null,
          mediaSuggestionReason: item.mediaSuggestionReason || null,
          isAutoGenerated: true,
        },
      });
      created++;
    }

    // Send Telegram notification
    if (ADMIN_TELEGRAM_CHAT_ID) {
      await sendTelegramMessage({
        chat_id: ADMIN_TELEGRAM_CHAT_ID,
        text: `📋 Gelecek haftanın içerikleri hazır!\n\n${created} içerik oluşturuldu (${weekDates[0]} — ${weekDates[6]})\n\n🔗 Content Studio'dan kontrol et:\nhttps://poby.ai/admin/marketing`,
      });
    }

    return NextResponse.json({ success: true, created, week: `${weekDates[0]} — ${weekDates[6]}` });
  } catch (error) {
    console.error("Weekly generate error:", error);
    return NextResponse.json({ error: "Haftalık içerik üretimi başarısız" }, { status: 500 });
  }
}
