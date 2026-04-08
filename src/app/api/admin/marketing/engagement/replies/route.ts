import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserTweets, postReply } from "@/lib/x-api";
import Anthropic from "@anthropic-ai/sdk";

// GET — list reply suggestions
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  const clinicId = (session.user as any).clinicId;

  const replies = await prisma.engagementReply.findMany({
    where: { clinicId },
    include: { targetAccount: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ replies });
}

// POST — generate reply suggestions for target accounts
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  const clinicId = (session.user as any).clinicId;

  const { targetId } = await req.json();

  // Get target account(s)
  const targets = targetId
    ? await prisma.targetAccount.findMany({ where: { id: targetId, clinicId, isActive: true } })
    : await prisma.targetAccount.findMany({ where: { clinicId, isActive: true } });

  if (targets.length === 0) return NextResponse.json({ error: "Hedef hesap bulunamadı" }, { status: 404 });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let generated = 0;

  for (const target of targets) {
    if (!target.xUserId) continue;

    // Fetch recent tweets
    const tweets = await getUserTweets(target.xUserId, 5);
    if (tweets.length === 0) continue;

    // Check which tweets we already have suggestions for
    const existingTweetIds = (await prisma.engagementReply.findMany({
      where: { clinicId, sourceTweetId: { in: tweets.map(t => t.id) } },
      select: { sourceTweetId: true },
    })).map(r => r.sourceTweetId);

    const newTweets = tweets.filter(t => !existingTweetIds.includes(t.id));
    if (newTweets.length === 0) continue;

    // Generate reply suggestions with AI
    const tweetList = newTweets.map((t, i) => `${i + 1}. @${target.username}: "${t.text}" (ID: ${t.id})`).join("\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `Sen Poby.ai'ın X (Twitter) hesabı @pobyai olarak reply yazıyorsun.

KURALLAR:
- Değer katan, samimi, profesyonel reply'lar yaz
- Kendini tanıt ama spam yapma — doğal ol
- İşletme yönetimi, dijitalleşme konularında uzmanlık göster
- Poby.ai'dan bahsetme şartı yok, gerekirse bahset
- Her reply max 280 karakter
- Türkçe yaz
- Soru sorarak etkileşim kur
- Boş övgü yapma, içerik ekle

Her tweet için bir reply öner. JSON array döndür:
[{"tweetId": "...", "reply": "..."}]
Sadece JSON, başka bir şey yazma.`,
      messages: [{ role: "user", content: `Bu tweetlere reply öner:\n${tweetList}` }],
    });

    const text = (response.content[0] as any).text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) continue;

    try {
      const suggestions: Array<{ tweetId: string; reply: string }> = JSON.parse(jsonMatch[0]);

      for (const s of suggestions) {
        const tweet = newTweets.find(t => t.id === s.tweetId);
        if (!tweet) continue;

        await prisma.engagementReply.create({
          data: {
            clinicId,
            targetAccountId: target.id,
            sourceTweetId: s.tweetId,
            sourceTweetText: tweet.text,
            sourceAuthor: target.username,
            suggestedReply: s.reply,
            status: "PENDING",
          },
        });
        generated++;
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ success: true, generated });
}

// PATCH — approve & send a reply, or reject it
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  const clinicId = (session.user as any).clinicId;

  const { id, action, editedReply } = await req.json();
  if (!id || !action) return NextResponse.json({ error: "id ve action gerekli" }, { status: 400 });

  const reply = await prisma.engagementReply.findFirst({
    where: { id, clinicId },
  });
  if (!reply) return NextResponse.json({ error: "Reply bulunamadı" }, { status: 404 });

  if (action === "reject") {
    await prisma.engagementReply.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "approve") {
    const replyText = editedReply || reply.suggestedReply;

    try {
      const result = await postReply(replyText, reply.sourceTweetId);
      await prisma.engagementReply.update({
        where: { id },
        data: {
          status: "SENT",
          suggestedReply: replyText,
          sentTweetId: result?.id || null,
        },
      });
      return NextResponse.json({ success: true, tweetId: result?.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Reply gönderilemedi";
      await prisma.engagementReply.update({
        where: { id },
        data: { status: "FAILED", errorMessage },
      });
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
}
