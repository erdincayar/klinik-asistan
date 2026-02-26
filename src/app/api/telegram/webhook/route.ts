import { NextRequest } from "next/server";
import { parseTelegramUpdate, sendTelegramMessage } from "@/lib/telegram/bot";
import { handleCommand } from "@/lib/commands/command-handler";
import { processWhatsAppMessage } from "@/lib/whatsapp/message-parser";
import { prisma } from "@/lib/prisma";

const WELCOME_MESSAGE = `Merhaba! KlinikAsistan Telegram botuna hosgeldiniz.

Kullanilabilir komutlar:
/start - Hosgeldin mesaji
/randevu - Randevulari goruntule
/gelir - Gelir ozetini goruntule
/gider - Gider ozetini goruntule
/yardim - Yardim mesaji

Veya dogal dilde mesaj yazabilirsiniz:
- "Ahmet Yilmaz yarin 15:00 dolgu" (randevu)
- "Ayse botoks 5000tl" (gelir)
- "Kira 25000tl odendi" (gider)`;

// GET: Simple status endpoint
export async function GET() {
  return Response.json({
    status: "ok",
    bot: "KlinikAsistan Telegram Bot",
    timestamp: new Date().toISOString(),
  });
}

// POST: Handle incoming Telegram webhook update
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const update = parseTelegramUpdate(body);

    if (!update || !update.message) {
      return Response.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text?.trim();
    const senderName = [
      update.message.from.first_name,
      update.message.from.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    if (!text) {
      await sendTelegramMessage({
        chat_id: chatId,
        text: "Sadece metin mesajlari desteklenmektedir. Lutfen bir komut veya metin gonderin.",
      });
      return Response.json({ ok: true });
    }

    // Find clinic (same pattern as WhatsApp webhook)
    const clinic = await prisma.clinic.findFirst();
    if (!clinic) {
      await sendTelegramMessage({
        chat_id: chatId,
        text: "Sistem hatasi: Klinik bulunamadi. Lutfen once bir klinik olusturun.",
      });
      return Response.json({ ok: true });
    }

    const clinicId = clinic.id;

    // Handle /start command specially
    if (text === "/start") {
      await sendTelegramMessage({
        chat_id: chatId,
        text: WELCOME_MESSAGE,
      });
      return Response.json({ ok: true });
    }

    // Handle /yardim command
    if (text === "/yardim") {
      await sendTelegramMessage({
        chat_id: chatId,
        text: WELCOME_MESSAGE,
      });
      return Response.json({ ok: true });
    }

    // Route command messages (starting with /)
    if (text.startsWith("/")) {
      const commandResult = await handleCommand(text, clinicId);

      if (commandResult.type === "command") {
        await sendTelegramMessage({
          chat_id: chatId,
          text: commandResult.response,
        });
      } else {
        // Not a recognized command - treat as natural language
        const result = await processWhatsAppMessage(
          commandResult.originalMessage,
          clinicId
        );
        await sendTelegramMessage({
          chat_id: chatId,
          text: result.confirmationMessage,
        });
      }

      return Response.json({ ok: true });
    }

    // Natural language message - reuse WhatsApp AI parser
    const result = await processWhatsAppMessage(text, clinicId);

    let responseText = result.confirmationMessage;
    if (result.patientIsNew) {
      responseText += "\n\nYeni hasta kaydi olusturuldu.";
    }

    await sendTelegramMessage({
      chat_id: chatId,
      text: responseText,
    });

    console.log(
      `[Telegram Webhook] ${senderName} (${chatId}): "${text}" -> ${result.success ? "basarili" : "basarisiz"}`
    );

    return Response.json({
      ok: true,
      processed: true,
      success: result.success,
    });
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error);
    return Response.json({ ok: true });
  }
}
