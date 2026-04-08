import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const schema = z.object({
  tweetContent: z.string().min(1),
  style: z.string().optional(),
  colorPalette: z.string().optional(),
  subject: z.string().optional(),
  textOverlay: z.string().optional(),
  fontStyle: z.string().optional(),
  logo: z.string().optional(),
  mood: z.string().optional(),
  avoid: z.string().optional(),
  referenceDescription: z.string().optional(),
});

const POBY_BRAND = `
BRAND: Poby.ai — AI-powered business management platform.
COLORS: Primary #6C3CE1 (purple), Dark #19094D (navy), Accent #5B33E1
STYLE: Modern, minimalist, tech-forward
MOOD: Friendly, trustworthy, innovative
AVOID: Stock photo look, overly corporate, obviously AI-generated artifacts
`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });

  const p = parsed.data;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userMessage = `
Tweet: "${p.tweetContent}"

Kullanıcı tercihleri:
- Görsel stili: ${p.style || "belirtilmedi"}
- Renk paleti: ${p.colorPalette || "marka renkleri"}
- Görselde olması istenen: ${p.subject || "AI analiz etsin"}
- Metin/yazı: ${p.textOverlay || "yok"}${p.fontStyle ? ` (font: ${p.fontStyle})` : ""}
- Logo: ${p.logo || "belirtilmedi"}
- Hissiyat: ${p.mood || "belirtilmedi"}
- Kaçınılacak: ${p.avoid || "belirtilmedi"}
${p.referenceDescription ? `- Referans açıklaması: ${p.referenceDescription}` : ""}
`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are a FLUX image generation prompt engineer for Poby.ai.
${POBY_BRAND}

The user will give you a tweet and their visual preferences. Create a detailed FLUX image prompt IN ENGLISH.
- 2-4 sentences, vivid and specific
- Incorporate all user preferences
- If user chose "marka renkleri", use Poby purple (#6C3CE1) and navy (#19094D) tones
- FLUX excels at photorealistic and creative compositions
- Never include readable text unless user explicitly requested it
- If text overlay requested, describe placement and style but note FLUX may not render text perfectly

Also create a Turkish summary of what you understood (1-2 sentences).

Return JSON: {"prompt": "english flux prompt", "summary": "türkçe özet"}
Only return JSON, nothing else.`,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = (response.content[0] as any).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Parse error");
    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prompt oluşturma başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
