import { NextRequest } from "next/server";
import { handleBotMessage } from "@/lib/bot-ai-handler";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { prisma } from "@/lib/prisma";

const WELCOME_MESSAGE = `🤖 inPobi AI Asistan'a hoşgeldiniz!

Doğal dilde mesaj yazabilirsiniz:

📋 Sorgular:
• "Bugün randevum var mı?"
• "Bu ay ne kadar kazandık?"
• "Stok durumu nedir?"

📝 Kayıt:
• "Ahmet yarın 15:00 dolgu" (randevu)
• "Ayşe botoks 5000tl" (gelir)
• "Kira 25000tl ödendi" (gider)

Daha fazlası için "yardım" yazın.`;

// GET: Meta WhatsApp webhook verification
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Verified successfully");
    return new Response(challenge, { status: 200 });
  }

  return Response.json({ status: "ok" });
}

// POST: Handle incoming WhatsApp messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Test UI format (internal) ──
    if (body.message && body.clinicId) {
      return handleInternalMessage(body.message, body.clinicId, body.senderPhone || "test-user");
    }

    // ── Meta Cloud API webhook format ──
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      return Response.json({ ok: true });
    }

    // Status updates (delivered, read, etc.) — acknowledge but don't process
    if (value.statuses) {
      return Response.json({ ok: true });
    }

    const message = value.messages?.[0];
    if (!message) {
      return Response.json({ ok: true });
    }

    const senderPhone = message.from; // e.g. "905551234567"
    const messageText = message.text?.body?.trim();

    if (!messageText) {
      await sendWhatsAppMessage(
        senderPhone,
        "Sadece metin mesajları desteklenmektedir."
      );
      return Response.json({ ok: true });
    }

    console.log(`[WhatsApp Webhook] From: ${senderPhone}, Message: "${messageText}"`);

    // ── Klinik eşleştirme — whatsappPhone ile ──
    const clinic = await prisma.clinic.findFirst({
      where: { whatsappConnected: true },
    });

    if (!clinic) {
      await sendWhatsAppMessage(
        senderPhone,
        "⚠️ Henüz bir işletme WhatsApp'a bağlı değil.\n\ninPobi panelinden Ayarlar → WhatsApp bölümünden bağlantı kurun."
      );
      return Response.json({ ok: true });
    }

    // ── AI destekli doğal dil işleme (selamlama dahil) ──
    const result = await handleBotMessage(clinic.id, messageText, `whatsapp:${senderPhone}`);

    await sendWhatsAppMessage(senderPhone, result.response);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    return Response.json({ ok: true });
  }
}

// ── Internal test UI handler ──
async function handleInternalMessage(
  messageText: string,
  clinicId: string,
  senderPhone: string
) {
  const result = await handleBotMessage(clinicId, messageText, `test:${senderPhone}`);

  if (senderPhone !== "test-user") {
    await sendWhatsAppMessage(senderPhone, result.response);
  }

  return Response.json({
    success: true,
    intent: result.intent,
    confirmationMessage: result.response,
  });
}
