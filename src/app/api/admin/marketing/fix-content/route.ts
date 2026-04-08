import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

    const { id, feedback } = await req.json();
    if (!id || !feedback?.trim()) {
      return NextResponse.json({ error: "ID ve feedback gerekli" }, { status: 400 });
    }

    const post = await prisma.scheduledPost.findFirst({
      where: { id, clinicId },
    });
    if (!post) return NextResponse.json({ error: "İçerik bulunamadı" }, { status: 404 });

    const anthropic = new Anthropic();

    const isThread = post.type === "thread" && post.threadContent;
    const originalContent = isThread
      ? `Thread:\n${JSON.parse(post.threadContent!).map((t: string, i: number) => `${i + 1}/ ${t}`).join("\n")}`
      : `Tweet: ${post.content}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `Aşağıdaki sosyal medya içeriğini verilen feedback'e göre düzelt.

MEVCUT İÇERİK:
${originalContent}

FEEDBACK:
${feedback}

KURALLAR:
- "Küçük işletme" ifadesi KESİNLİKLE kullanılmayacak
- Türkçe, max 280 karakter (her tweet)
- Firma: Poby.ai, @pobyai, "biz" dili
- Fiyat: ₺499/ay + 7 gün ücretsiz deneme
- Doğal, samimi, profesyonel ton

${isThread ? `JSON formatında döndür: {"content": "ilk tweet", "threadContent": ["tweet1", "tweet2", ...]}` : `JSON formatında döndür: {"content": "düzeltilmiş tweet"}`}

Sadece JSON döndür, başka açıklama yapma.`,
      }],
    });

    const text = (response.content[0] as any).text;
    let fixed: { content: string; threadContent?: string[] };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      fixed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      if (!fixed) throw new Error("Parse failed");
    } catch {
      return NextResponse.json({ error: "AI yanıtı parse edilemedi" }, { status: 500 });
    }

    // Update post with fixed content, reset to DRAFT
    const updateData: any = {
      content: fixed.content,
      status: "DRAFT",
      feedback,
      approvedBy: null,
      approvedAt: null,
    };
    if (isThread && fixed.threadContent) {
      updateData.threadContent = JSON.stringify(fixed.threadContent);
    }

    const updated = await prisma.scheduledPost.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, post: updated });
  } catch (error) {
    console.error("Fix content error:", error);
    return NextResponse.json({ error: "İçerik düzeltme başarısız" }, { status: 500 });
  }
}
