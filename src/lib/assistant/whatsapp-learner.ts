import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { saveKnowledgeBase } from "./embeddings";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ParsedMessage {
  timestamp: string;
  sender: string;
  message: string;
}

interface ConversationPair {
  customer: string;
  clinic: string;
}

/**
 * Parse WhatsApp .txt export file
 * Format: [DD.MM.YYYY, HH:MM:SS] Sender: Message
 * Also handles: DD/MM/YYYY, HH:MM format
 */
export function parseWhatsAppExport(text: string): ParsedMessage[] {
  const lines = text.split("\n");
  const messages: ParsedMessage[] = [];
  // Match patterns like [DD.MM.YYYY, HH:MM:SS] or DD/MM/YYYY, HH:MM -
  const lineRegex =
    /^\[?(\d{1,2}[./]\d{1,2}[./]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–]?\s*(.+?):\s(.+)$/;

  let currentMessage: ParsedMessage | null = null;

  for (const line of lines) {
    const match = line.match(lineRegex);
    if (match) {
      if (currentMessage) messages.push(currentMessage);
      currentMessage = {
        timestamp: `${match[1]} ${match[2]}`,
        sender: match[3].trim(),
        message: match[4].trim(),
      };
    } else if (currentMessage && line.trim()) {
      // Continuation of previous message
      currentMessage.message += "\n" + line.trim();
    }
  }
  if (currentMessage) messages.push(currentMessage);

  return messages;
}

/**
 * Identify the two main participants and extract Q&A pairs
 */
export function extractConversationPairs(
  messages: ParsedMessage[]
): { pairs: ConversationPair[]; clinicSender: string; customerSenders: string[] } {
  // Count messages per sender, ignoring system messages
  const senderCounts: Record<string, number> = {};
  for (const msg of messages) {
    if (msg.message.includes("medya dahil edilmedi") || msg.message.includes("media omitted")) continue;
    senderCounts[msg.sender] = (senderCounts[msg.sender] || 0) + 1;
  }

  // Sort by count — the one who responds most is likely the clinic
  const sorted = Object.entries(senderCounts).sort((a, b) => b[1] - a[1]);
  if (sorted.length < 2) return { pairs: [], clinicSender: sorted[0]?.[0] || "", customerSenders: [] };

  const clinicSender = sorted[0][0];
  const customerSenders = sorted.slice(1).map((s) => s[0]);

  const pairs: ConversationPair[] = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const current = messages[i];
    const next = messages[i + 1];

    // Customer asks → Clinic responds
    if (customerSenders.includes(current.sender) && next.sender === clinicSender) {
      pairs.push({
        customer: current.message,
        clinic: next.message,
      });
    }
  }

  return { pairs, clinicSender, customerSenders };
}

/**
 * Analyze conversation style using Claude
 */
export async function analyzeStyleWithClaude(
  clinicId: string,
  conversationSamples: ConversationPair[]
): Promise<{
  tone: string;
  emoji_usage: string;
  response_length: string;
  language: string;
  learned_style_prompt: string;
}> {
  const samples = conversationSamples.slice(0, 20);
  const samplesText = samples
    .map((p, i) => `${i + 1}. Müşteri: "${p.customer}"\n   Klinik: "${p.clinic}"`)
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Analyze these customer-business conversation samples and determine the communication style. Return ONLY valid JSON, no markdown:

${samplesText}

Return this JSON:
{
  "tone": "warm | formal | informative",
  "emoji_usage": "none | minimal | normal",
  "response_length": "short | medium | detailed",
  "language": "tr | en | both",
  "greeting_style": "how they greet (e.g. Merhaba canım, Merhaba, Dear, etc.)",
  "signature_phrases": ["frequently used phrases"],
  "learned_style_prompt": "This business communicates in the following style: ... (English, 3-4 sentences, to be used as system prompt guidance)"
}`,
      },
    ],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  if (!textBlock?.text) throw new Error("AI stil analizi yanıtı alınamadı");

  const analysis = JSON.parse(textBlock.text);

  // Save to config
  await prisma.clinicAssistantConfig.upsert({
    where: { clinicId },
    create: {
      clinicId,
      tone: analysis.tone || "warm",
      emojiUsage: analysis.emoji_usage || "minimal",
      responseLength: analysis.response_length || "medium",
      language: analysis.language || "tr",
      learnedStylePrompt: analysis.learned_style_prompt || null,
      lastLearnedAt: new Date(),
    },
    update: {
      tone: analysis.tone || undefined,
      emojiUsage: analysis.emoji_usage || undefined,
      responseLength: analysis.response_length || undefined,
      language: analysis.language || undefined,
      learnedStylePrompt: analysis.learned_style_prompt || undefined,
      lastLearnedAt: new Date(),
    },
  });

  return analysis;
}

/**
 * Main function: process a WhatsApp export file
 */
export async function processWhatsAppExport(
  clinicId: string,
  exportText: string
): Promise<{ conversationCount: number; chunksAdded: number }> {
  // 1. Parse messages
  const messages = parseWhatsAppExport(exportText);
  if (messages.length === 0) throw new Error("Geçerli WhatsApp mesajı bulunamadı");

  // 2. Extract conversation pairs
  const { pairs, clinicSender } = extractConversationPairs(messages);
  if (pairs.length === 0) throw new Error("Konuşma çifti çıkarılamadı");

  // 3. Build knowledge text from pairs
  const knowledgeTexts = pairs.map(
    (p) => `Müşteri Sorusu: ${p.customer}\nKlinik Cevabı: ${p.clinic}`
  );
  const fullText = knowledgeTexts.join("\n\n---\n\n");

  // 4. Embed and save to knowledge base
  const chunksAdded = await saveKnowledgeBase(
    clinicId,
    "whatsapp_export",
    `WhatsApp Export - ${clinicSender}`,
    fullText
  );

  // 5. Analyze style
  await analyzeStyleWithClaude(clinicId, pairs);

  // 6. Update config flags
  await prisma.clinicAssistantConfig.upsert({
    where: { clinicId },
    create: {
      clinicId,
      whatsappExportProcessed: true,
      whatsappConversationCount: pairs.length,
      lastLearnedAt: new Date(),
    },
    update: {
      whatsappExportProcessed: true,
      whatsappConversationCount: { increment: pairs.length },
      lastLearnedAt: new Date(),
    },
  });

  return { conversationCount: pairs.length, chunksAdded };
}

/**
 * Learn from recent live conversations (runs periodically)
 */
export async function learnFromNewConversations(clinicId: string) {
  const config = await prisma.clinicAssistantConfig.findUnique({
    where: { clinicId },
  });
  if (!config) return;

  // Count total conversations
  const totalConvs = await prisma.clinicConversation.count({
    where: { clinicId },
  });

  // Only re-analyze every 50 conversations
  if (totalConvs % 50 !== 0 || totalConvs === 0) return;

  // Get recent conversations
  const recentConvs = await prisma.clinicConversation.findMany({
    where: { clinicId },
    orderBy: { lastMessageAt: "desc" },
    take: 30,
  });

  // Extract pairs from conversation messages
  const pairs: ConversationPair[] = [];
  for (const conv of recentConvs) {
    const msgs = conv.messages as Array<{ role: string; content: string }>;
    for (let i = 0; i < msgs.length - 1; i++) {
      if (msgs[i].role === "user" && msgs[i + 1].role === "assistant") {
        pairs.push({ customer: msgs[i].content, clinic: msgs[i + 1].content });
      }
    }
  }

  if (pairs.length < 5) return;

  // Save new knowledge
  const knowledgeText = pairs
    .slice(0, 20)
    .map((p) => `Müşteri: ${p.customer}\nAsistan: ${p.clinic}`)
    .join("\n\n---\n\n");

  await saveKnowledgeBase(clinicId, "whatsapp_learned", null, knowledgeText);

  // Re-analyze style
  await analyzeStyleWithClaude(clinicId, pairs.slice(0, 20));

  await prisma.clinicAssistantConfig.update({
    where: { clinicId },
    data: {
      whatsappConversationCount: totalConvs,
      lastLearnedAt: new Date(),
    },
  });
}
