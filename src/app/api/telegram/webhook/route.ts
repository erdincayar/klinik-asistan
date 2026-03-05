import { NextRequest } from "next/server";
import { parseTelegramUpdate, sendTelegramMessage } from "@/lib/telegram/bot";
import { handleCommand } from "@/lib/commands/command-handler";
import { processWhatsAppMessage } from "@/lib/whatsapp/message-parser";
import { prisma } from "@/lib/prisma";

const WELCOME_MESSAGE = `Merhaba! inPobi Telegram botuna hoş geldiniz.

Kullanılabilir komutlar:
/start - Hoş geldin mesajı
/randevu - Randevuları görüntüle
/gelir - Gelir özetini görüntüle
/gider - Gider özetini görüntüle
/yardim - Yardım mesajı

Veya doğal dilde mesaj yazabilirsiniz:
- "Ahmet Yılmaz yarın 15:00 dolgu" (randevu)
- "Ayşe botoks 5000tl" (gelir)
- "Kira 25000tl ödendi" (gider)`;

// GET: Simple status endpoint
export async function GET() {
  return Response.json({
    status: "ok",
    bot: "inPobi Telegram Bot",
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

    if (!text) {
      await sendTelegramMessage({
        chat_id: chatId,
        text: "Sadece metin mesajları desteklenmektedir. Lütfen bir komut veya metin gönderin.",
      });
      return Response.json({ ok: true });
    }

    // ── /start komutu — QR bağlantı kodu ile veya tek başına ──
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const connectionCode = parts[1]?.trim();

      if (connectionCode) {
        // QR bağlantı kodu ile gelen /start
        const link = await prisma.telegramLink.findUnique({
          where: { code: connectionCode },
          include: { clinic: true },
        });

        if (!link) {
          await sendTelegramMessage({
            chat_id: chatId,
            text: "❌ Bağlantı kodu geçersiz.\n\nLütfen inPobi panelinden yeni QR kod oluşturun.",
          });
          return Response.json({ ok: true });
        }

        if (link.used) {
          await sendTelegramMessage({
            chat_id: chatId,
            text: "❌ Bu bağlantı kodu zaten kullanılmış.\n\nLütfen inPobi panelinden yeni QR kod oluşturun.",
          });
          return Response.json({ ok: true });
        }

        if (link.expiresAt <= new Date()) {
          await sendTelegramMessage({
            chat_id: chatId,
            text: "❌ Bağlantı kodunun süresi dolmuş.\n\nLütfen inPobi panelinden yeni QR kod oluşturun.",
          });
          return Response.json({ ok: true });
        }

        // Kliniğe Telegram chat_id'yi kaydet ve kodu kullanıldı olarak işaretle
        await prisma.$transaction([
          prisma.clinic.update({
            where: { id: link.clinicId },
            data: { telegramChatId: String(chatId) },
          }),
          prisma.telegramLink.update({
            where: { id: link.id },
            data: { used: true },
          }),
        ]);

        await sendTelegramMessage({
          chat_id: chatId,
          text: `✅ Başarıyla bağlandınız!\n\n🏥 ${link.clinic.name} işletmesi Telegram bildirimleri aktif.\n\nArtık randevu hatırlatmaları, yeni müşteri bildirimleri ve önemli güncellemeleri buradan alacaksınız.\n\nKomutlar için /yardim yazın.`,
        });
        return Response.json({ ok: true });
      }

      // Parametresiz /start — sadece karşılama mesajı
      await sendTelegramMessage({
        chat_id: chatId,
        text: WELCOME_MESSAGE,
      });
      return Response.json({ ok: true });
    }

    // ── Klinik bul — telegramChatId ile eşleştir ──
    const clinic = await prisma.clinic.findFirst({
      where: { telegramChatId: String(chatId) },
    });

    if (!clinic) {
      await sendTelegramMessage({
        chat_id: chatId,
        text: "⚠️ Bu chat henüz bir işletmeye bağlı değil.\n\ninPobi panelinden Ayarlar → Telegram bölümünden QR kod ile bağlantı kurun.",
      });
      return Response.json({ ok: true });
    }

    const clinicId = clinic.id;

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
      responseText += "\n\nYeni müşteri kaydı oluşturuldu.";
    }

    await sendTelegramMessage({
      chat_id: chatId,
      text: responseText,
    });

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
