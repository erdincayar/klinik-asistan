import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getClinicMetaConfig } from "@/lib/meta-ads";

const GRAPH_API = "https://graph.facebook.com/v19.0";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeInstagramStyle(clinicId: string) {
  // 1. Get Meta config
  const config = await getClinicMetaConfig(clinicId);
  if (!config) throw new Error("Meta bağlantısı bulunamadı");

  // 2. Get pageId from MetaAdsConnection
  const connection = await prisma.metaAdsConnection.findUnique({
    where: { clinicId },
  });
  if (!connection?.pageId) throw new Error("Instagram sayfa bağlantısı bulunamadı");

  // 3. Discover Instagram Business Account
  const igAccountRes = await fetch(
    `${GRAPH_API}/${connection.pageId}?fields=instagram_business_account&access_token=${config.accessToken}`
  );
  const igAccountData = await igAccountRes.json();
  const igId = igAccountData?.instagram_business_account?.id;
  if (!igId) throw new Error("Instagram Business Account bulunamadı");

  // 4. Get recent media (images only)
  const mediaRes = await fetch(
    `${GRAPH_API}/${igId}/media?fields=media_type,media_url,thumbnail_url&limit=20&access_token=${config.accessToken}`
  );
  const mediaData = await mediaRes.json();
  if (mediaData.error) throw new Error(mediaData.error.message);

  const images = (mediaData.data || [])
    .filter((m: { media_type: string }) => m.media_type === "IMAGE")
    .slice(0, 6);

  if (images.length === 0) throw new Error("Instagram hesabında analiz edilecek görsel bulunamadı");

  // 5. Download images as base64
  const imageContents: Anthropic.ImageBlockParam[] = [];
  for (const img of images) {
    try {
      const res = await fetch(img.media_url);
      const arrayBuffer = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const mediaType = contentType.startsWith("image/png")
        ? "image/png"
        : contentType.startsWith("image/webp")
          ? "image/webp"
          : contentType.startsWith("image/gif")
            ? "image/gif"
            : "image/jpeg";

      imageContents.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: base64,
        },
      });
    } catch {
      // Skip failed downloads
    }
  }

  if (imageContents.length === 0) throw new Error("Görseller indirilemedi");

  // 6. Send to Claude Vision for analysis
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          ...imageContents,
          {
            type: "text",
            text: `Analyze these Instagram images from a business account. Extract the visual style as JSON:
{
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "designTone": "one of: professional, playful, luxury, minimalist, bold, warm, clinical",
  "contentMood": "one of: energetic, calm, inspiring, informative, friendly, sophisticated",
  "compositionStyle": "one of: centered, rule-of-thirds, symmetrical, dynamic, flat-lay",
  "typographyStyle": "one of: modern-sans, classic-serif, handwritten, bold-display, minimal",
  "visualComplexity": "one of: low, medium, high",
  "stylePromptFragment": "A concise English DALL-E 3 style fragment capturing this brand's visual identity"
}
Return ONLY valid JSON, no markdown.`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  if (!textBlock?.text) throw new Error("AI analiz yanıtı alınamadı");

  // 7. Parse result
  const analysis = JSON.parse(textBlock.text);

  // 8. Upsert style profile
  const profile = await prisma.clinicStyleProfile.upsert({
    where: { clinicId },
    create: {
      clinicId,
      source: "INSTAGRAM",
      colorPalette: analysis.colorPalette || [],
      designTone: analysis.designTone,
      contentMood: analysis.contentMood,
      compositionStyle: analysis.compositionStyle,
      typographyStyle: analysis.typographyStyle,
      visualComplexity: analysis.visualComplexity,
      stylePromptFragment: analysis.stylePromptFragment,
      analyzedAt: new Date(),
    },
    update: {
      source: "INSTAGRAM",
      colorPalette: analysis.colorPalette || [],
      designTone: analysis.designTone,
      contentMood: analysis.contentMood,
      compositionStyle: analysis.compositionStyle,
      typographyStyle: analysis.typographyStyle,
      visualComplexity: analysis.visualComplexity,
      stylePromptFragment: analysis.stylePromptFragment,
      analyzedAt: new Date(),
    },
  });

  return profile;
}
