import { NextRequest } from "next/server";
import { parseTelegramUpdate, sendTelegramMessage } from "@/lib/telegram/bot";
import { handleBotMessage } from "@/lib/bot-ai-handler";
import { prisma } from "@/lib/prisma";

const WELCOME_MESSAGE = `🤖 inPobi AI Asistan'a hoş geldiniz!

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
        text: "Sadece metin mesajları desteklenmektedir.",
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
          text: `✅ Başarıyla bağlandınız!\n\n🏥 ${link.clinic.name} işletmesi Telegram bildirimleri aktif.\n\nArtık doğal dilde mesaj yazarak işletmenizi yönetebilirsiniz.\n\nÖrnek: "Bugün randevum var mı?"`,
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

    // ── AI destekli doğal dil işleme ──
    const result = await handleBotMessage(clinic.id, text);

    await sendTelegramMessage({
      chat_id: chatId,
      text: result.response,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error);
    return Response.json({ ok: true });
  }
}
