import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { searchKnowledge } from "./embeddings";
import { TOKEN_COSTS } from "@/lib/token-costs";
import { checkBalance, deductTokens } from "@/lib/token-service";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── Tool definitions ──
const tools: Anthropic.Tool[] = [
  {
    name: "get_clinic_info",
    description: "Search the clinic's knowledge base for information about services, hours, prices, FAQ, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query in natural language" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_available_slots",
    description: "Get available appointment slots for a given date",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
      },
      required: ["date"],
    },
  },
  {
    name: "book_appointment",
    description: "Book a new appointment for a customer",
    input_schema: {
      type: "object" as const,
      properties: {
        customer_name: { type: "string" },
        customer_phone: { type: "string" },
        service: { type: "string" },
        date: { type: "string", description: "ISO datetime string" },
        notes: { type: "string" },
      },
      required: ["customer_name", "customer_phone", "service", "date"],
    },
  },
  {
    name: "modify_appointment",
    description: "Modify an existing appointment's date or notes",
    input_schema: {
      type: "object" as const,
      properties: {
        appointment_id: { type: "string" },
        new_date: { type: "string", description: "New ISO datetime" },
        notes: { type: "string" },
      },
      required: ["appointment_id"],
    },
  },
  {
    name: "cancel_appointment",
    description: "Cancel an existing appointment",
    input_schema: {
      type: "object" as const,
      properties: {
        appointment_id: { type: "string" },
        reason: { type: "string" },
      },
      required: ["appointment_id"],
    },
  },
  {
    name: "query_customer_appointment",
    description: "Look up appointments for a customer by phone number",
    input_schema: {
      type: "object" as const,
      properties: {
        customer_phone: { type: "string" },
      },
      required: ["customer_phone"],
    },
  },
  {
    name: "send_location",
    description: "Send the clinic's location/address to the customer",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_campaigns",
    description: "Get active marketing campaigns to share with the customer",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// ── Tool execution ──
async function executeTool(
  name: string,
  input: Record<string, unknown>,
  clinicId: string,
  conversationId: string | null
): Promise<unknown> {
  switch (name) {
    case "get_clinic_info": {
      const { query } = input as { query: string };
      const results = await searchKnowledge(clinicId, query, 5);
      return { results, count: results.length };
    }
    case "get_available_slots": {
      const { date } = input as { date: string };
      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay();
      const schedule = await prisma.clinicSchedule.findFirst({
        where: { clinicId, dayOfWeek, isActive: true },
      });
      if (!schedule) return { message: "Bu gün için çalışma programı yok", slots: [] };

      const [startH, startM] = schedule.startTime.split(":").map(Number);
      const [endH, endM] = schedule.endTime.split(":").map(Number);
      let currentMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      const existing = await prisma.appointment.findMany({
        where: { clinicId, date: { gte: startOfDay, lte: endOfDay }, status: { not: "CANCELLED" } },
      });
      const occupied = existing.map((a) => a.startTime);

      const slots: { time: string; available: boolean }[] = [];
      while (currentMinutes + schedule.slotDuration <= endMinutes) {
        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        slots.push({ time: timeStr, available: !occupied.includes(timeStr) });
        currentMinutes += schedule.slotDuration;
      }
      return { date, slots: slots.filter((s) => s.available), totalAvailable: slots.filter((s) => s.available).length };
    }
    case "book_appointment": {
      const { customer_name, customer_phone, service, date, notes } = input as {
        customer_name: string; customer_phone: string; service: string; date: string; notes?: string;
      };
      const appointmentDate = new Date(date);

      // Create assistant appointment record
      const appt = await prisma.assistantAppointment.create({
        data: {
          clinicId,
          conversationId,
          customerName: customer_name,
          customerPhone: customer_phone,
          serviceName: service,
          appointmentDate,
          notes: notes || null,
          status: "pending",
          sourceChannel: "assistant",
        },
      });

      return {
        success: true,
        appointmentId: appt.id,
        message: `Randevu oluşturuldu: ${customer_name} - ${service} - ${appointmentDate.toLocaleDateString("tr-TR")} ${appointmentDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`,
      };
    }
    case "modify_appointment": {
      const { appointment_id, new_date, notes } = input as {
        appointment_id: string; new_date?: string; notes?: string;
      };
      const updateData: Record<string, unknown> = {};
      if (new_date) updateData.appointmentDate = new Date(new_date);
      if (notes) updateData.notes = notes;

      const updated = await prisma.assistantAppointment.updateMany({
        where: { id: appointment_id, clinicId },
        data: updateData,
      });
      return { success: updated.count > 0, message: updated.count > 0 ? "Randevu güncellendi" : "Randevu bulunamadı" };
    }
    case "cancel_appointment": {
      const { appointment_id } = input as { appointment_id: string; reason?: string };
      const updated = await prisma.assistantAppointment.updateMany({
        where: { id: appointment_id, clinicId },
        data: { status: "cancelled" },
      });
      return { success: updated.count > 0, message: updated.count > 0 ? "Randevu iptal edildi" : "Randevu bulunamadı" };
    }
    case "query_customer_appointment": {
      const { customer_phone } = input as { customer_phone: string };
      const cleanPhone = customer_phone.replace(/[\s\-\+()]/g, "");
      const appointments = await prisma.assistantAppointment.findMany({
        where: {
          clinicId,
          customerPhone: { contains: cleanPhone.slice(-10) },
          status: { not: "cancelled" },
        },
        orderBy: { appointmentDate: "asc" },
        take: 5,
      });
      return {
        appointments: appointments.map((a) => ({
          id: a.id,
          service: a.serviceName,
          date: a.appointmentDate.toLocaleDateString("tr-TR"),
          time: a.appointmentDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
          status: a.status,
        })),
      };
    }
    case "send_location": {
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, address: true, phone: true },
      });
      return {
        name: clinic?.name,
        address: clinic?.address || "Adres bilgisi mevcut değil",
        phone: clinic?.phone,
      };
    }
    case "get_campaigns": {
      const campaigns = await prisma.adCampaign.findMany({
        where: { clinicId, status: "ACTIVE" },
        select: { name: true, description: true },
        take: 5,
      });
      return { campaigns: campaigns.length > 0 ? campaigns : [{ name: "Aktif kampanya yok" }] };
    }
    default:
      return { error: "Unknown tool" };
  }
}

// ── Build system prompt ──
function buildSystemPrompt(
  config: {
    assistantName: string;
    tone: string;
    responseLength: string;
    emojiUsage: string;
    language: string;
    capabilities: Record<string, boolean>;
    learnedStylePrompt: string | null;
    systemPromptOverride: string | null;
  },
  clinicName: string,
  knowledgeContext: string[]
): string {
  if (config.systemPromptOverride) return config.systemPromptOverride;

  const toneMap: Record<string, string> = {
    warm: "Sıcak ve samimi ol, müşteriyle dostça konuş.",
    formal: "Resmi ve profesyonel ol.",
    informative: "Bilgilendirici ve net ol.",
  };
  const lengthMap: Record<string, string> = {
    short: "Kısa ve öz cevap ver (1-3 cümle).",
    medium: "Orta uzunlukta, yeterli detayda cevap ver.",
    detailed: "Gerektiğinde detaylı açıklamalar yap.",
  };
  const emojiMap: Record<string, string> = {
    none: "Emoji kullanma.",
    minimal: "Çok az emoji kullan.",
    normal: "Uygun yerlerde emoji kullan.",
  };
  const langMap: Record<string, string> = {
    tr: "Sadece Türkçe yanıt ver.",
    en: "Only respond in English.",
    both: "Müşteri hangi dilde yazıyorsa o dilde yanıt ver.",
  };

  const capList = Object.entries(config.capabilities)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/_/g, " "))
    .join(", ");

  const knowledgeSection =
    knowledgeContext.length > 0
      ? `\n\nBilgi tabanından ilgili bilgiler:\n${knowledgeContext.join("\n\n---\n\n")}`
      : "";

  const styleSection = config.learnedStylePrompt
    ? `\n\nKonuşma stili rehberi: ${config.learnedStylePrompt}`
    : "";

  return `Sen ${config.assistantName} adlı AI asistansın. ${clinicName} adına müşterilerle iletişim kuruyorsun.

${toneMap[config.tone] || toneMap.warm}
${lengthMap[config.responseLength] || lengthMap.medium}
${emojiMap[config.emojiUsage] || emojiMap.minimal}
${langMap[config.language] || langMap.tr}
${styleSection}

Aktif yeteneklerin: ${capList || "bilgi verme"}

Kurallar:
- Müşteriye her zaman yardımcı ol
- Bilmediğin konularda dürüst ol, işletme sahibine yönlendir
- Randevu işlemlerinde telefon numarasını mutlaka al
- Fiyat bilgisi sorulduğunda bilgi tabanındaki güncel fiyatları kullan
- Asla tıbbi/hukuki tavsiye verme${knowledgeSection}`;
}

// ── Filter tools by capabilities ──
function filterToolsByCapabilities(capabilities: Record<string, boolean>): Anthropic.Tool[] {
  const capToolMap: Record<string, string[]> = {
    answer_services: ["get_clinic_info"],
    answer_hours: ["get_clinic_info"],
    answer_location: ["send_location"],
    send_location: ["send_location"],
    book_appointment: ["get_available_slots", "book_appointment"],
    modify_appointment: ["modify_appointment"],
    cancel_appointment: ["cancel_appointment"],
    query_appointment: ["query_customer_appointment"],
    suggest_products: ["get_clinic_info"],
    share_campaigns: ["get_campaigns"],
  };

  const allowedTools = new Set<string>(["get_clinic_info"]); // always allow knowledge search
  for (const [cap, enabled] of Object.entries(capabilities)) {
    if (enabled && capToolMap[cap]) {
      capToolMap[cap].forEach((t) => allowedTools.add(t));
    }
  }

  return tools.filter((t) => allowedTools.has(t.name));
}

// ── Main: process incoming message ──
export async function processMessage(
  clinicId: string,
  channel: string,
  customerIdentifier: string,
  customerName: string | null,
  incomingMessage: string
): Promise<{ response: string; conversationId: string }> {
  // 1. Get config
  const config = await prisma.clinicAssistantConfig.findUnique({
    where: { clinicId },
  });
  if (!config?.isActive) {
    throw new Error("ASSISTANT_INACTIVE");
  }

  // 2. Check token balance
  const user = await prisma.user.findFirst({ where: { clinicId } });
  const isDemo = user?.isDemo || user?.role === "ADMIN";
  if (!isDemo) {
    const hasBalance = await checkBalance(clinicId, TOKEN_COSTS.ASSISTANT_MESSAGE);
    if (!hasBalance) throw new Error("TOKEN_INSUFFICIENT");
  }

  // 3. Get or create conversation
  const isPhone = channel === "whatsapp";
  const conversation = await prisma.clinicConversation.upsert({
    where: {
      id: await findConversationId(clinicId, channel, customerIdentifier),
    },
    create: {
      clinicId,
      channel,
      customerPhone: isPhone ? customerIdentifier : null,
      customerChatId: !isPhone ? customerIdentifier : null,
      customerName,
      messages: [],
      lastMessageAt: new Date(),
    },
    update: {
      lastMessageAt: new Date(),
      ...(customerName && { customerName }),
    },
  });

  // 4. Load conversation history (max 20 messages)
  const existingMessages = (conversation.messages as Array<{ role: string; content: string; timestamp: string }>) || [];
  const recentMessages = existingMessages.slice(-20);

  // 5. Search knowledge base for context
  const knowledgeContext = await searchKnowledge(clinicId, incomingMessage, 5).catch(() => []);

  // 6. Get clinic info
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { name: true },
  });

  // 7. Build system prompt
  const capabilities = (config.capabilities || {}) as Record<string, boolean>;
  const systemPrompt = buildSystemPrompt(
    {
      assistantName: config.assistantName,
      tone: config.tone,
      responseLength: config.responseLength,
      emojiUsage: config.emojiUsage,
      language: config.language,
      capabilities,
      learnedStylePrompt: config.learnedStylePrompt,
      systemPromptOverride: config.systemPromptOverride,
    },
    clinic?.name || "İşletme",
    knowledgeContext
  );

  // 8. Build messages array
  const anthropicMessages: Anthropic.MessageParam[] = recentMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  anthropicMessages.push({ role: "user", content: incomingMessage });

  // 9. Filter tools by capabilities
  const activeTools = filterToolsByCapabilities(capabilities);

  // 10. Call Claude with tool use loop
  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    tools: activeTools,
    messages: anthropicMessages,
  });

  while (response.stop_reason === "tool_use") {
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUseBlock) break;

    const toolResult = await executeTool(
      toolUseBlock.name,
      toolUseBlock.input as Record<string, unknown>,
      clinicId,
      conversation.id
    );

    anthropicMessages.push({ role: "assistant", content: response.content });
    anthropicMessages.push({
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: toolUseBlock.id,
        content: JSON.stringify(toolResult),
      }],
    });

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools: activeTools,
      messages: anthropicMessages,
    });
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  const assistantResponse = textBlock?.text || "Üzgünüm, yanıt oluşturulamadı.";

  // 11. Save conversation
  const updatedMessages = [
    ...existingMessages,
    { role: "user", content: incomingMessage, timestamp: new Date().toISOString() },
    { role: "assistant", content: assistantResponse, timestamp: new Date().toISOString() },
  ];

  await prisma.clinicConversation.update({
    where: { id: conversation.id },
    data: {
      messages: updatedMessages,
      lastMessageAt: new Date(),
      ...(customerName && { customerName }),
    },
  });

  // 12. Deduct tokens
  if (!isDemo) {
    await deductTokens(clinicId, "ASSISTANT_MESSAGE", TOKEN_COSTS.ASSISTANT_MESSAGE, "Poby Asistan mesajı");
  }

  return { response: assistantResponse, conversationId: conversation.id };
}

// Helper: find existing conversation ID or return a dummy for upsert
async function findConversationId(
  clinicId: string,
  channel: string,
  identifier: string
): Promise<string> {
  const isPhone = channel === "whatsapp";
  const existing = await prisma.clinicConversation.findFirst({
    where: {
      clinicId,
      channel,
      ...(isPhone ? { customerPhone: identifier } : { customerChatId: identifier }),
    },
    orderBy: { lastMessageAt: "desc" },
  });
  return existing?.id || "non-existent-id-for-create";
}
