import TelegramBot from "node-telegram-bot-api";
import { PrismaClient } from "@prisma/client";
import { handleCommand } from "@/lib/commands/command-handler";
import {
  parseWhatsAppMessage,
  findOrCreatePatient,
} from "@/lib/whatsapp/message-parser";

// ── Prisma ──────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();

// ── Config ──────────────────────────────────────────────────────────────────

const AUTHORIZED_CHAT_IDS = process.env.TELEGRAM_AUTHORIZED_CHATS
  ? process.env.TELEGRAM_AUTHORIZED_CHATS.split(",").map(Number)
  : [];

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getDefaultClinicId(): Promise<string | null> {
  const clinic = await prisma.clinic.findFirst({ select: { id: true } });
  return clinic?.id ?? null;
}

function isAuthorized(chatId: number): boolean {
  // If no authorized chats configured, allow all (dev mode)
  if (AUTHORIZED_CHAT_IDS.length === 0) return true;
  return AUTHORIZED_CHAT_IDS.includes(chatId);
}

// ── Message Processing ──────────────────────────────────────────────────────

async function processMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  if (!isAuthorized(chatId)) {
    await bot.sendMessage(
      chatId,
      "⛔ Yetkiniz yok. Chat ID'nizi yöneticiye bildirin: " + chatId
    );
    return;
  }

  const clinicId = await getDefaultClinicId();
  if (!clinicId) {
    await bot.sendMessage(chatId, "❌ Klinik bulunamadı. Önce sisteme bir klinik ekleyin.");
    return;
  }

  try {
    // Handle /start command
    if (text === "/start") {
      await bot.sendMessage(
        chatId,
        [
          "👋 Merhaba! Klinik Asistan Bot'a hoş geldiniz.",
          "",
          "Doğal dilde mesaj yazarak kayıt oluşturabilirsiniz:",
          '📅 Randevu: "Erdinç Ayar pazartesi 15:00 botoks"',
          '💰 Gelir: "Kerem İnanır dolgu 5000tl"',
          '💸 Gider: "Nurederm ürün 50000tl"',
          "",
          "Komutlar için /yardim yazın.",
        ].join("\n")
      );
      return;
    }

    // Handle commands (starts with /)
    if (text.startsWith("/")) {
      const result = await handleCommand(text, clinicId);
      if (result.type === "command") {
        await bot.sendMessage(chatId, result.response);
      } else {
        await bot.sendMessage(chatId, "❌ Bilinmeyen komut. /yardim yazın.");
      }
      return;
    }

    // Natural language processing via AI parser
    await bot.sendMessage(chatId, "⏳ Mesajınız işleniyor...");

    const parsed = await parseWhatsAppMessage(text);

    if (parsed.type === "ERROR") {
      await bot.sendMessage(chatId, `❌ ${parsed.message}`);
      return;
    }

    if (parsed.type === "AMBIGUOUS") {
      const options = parsed.options.map((o, i) => `${i + 1}. ${o}`).join("\n");
      await bot.sendMessage(
        chatId,
        `🤔 ${parsed.message}\n\n${options}\n\nLütfen netleştirerek tekrar yazın.`
      );
      return;
    }

    if (parsed.type === "APPOINTMENT") {
      const { patient, isNew } = await findOrCreatePatient(
        parsed.patientName,
        clinicId
      );

      const [h, m] = parsed.time.split(":").map(Number);
      const endMinutes = h * 60 + m + 30;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

      await prisma.appointment.create({
        data: {
          patientId: patient.id,
          clinicId,
          date: new Date(parsed.date),
          startTime: parsed.time,
          endTime,
          treatmentType: parsed.treatmentType,
          notes: parsed.notes || null,
          status: "SCHEDULED",
        },
      });

      const dateFormatted = new Date(parsed.date).toLocaleDateString("tr-TR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const treatmentLabel =
        { BOTOX: "Botoks", DOLGU: "Dolgu", DIS_TEDAVI: "Diş Tedavi", GENEL: "Genel" }[
          parsed.treatmentType
        ] || parsed.treatmentType;

      let reply = `✅ Randevu oluşturuldu:\n📋 ${patient.name}\n📅 ${dateFormatted} saat ${parsed.time}\n💉 ${treatmentLabel}`;
      if (parsed.notes) reply += `\n📝 ${parsed.notes}`;
      if (isNew) reply += `\n\n⚠️ Yeni hasta kaydı oluşturuldu: ${patient.name}`;

      await bot.sendMessage(chatId, reply);
      return;
    }

    if (parsed.type === "INCOME") {
      const { patient, isNew } = await findOrCreatePatient(
        parsed.patientName,
        clinicId
      );

      await prisma.treatment.create({
        data: {
          patientId: patient.id,
          clinicId,
          name: parsed.treatmentName || parsed.treatmentType,
          category: parsed.treatmentType,
          amount: parsed.amount,
          date: new Date(),
          description: parsed.notes || null,
        },
      });

      const amountTL = (parsed.amount / 100).toLocaleString("tr-TR");
      const treatmentLabel =
        { BOTOX: "Botoks", DOLGU: "Dolgu", DIS_TEDAVI: "Diş Tedavi", GENEL: "Genel" }[
          parsed.treatmentType
        ] || parsed.treatmentType;

      let reply = `✅ Gelir kaydedildi:\n👤 ${patient.name}\n💉 ${treatmentLabel}\n💰 ${amountTL} TL`;
      if (isNew) reply += `\n\n⚠️ Yeni hasta kaydı oluşturuldu: ${patient.name}`;

      await bot.sendMessage(chatId, reply);
      return;
    }

    if (parsed.type === "EXPENSE") {
      await prisma.expense.create({
        data: {
          clinicId,
          description: parsed.description,
          amount: parsed.amount,
          category: parsed.category,
          date: new Date(),
        },
      });

      const amountTL = (parsed.amount / 100).toLocaleString("tr-TR");
      const categoryLabel =
        { MALZEME: "Malzeme", KIRA: "Kira", FATURA: "Fatura", MAAS: "Maaş", DIGER: "Diğer" }[
          parsed.category
        ] || parsed.category;

      await bot.sendMessage(
        chatId,
        `✅ Gider kaydedildi:\n📦 ${parsed.description}\n🏷️ ${categoryLabel}\n💸 ${amountTL} TL`
      );
      return;
    }

    await bot.sendMessage(chatId, "❌ Mesaj anlaşılamadı. /yardim yazın.");
  } catch (error) {
    console.error("[TelegramBot] Error processing message:", error);
    await bot.sendMessage(chatId, "❌ İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.");
  }
}

// ── Bot Factory ─────────────────────────────────────────────────────────────

export function createBot(): TelegramBot {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.length < 10) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN ayarlanmamış. .env dosyasına bot token'ınızı ekleyin."
    );
  }

  const bot = new TelegramBot(token, { polling: true });

  bot.on("message", (msg) => {
    processMessage(bot, msg).catch((err) => {
      console.error("[TelegramBot] Unhandled error:", err);
    });
  });

  bot.on("polling_error", (error) => {
    console.error("[TelegramBot] Polling error:", error.message);
  });

  return bot;
}
