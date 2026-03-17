import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateImage(
  contentId: string,
  clinicId: string,
  dallePrompt: string
): Promise<{ imageUrl: string }> {
  // Update status to GENERATING
  await prisma.aiGeneratedContent.update({
    where: { id: contentId },
    data: { status: "GENERATING", agentPrompt: dallePrompt },
  });

  try {
    const openai = getOpenAI();
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: dallePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json",
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image data returned from DALL-E");

    // Save to disk
    const timestamp = Date.now();
    const fileName = `${timestamp}_${contentId}.png`;
    const dir = path.join(process.cwd(), "uploads", "ai-studio", clinicId);
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, fileName);

    const buffer = Buffer.from(b64, "base64");
    await writeFile(filePath, buffer);

    const imageUrl = `/api/uploads/ai-studio/${clinicId}/${fileName}`;

    // Update status to COMPLETED
    await prisma.aiGeneratedContent.update({
      where: { id: contentId },
      data: { status: "COMPLETED", imageUrl },
    });

    return { imageUrl };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Image generation failed";

    await prisma.aiGeneratedContent.update({
      where: { id: contentId },
      data: { status: "FAILED", errorMessage },
    });

    throw error;
  }
}
