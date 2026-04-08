import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const FAL_MODELS = {
  "flux-pro": "https://fal.run/fal-ai/flux-pro/v1.1",
  "flux-schnell": "https://fal.run/fal-ai/flux/schnell",
} as const;

// fal.ai preset string sizes + custom pixel dimensions
const ASPECT_SIZES: Record<string, string | { width: number; height: number }> = {
  "16:9": "landscape_16_9",    // X / Twitter (1344x768)
  "1:1": "square_hd",          // IG Feed (1024x1024)
  "9:16": "portrait_16_9",     // Reel / TikTok (768x1344)
  "4:5": { width: 832, height: 1040 },  // IG Carousel (custom)
};

export type FalModel = keyof typeof FAL_MODELS;
export type AspectRatio = keyof typeof ASPECT_SIZES;

export async function generateImageWithFal(
  contentId: string,
  clinicId: string,
  prompt: string,
  model: FalModel = "flux-pro",
  aspectRatio: AspectRatio = "1:1"
): Promise<{ imageUrl: string }> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error("FAL_KEY ortam değişkeni ayarlanmamış");

  const endpoint = FAL_MODELS[model];
  if (!endpoint) throw new Error(`Geçersiz model: ${model}`);

  const imageSize = ASPECT_SIZES[aspectRatio] || "square_hd";

  // Update status to GENERATING
  await prisma.aiGeneratedContent.update({
    where: { id: contentId },
    data: { status: "GENERATING", agentPrompt: prompt, model, aspectRatio },
  });

  try {
    const body: Record<string, unknown> = {
      prompt,
      image_size: imageSize,
      num_images: 1,
      output_format: "jpeg",
      enable_safety_checker: true,
    };

    // FLUX Pro supports guidance_scale
    if (model === "flux-pro") {
      body.guidance_scale = 3.5;
    }
    // FLUX Schnell is optimized for fewer steps
    if (model === "flux-schnell") {
      body.num_inference_steps = 4;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`fal.ai API hatası (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const remoteImageUrl = data.images?.[0]?.url;
    if (!remoteImageUrl) throw new Error("fal.ai yanıtında görsel URL bulunamadı");

    // Download the image and save locally
    const imgResponse = await fetch(remoteImageUrl);
    if (!imgResponse.ok) throw new Error("Görsel indirilemedi");

    const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
    const timestamp = Date.now();
    const contentType = data.images[0].content_type || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const fileName = `${timestamp}_${contentId}.${ext}`;
    const dir = path.join(process.cwd(), "uploads", "ai-studio", clinicId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), imgBuffer);

    const localUrl = `/api/uploads/ai-studio/${clinicId}/${fileName}`;

    // Update status to COMPLETED
    await prisma.aiGeneratedContent.update({
      where: { id: contentId },
      data: { status: "COMPLETED", imageUrl: localUrl },
    });

    return { imageUrl: localUrl };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Görsel üretimi başarısız";

    await prisma.aiGeneratedContent.update({
      where: { id: contentId },
      data: { status: "FAILED", errorMessage },
    });

    throw error;
  }
}
