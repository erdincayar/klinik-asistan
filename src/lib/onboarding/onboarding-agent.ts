import Anthropic from "@anthropic-ai/sdk";
import { MODULE_DEFINITIONS, type ModuleDefinition } from "./module-definitions";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface AnalysisInput {
  sector: string;
  sectorCustom?: string;
  teamSize: string;
  painPoints: string[];
}

export interface ModuleRecommendation {
  slug: string;
  name: string;
  shortDescription: string;
  featureList: string[];
  icon: string;
  color: string;
  basePrice: number;
  reasoning: string;
  isPrimary: boolean;
}

export interface AnalysisResult {
  recommendedModules: ModuleRecommendation[];
  upsellModules: ModuleRecommendation[];
  reasoning: string;
  customMessage: string;
  totalBasePrice: number;
}

const SYSTEM_PROMPT = `Sen Poby AI platformunun iş analiz asistanısın. Kullanıcının sektörüne, ekip büyüklüğüne ve yaşadığı problemlere göre en uygun modülleri öneriyorsun.

Mevcut modüller ve slugları:
- whatsapp-assistant: WhatsApp AI Asistan (₺299/ay)
- appointment: Randevu Yönetimi (₺199/ay)
- finance: Finans Takibi (₺249/ay)
- ai-content: AI İçerik Stüdyosu (₺349/ay)
- meta-ads: Meta Ads Yönetimi (₺399/ay)
- social-media: Sosyal Medya Yönetimi (₺279/ay)
- crm: Müşteri Yönetimi CRM (₺199/ay)
- poby-assistant: Poby AI Asistan (₺349/ay)

Kurallar:
1. Sektöre ve sorunlara göre 3-5 ana modül öner (primary: true)
2. 1-2 ek modül de upsell olarak öner (primary: false)
3. Her modül için sektöre özel 1 cümle gerekçe yaz (Türkçe, max 15 kelime)
4. Kullanıcıya özel bir karşılama mesajı yaz (Türkçe, 2-3 cümle, samimi ve profesyonel)
5. JSON formatında döndür, başka bir şey yazma

JSON formatı:
{
  "primaryModules": ["slug1", "slug2", ...],
  "upsellModules": ["slug3"],
  "reasoning": "Genel analiz açıklaması (1 cümle)",
  "customMessage": "Kullanıcıya özel karşılama mesajı",
  "moduleReasonings": {
    "slug1": "Bu modülün neden önerildiği",
    "slug2": "Bu modülün neden önerildiği"
  }
}`;

export async function analyzeAndRecommend(input: AnalysisInput): Promise<AnalysisResult> {
  const sectorLabel = input.sectorCustom || input.sector;
  const userMessage = `Sektör: ${sectorLabel}
Ekip büyüklüğü: ${input.teamSize}
Yaşanan sorunlar: ${input.painPoints.join(", ")}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  if (!textBlock?.text) {
    throw new Error("No response from AI");
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Invalid AI response format");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    primaryModules: string[];
    upsellModules: string[];
    reasoning: string;
    customMessage: string;
    moduleReasonings: Record<string, string>;
  };

  const moduleMap = new Map<string, ModuleDefinition>();
  for (const m of MODULE_DEFINITIONS) {
    moduleMap.set(m.slug, m);
  }

  function toRecommendation(slug: string, isPrimary: boolean): ModuleRecommendation | null {
    const mod = moduleMap.get(slug);
    if (!mod) return null;
    return {
      slug: mod.slug,
      name: mod.name,
      shortDescription: mod.shortDescription,
      featureList: mod.featureList,
      icon: mod.icon,
      color: mod.color,
      basePrice: mod.basePrice,
      reasoning: parsed.moduleReasonings?.[slug] || mod.shortDescription,
      isPrimary,
    };
  }

  const recommendedModules = parsed.primaryModules
    .map((slug) => toRecommendation(slug, true))
    .filter((m): m is ModuleRecommendation => m !== null);

  const upsellModules = parsed.upsellModules
    .map((slug) => toRecommendation(slug, false))
    .filter((m): m is ModuleRecommendation => m !== null);

  const totalBasePrice = recommendedModules.reduce((sum, m) => sum + m.basePrice, 0);

  return {
    recommendedModules,
    upsellModules,
    reasoning: parsed.reasoning,
    customMessage: parsed.customMessage,
    totalBasePrice,
  };
}
