import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// In-memory cache: key = `${moduleSlug}:${sector}`, value = { message, expiry }
const cache = new Map<string, { message: string; expiry: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function generateUpsellMessage(
  moduleSlug: string,
  moduleName: string,
  sector: string,
  teamSize: string
): Promise<string> {
  const cacheKey = `${moduleSlug}:${sector}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiry > Date.now()) {
    return cached.message;
  }

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `${sector} sektöründe ${teamSize} kişilik bir ekip için "${moduleName}" modülünün faydasını anlatan max 20 kelimelik Türkçe upsell mesajı yaz. Sadece mesajı yaz, başka bir şey yazma.`,
      },
    ],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  const message = textBlock?.text?.trim() || `${moduleName} ile işletmenizi büyütün!`;

  cache.set(cacheKey, { message, expiry: Date.now() + CACHE_TTL });

  return message;
}
