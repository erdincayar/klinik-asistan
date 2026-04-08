import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Poby.ai brand rules — always injected into prompts
const POBY_BRAND_RULES = `
BRAND: Poby.ai — AI-powered business management platform for Turkish businesses.
COLORS: Primary #6C3CE1 (purple), Dark #19094D (navy), Accent #5B33E1
STYLE: Modern, minimalist, tech-forward, clean gradients
MOOD: Friendly, trustworthy, innovative, approachable
AVOID: Stock photo look, overly corporate feel, obviously AI-generated artifacts, generic business imagery
SECTOR: SaaS technology, target audience is business owners in Turkey (clinics, restaurants, salons, beauty centers)
COMPOSITION: Clean backgrounds with subtle gradients, abstract tech elements, warm lighting, human-centered when showing people
`;

const tools: Anthropic.Tool[] = [
  {
    name: "get_style_profile",
    description:
      "Retrieves the clinic's visual style profile including color palette, design tone, mood, and the reusable style prompt fragment.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_business_context",
    description:
      "Retrieves business info: clinic name, sector, address. Useful for contextualizing the image.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_occasion_context",
    description:
      "Retrieves upcoming occasion/holiday info from the calendar. Use when the user mentions a special day or holiday.",
    input_schema: {
      type: "object" as const,
      properties: {
        occasionName: {
          type: "string",
          description: "Name of the occasion to look up (Turkish)",
        },
      },
      required: [],
    },
  },
];

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  clinicId: string
) {
  switch (name) {
    case "get_style_profile": {
      const profile = await prisma.clinicStyleProfile.findUnique({
        where: { clinicId },
      });
      if (!profile) return { hasProfile: false, message: "No style profile configured. Use Poby.ai brand rules instead." };
      return {
        hasProfile: true,
        colorPalette: profile.colorPalette,
        designTone: profile.designTone,
        contentMood: profile.contentMood,
        compositionStyle: profile.compositionStyle,
        typographyStyle: profile.typographyStyle,
        visualComplexity: profile.visualComplexity,
        stylePromptFragment: profile.stylePromptFragment,
      };
    }
    case "get_business_context": {
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, sector: true, address: true },
      });
      if (!clinic) return { error: "Clinic not found" };
      return {
        clinicName: clinic.name,
        sector: clinic.sector,
        address: clinic.address,
      };
    }
    case "get_occasion_context": {
      const { occasionName } = input as { occasionName?: string };
      if (!occasionName) {
        const today = new Date();
        const mmdd = `${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
        const occasions = await prisma.occasionCalendar.findMany({
          where: { isActive: true, date: { gte: mmdd } },
          orderBy: { date: "asc" },
          take: 5,
        });
        return { occasions };
      }
      const occasion = await prisma.occasionCalendar.findFirst({
        where: {
          isActive: true,
          name: { contains: occasionName },
        },
      });
      if (!occasion) return { found: false, message: `No occasion found for "${occasionName}"` };
      return {
        found: true,
        name: occasion.name,
        nameEn: occasion.nameEn,
        category: occasion.category,
        promptHint: occasion.promptHint,
      };
    }
    default:
      return { error: "Unknown tool" };
  }
}

const SYSTEM_PROMPT = `You are a FLUX image generation prompt engineer for Poby.ai.
${POBY_BRAND_RULES}

The user will describe what they want in Turkish. Your job:
1. Use the available tools to gather context (style profile, business info, occasion if relevant).
2. Based on all context + Poby brand rules, create a detailed image generation prompt IN ENGLISH.
3. The prompt should be 2-4 sentences, vivid, specific, and suitable for social media marketing.
4. Always incorporate Poby brand colors (#6C3CE1 purple, #19094D navy) and modern minimalist tech aesthetic.
5. FLUX models excel at photorealistic imagery, creative compositions, and detailed scenes. Write prompts that leverage this.
6. Never include text/words in the image prompt unless specifically requested.
7. Return ONLY the final prompt as your last message, nothing else.`;

export async function runContentAgent(
  clinicId: string,
  userPrompt: string
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools,
    messages,
  });

  // Agentic tool_use loop
  while (response.stop_reason === "tool_use") {
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (!toolUseBlock) break;

    const toolResult = await executeTool(
      toolUseBlock.name,
      toolUseBlock.input as Record<string, unknown>,
      clinicId
    );

    messages.push({
      role: "assistant",
      content: response.content,
    });
    messages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUseBlock.id,
          content: JSON.stringify(toolResult),
        },
      ],
    });

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  return textBlock?.text || "A professional marketing image for a business";
}

// ─── Concept Suggestion Agent ───────────────────────────
// Returns 2-3 visual concepts as text descriptions (no image generation)
// User picks one, then we generate the image

const CONCEPT_SYSTEM_PROMPT = `You are a creative director for Poby.ai's social media visuals.
${POBY_BRAND_RULES}

The user will give you a tweet/content text in Turkish. Your job:
1. Analyze the tweet's message and emotion.
2. Suggest exactly 3 visual concepts that would complement this tweet as a social media image.
3. Each concept should be distinct and creative.
4. Consider the Poby brand rules above.

Return a JSON array with exactly 3 objects:
[
  {
    "title": "Kısa Türkçe başlık (3-5 kelime)",
    "description": "Türkçe açıklama — görselde ne olacağını 1-2 cümlede anlat",
    "prompt": "Detailed FLUX image generation prompt in English, 2-3 sentences, incorporating Poby brand colors and style"
  }
]

Return ONLY the JSON array, no other text.`;

export async function suggestConcepts(
  tweetContent: string
): Promise<Array<{ title: string; description: string; prompt: string }>> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: CONCEPT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: tweetContent }],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  if (!textBlock?.text) {
    throw new Error("Konsept önerisi alınamadı");
  }

  try {
    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("JSON parse error");
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Konsept yanıtı parse edilemedi");
  }
}

// ─── Refine concept with feedback ───────────────────────
export async function refineConcept(
  originalPrompt: string,
  feedback: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `You are a FLUX image prompt engineer for Poby.ai.
${POBY_BRAND_RULES}

The user will give you an existing image prompt and feedback about what to change.
Revise the prompt according to the feedback while keeping Poby brand rules.
Return ONLY the revised prompt in English, nothing else.`,
    messages: [{
      role: "user",
      content: `Original prompt: ${originalPrompt}\n\nFeedback: ${feedback}`,
    }],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  return textBlock?.text || originalPrompt;
}
