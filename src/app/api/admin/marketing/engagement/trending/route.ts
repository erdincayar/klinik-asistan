import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchTweets } from "@/lib/x-api";
import Anthropic from "@anthropic-ai/sdk";

// GET — fetch trending/relevant topics and suggest tweets
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  // Since we don't have access to v1.1 trends API, search popular hashtags
  const queries = [
    "#dijitalleşme OR #dijitaldönüşüm",
    "#işletmeyönetimi OR #KOBİ",
    "#yapayZeka OR #AI lang:tr",
    "#girişimcilik OR #startup lang:tr",
    "#teknoloji lang:tr",
  ];

  const topics: Array<{
    query: string;
    tweets: Array<{ id: string; text: string; author_id: string; metrics: any }>;
  }> = [];

  for (const q of queries) {
    try {
      const tweets = await searchTweets(q, 5);
      if (tweets.length > 0) {
        topics.push({
          query: q,
          tweets: tweets.map(t => ({
            id: t.id,
            text: t.text,
            author_id: t.author_id,
            metrics: t.public_metrics,
          })),
        });
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ topics });
}

// POST — generate tweet suggestion for a trending topic
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { topic, sampleTweets } = await req.json();
  if (!topic) return NextResponse.json({ error: "Topic gerekli" }, { status: 400 });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `Sen Poby.ai'ın @pobyai X hesabısın. Trending bir konuya tweet yazacaksın.

KURALLAR:
- Max 280 karakter, Türkçe
- Konuya değer katan, bilgi veren tweet
- Poby.ai ile bağlantı kurabilirsin ama zorla değil
- Doğal, samimi ton
- Uygun hashtag'ler ekle

JSON döndür: {"tweet": "...", "reason": "neden bu konuya girmeliyiz (Türkçe, 1 cümle)"}`,
    messages: [{
      role: "user",
      content: `Konu: ${topic}\n${sampleTweets ? `Örnek tweetler:\n${sampleTweets.slice(0, 500)}` : ""}`,
    }],
  });

  const text = (response.content[0] as any).text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: "Öneri oluşturulamadı" }, { status: 500 });

  return NextResponse.json(JSON.parse(jsonMatch[0]));
}
