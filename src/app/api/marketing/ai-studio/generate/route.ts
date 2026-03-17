import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TOKEN_COSTS } from "@/lib/token-costs";
import { checkBalance, deductTokens } from "@/lib/token-service";
import { runContentAgent } from "@/lib/ai-studio/content-agent";
import { generateImage } from "@/lib/ai-studio/image-generator";

const schema = z.object({
  prompt: z.string().min(3).max(1000),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const clinicId = user.clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const isDemo = user.isDemo || user.role === "ADMIN";
  if (!isDemo) {
    const hasBalance = await checkBalance(clinicId, TOKEN_COSTS.AI_STUDIO_GENERATE);
    if (!hasBalance) {
      return NextResponse.json(
        { error: "Token bakiyeniz yetersiz." },
        { status: 402 }
      );
    }
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  // Create content record
  const content = await prisma.aiGeneratedContent.create({
    data: {
      clinicId,
      userPrompt: parsed.data.prompt,
      status: "PENDING",
      tokensCost: TOKEN_COSTS.AI_STUDIO_GENERATE,
    },
  });

  try {
    // Step 1: Agent creates DALL-E prompt
    const dallePrompt = await runContentAgent(clinicId, parsed.data.prompt);

    // Step 2: Generate image
    const { imageUrl } = await generateImage(content.id, clinicId, dallePrompt);

    if (!isDemo) {
      await deductTokens(clinicId, "AI_STUDIO_GENERATE", TOKEN_COSTS.AI_STUDIO_GENERATE, "AI görsel üretimi");
    }

    return NextResponse.json({
      id: content.id,
      imageUrl,
      agentPrompt: dallePrompt,
      status: "COMPLETED",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Görsel üretimi başarısız";
    return NextResponse.json({ error: message, id: content.id }, { status: 500 });
  }
}
