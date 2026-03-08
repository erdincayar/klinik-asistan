import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const SYSTEM_PROMPT = `Sen Poby işletme danışmanısın. Kullanıcının işletme türünü, çalışan sayısını ve ihtiyaçlarını öğren. 3-4 soru sor, her mesajda tek soru sor. Samimi ve profesyonel ol. Türkçe konuş.

Yeterli bilgi topladığında, son mesajında işletmeye uygun modülleri öner ve mutlaka şu JSON formatında ver (mesajın sonunda, --- ayracından sonra):

---
{"suggestedModules":[{"name":"MODÜL_ADI","displayName":"Görünen Ad","price":FIYAT,"reason":"Öneri sebebi"}],"totalPrice":TOPLAM}

Mevcut modüller:
- PATIENTS: Müşteri Yönetimi ₺149/ay
- APPOINTMENTS: Randevu Sistemi ₺99/ay
- FINANCE: Finansal Takip ₺129/ay
- INVOICES: e-Fatura Sistemi ₺79/ay
- INVENTORY: Stok Yönetimi ₺99/ay
- AI_ASSISTANT: AI Asistan ₺199/ay
- MESSAGING: Mesajlaşma ₺89/ay
- REPORTS: Raporlama ₺69/ay
- MARKETING: Pazarlama ₺149/ay
- SOCIAL_MEDIA: Sosyal Medya ₺119/ay

Önemli: Her işletmeye en az 3 modül öner. Sebebini kısa açıkla.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, sessionId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Mesajlar gerekli" }, { status: 400 });
    }

    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Check if response contains module suggestions
    let suggestedModules = null;
    let totalPrice = null;
    const jsonMatch = assistantMessage.split("---");
    if (jsonMatch.length > 1) {
      try {
        const jsonStr = jsonMatch[jsonMatch.length - 1].trim();
        const parsed = JSON.parse(jsonStr);
        suggestedModules = parsed.suggestedModules;
        totalPrice = parsed.totalPrice;
      } catch {
        // JSON parse failed, no suggestions yet
      }
    }

    // Save to database
    if (sessionId) {
      await prisma.onboardingChat.upsert({
        where: { sessionId },
        update: {
          messages: messages.concat({
            role: "assistant",
            content: assistantMessage,
          }),
          ...(suggestedModules
            ? { suggestedModules, totalPrice, completed: true }
            : {}),
        },
        create: {
          sessionId,
          messages: messages.concat({
            role: "assistant",
            content: assistantMessage,
          }),
          ...(suggestedModules
            ? { suggestedModules, totalPrice, completed: true }
            : {}),
        },
      });
    }

    // Return clean message (without JSON) + suggestions separately
    const cleanMessage = suggestedModules
      ? jsonMatch.slice(0, -1).join("---").trim()
      : assistantMessage;

    return NextResponse.json({
      message: cleanMessage,
      suggestedModules,
      totalPrice,
    });
  } catch (error) {
    console.error("Onboarding AI error:", error);
    return NextResponse.json(
      { error: "AI yanıt veremedi" },
      { status: 500 }
    );
  }
}
