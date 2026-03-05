import { NextRequest } from "next/server";
import { processWhatsAppMessage } from "@/lib/whatsapp/message-parser";
import { handleCommand } from "@/lib/commands/command-handler";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { prisma } from "@/lib/prisma";

const WELCOME_MESSAGE = `👋 inPobi WhatsApp Asistan'a hoşgeldiniz!

Kullanabileceğiniz komutlar:
📅 /randevu — Bugünkü randevular
💰 /gelir — Bu ayki gelir özeti
💸 /gider — Bu ayki giderler
📦 /stok — Düşük stok uyarıları
👤 /musteri [isim] — Müşteri ara
📊 /ozet — Genel özet
❓ /yardim — Komut listesi

Veya doğal dilde mesaj yazın:
"Ahmet Yılmaz yarın 15:00 dolgu" (randevu)
"Ayşe botoks 5000tl" (gelir)
"Kira 25000tl ödendi" (gider)`;

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

    const clinicId = clinic.id;

    // ── Karşılama komutları ──
    const lowerText = messageText.toLowerCase();
    if (lowerText === "merhaba" || lowerText === "selam" || lowerText === "hi" || lowerText === "başla") {
      await sendWhatsAppMessage(senderPhone, WELCOME_MESSAGE);
      return Response.json({ ok: true });
    }

    if (lowerText === "yardım" || lowerText === "yardim" || messageText === "/yardim") {
      await sendWhatsAppMessage(senderPhone, WELCOME_MESSAGE);
      return Response.json({ ok: true });
    }

    // ── Komut sistemi ──
    const commandResult = await handleCommand(messageText, clinicId);

    if (commandResult.type === "command") {
      await sendWhatsAppMessage(senderPhone, commandResult.response);
      return Response.json({ ok: true });
    }

    // ── Doğal dil — AI parser ──
    await sendWhatsAppMessage(senderPhone, "⏳ Mesajınız işleniyor...");

    const result = await processWhatsAppMessage(messageText, clinicId);

    let responseText = result.confirmationMessage;
    if (result.patientIsNew) {
      responseText += "\n\n⚠️ Yeni müşteri kaydı oluşturuldu.";
    }

    await sendWhatsAppMessage(senderPhone, responseText);

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
  const commandResult = await handleCommand(messageText, clinicId);

  if (commandResult.type === "command") {
    if (senderPhone !== "test-user") {
      await sendWhatsAppMessage(senderPhone, commandResult.response);
    }
    return Response.json({
      success: true,
      isCommand: true,
      confirmationMessage: commandResult.response,
    });
  }

  const result = await processWhatsAppMessage(messageText, clinicId);

  if (senderPhone !== "test-user") {
    await sendWhatsAppMessage(senderPhone, result.confirmationMessage);
  }

  return Response.json({
    success: result.success,
    parsed: result.parsed,
    confirmationMessage: result.confirmationMessage,
    patientIsNew: result.patientIsNew,
    recordId: result.recordId,
  });
}
