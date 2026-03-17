import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
      if (!profile) return { hasProfile: false, message: "No style profile configured" };
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
        // Return upcoming occasions
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

const SYSTEM_PROMPT = `You are a DALL-E 3 prompt engineer. The user will describe what they want in Turkish. Your job:
1. Use the available tools to gather context (style profile, business info, occasion if relevant).
2. Based on all context, create a detailed DALL-E 3 image prompt IN ENGLISH.
3. The prompt should be 1-3 sentences, vivid, specific, and suitable for social media marketing.
4. If a style profile exists, incorporate its stylePromptFragment.
5. Never include text/words in the image prompt unless specifically requested.
6. Return ONLY the final DALL-E prompt as your last message, nothing else.`;

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
