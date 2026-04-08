import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runContentAgent } from "@/lib/ai-studio/content-agent";
import { generateImageWithFal, type FalModel, type AspectRatio } from "@/lib/ai-studio/fal-image-generator";

const schema = z.object({
  prompt: z.string().min(3).max(1000),
  model: z.enum(["flux-pro", "flux-schnell"]).default("flux-pro"),
  aspectRatio: z.enum(["16:9", "1:1", "9:16", "4:5"]).default("1:1"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const clinicId = user.clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  const { prompt, model, aspectRatio } = parsed.data;

  // Create content record
  const content = await prisma.aiGeneratedContent.create({
    data: {
      clinicId,
      userPrompt: prompt,
      model,
      aspectRatio,
      status: "PENDING",
      tokensCost: 0,
    },
  });

  try {
    // Step 1: Agent creates FLUX prompt
    const fluxPrompt = await runContentAgent(clinicId, prompt);

    // Step 2: Generate image with fal.ai
    const { imageUrl } = await generateImageWithFal(
      content.id,
      clinicId,
      fluxPrompt,
      model as FalModel,
      aspectRatio as AspectRatio
    );

    return NextResponse.json({
      id: content.id,
      imageUrl,
      agentPrompt: fluxPrompt,
      model,
      aspectRatio,
      status: "COMPLETED",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Görsel üretimi başarısız";
    return NextResponse.json({ error: message, id: content.id }, { status: 500 });
  }
}
