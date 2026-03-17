import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ManualStyleInput {
  colorPalette: string[];
  designTone: string;
  contentMood: string;
  compositionStyle?: string;
  typographyStyle?: string;
  visualComplexity: string;
}

export async function saveManualStyle(clinicId: string, input: ManualStyleInput) {
  // Generate stylePromptFragment via Claude
  const stylePromptFragment = await generateStyleFragment(input);

  const profile = await prisma.clinicStyleProfile.upsert({
    where: { clinicId },
    create: {
      clinicId,
      source: "MANUAL",
      colorPalette: input.colorPalette,
      designTone: input.designTone,
      contentMood: input.contentMood,
      compositionStyle: input.compositionStyle || null,
      typographyStyle: input.typographyStyle || null,
      visualComplexity: input.visualComplexity,
      stylePromptFragment,
    },
    update: {
      source: "MANUAL",
      colorPalette: input.colorPalette,
      designTone: input.designTone,
      contentMood: input.contentMood,
      compositionStyle: input.compositionStyle || null,
      typographyStyle: input.typographyStyle || null,
      visualComplexity: input.visualComplexity,
      stylePromptFragment,
    },
  });

  return profile;
}

async function generateStyleFragment(input: ManualStyleInput): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Based on these visual style preferences, generate a concise DALL-E 3 style fragment in English that can be appended to any image prompt:

Colors: ${input.colorPalette.join(", ")}
Design Tone: ${input.designTone}
Content Mood: ${input.contentMood}
Composition: ${input.compositionStyle || "balanced"}
Typography: ${input.typographyStyle || "modern sans-serif"}
Visual Complexity: ${input.visualComplexity}

Return ONLY the style fragment, no explanation. Example: "minimalist flat design with soft pastel palette of #FFB6C1 and #87CEEB, clean composition, modern sans-serif typography, medium complexity"`,
      },
    ],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  return textBlock?.text || "";
}
