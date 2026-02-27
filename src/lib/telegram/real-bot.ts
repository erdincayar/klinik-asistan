import { PrismaClient } from "@prisma/client";
import { handleCommand } from "@/lib/commands/command-handler";
import {
  parseWhatsAppMessage,
  findOrCreatePatient,
} from "@/lib/whatsapp/message-parser";

// ── Prisma ──────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();

// ── Config ──────────────────────────────────────────────────────────────────

// Format: "chatId:clinicId,chatId:clinicId" or just "chatId,chatId" (legacy)
const CHAT_CLINIC_MAP = new Map<number, string>();
const AUTHORIZED_CHAT_IDS: number[] = [];

if (process.env.TELEGRAM_AUTHORIZED_CHATS) {
  for (const entry of process.env.TELEGRAM_AUTHORIZED_CHATS.split(",").filter(Boolean)) {
    if (entry.includes(":")) {
      const [chatStr, clinicId] = entry.split(":");
      const chatId = Number(chatStr);
      AUTHORIZED_CHAT_IDS.push(chatId);
      CHAT_CLINIC_MAP.set(chatId, clinicId);
    } else {
      AUTHORIZED_CHAT_IDS.push(Number(entry));
    }
  }
}

// ── Telegram API ────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

interface TgMessage {
  message_id: number;
  from?: { id: number; first_name: string; last_name?: string; username?: string };
  chat: { id: number; type: string };
  text?: string;
  date: number;
}

interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}

async function tgSend(chatId: number, text: string): Promise<void> {
  await fetch(`${API_BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function getUpdates(offset: number): Promise<TgUpdate[]> {
  const res = await fetch(
    `${API_BASE}/getUpdates?offset=${offset}&timeout=30&allowed_updates=["message"]`
  );
  const data = await res.json();
  return data.ok ? data.result : [];
}

async function getMe(): Promise<{ username: string }> {
  const res = await fetch(`${API_BASE}/getMe`);
  const data = await res.json();
  if (!data.ok) throw new Error("getMe failed: " + JSON.stringify(data));
  return data.result;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getClinicIdForChat(chatId: number): Promise<string | null> {
  // First check explicit chat→clinic mapping
  const mapped = CHAT_CLINIC_MAP.get(chatId);
  if (mapped) return mapped;

  // Fallback: find user by telegramChatId or use first clinic
  const clinic = await prisma.clinic.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return clinic?.id ?? null;
}

function isAuthorized(chatId: number): boolean {
  if (AUTHORIZED_CHAT_IDS.length === 0) return true;
  return AUTHORIZED_CHAT_IDS.includes(chatId);
}

// ── Message Processing ──────────────────────────────────────────────────────

async function processMessage(msg: TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  console.log(`[Bot] ${msg.from?.first_name}: "${text}"`);

  if (!isAuthorized(chatId)) {
    await tgSend(chatId, "⛔ Yetkiniz yok. Chat ID'nizi yöneticiye bildirin: " + chatId);
    return;
  }

  const clinicId = await getClinicIdForChat(chatId);
  if (!clinicId) {
    await tgSend(chatId, "❌ Klinik bulunamadı. Önce sisteme bir klinik ekleyin.");
    return;
  }

  try {
    // /start
    if (text === "/start") {
      await tgSend(chatId, [
        "👋 Merhaba! Klinik Asistan Bot'a hoş geldiniz.",
        "",
        "Doğal dilde mesaj yazarak kayıt oluşturabilirsiniz:",
        '📅 Randevu: "Erdinç Ayar pazartesi 15:00 botoks"',
        '💰 Gelir: "Kerem İnanır dolgu 5000tl"',
        '💸 Gider: "Nurederm ürün 50000tl"',
        "",
        "Komutlar için /yardim yazın.",
      ].join("\n"));
      return;
    }

    // Commands
    if (text.startsWith("/")) {
      const result = await handleCommand(text, clinicId);
      if (result.type === "command") {
        await tgSend(chatId, result.response);
      } else {
        await tgSend(chatId, "❌ Bilinmeyen komut. /yardim yazın.");
      }
      return;
    }

    // Natural language → AI parser
    await tgSend(chatId, "⏳ Mesajınız işleniyor...");

    const parsed = await parseWhatsAppMessage(text);

    if (parsed.type === "ERROR") {
      await tgSend(chatId, `❌ ${parsed.message}`);
      return;
    }

    if (parsed.type === "AMBIGUOUS") {
      const options = parsed.options.map((o, i) => `${i + 1}. ${o}`).join("\n");
      await tgSend(chatId, `🤔 ${parsed.message}\n\n${options}\n\nLütfen netleştirerek tekrar yazın.`);
      return;
    }

    if (parsed.type === "APPOINTMENT") {
      const { patient, isNew } = await findOrCreatePatient(parsed.patientName, clinicId);

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
        weekday: "long", day: "numeric", month: "long",
      });
      const treatmentLabel =
        { BOTOX: "Botoks", DOLGU: "Dolgu", DIS_TEDAVI: "Diş Tedavi", GENEL: "Genel" }[
          parsed.treatmentType
        ] || parsed.treatmentType;

      let reply = `✅ Randevu oluşturuldu:\n📋 ${patient.name}\n📅 ${dateFormatted} saat ${parsed.time}\n💉 ${treatmentLabel}`;
      if (parsed.notes) reply += `\n📝 ${parsed.notes}`;
      if (isNew) reply += `\n\n⚠️ Yeni hasta kaydı oluşturuldu: ${patient.name}`;

      await tgSend(chatId, reply);
      return;
    }

    if (parsed.type === "INCOME") {
      const { patient, isNew } = await findOrCreatePatient(parsed.patientName, clinicId);

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

      await tgSend(chatId, reply);
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

      await tgSend(chatId, `✅ Gider kaydedildi:\n📦 ${parsed.description}\n🏷️ ${categoryLabel}\n💸 ${amountTL} TL`);
      return;
    }

    if (parsed.type === "STOCK_IN" || parsed.type === "STOCK_OUT") {
      const searchTerm = parsed.productName.trim().toLowerCase();
      const products = await prisma.product.findMany({
        where: { clinicId, isActive: true, name: { contains: parsed.productName.trim() } },
      });
      const product = products.find((p) => p.name.toLowerCase().includes(searchTerm));

      if (!product) {
        await tgSend(chatId, `❌ Urun bulunamadi: "${parsed.productName}"`);
        return;
      }

      if (parsed.type === "STOCK_OUT" && product.currentStock < parsed.quantity) {
        await tgSend(chatId, `❌ Yetersiz stok! ${product.name} mevcut: ${product.currentStock} ${product.unit}`);
        return;
      }

      const isIn = parsed.type === "STOCK_IN";
      const unitPrice = isIn ? product.purchasePrice : product.salePrice;

      await prisma.$transaction([
        prisma.stockMovement.create({
          data: {
            productId: product.id,
            clinicId,
            type: isIn ? "IN" : "OUT",
            quantity: parsed.quantity,
            unitPrice,
            totalPrice: unitPrice * parsed.quantity,
            description: parsed.notes || `Telegram dogal dil ile stok ${isIn ? "girisi" : "cikisi"}`,
            date: new Date(),
          },
        }),
        prisma.product.update({
          where: { id: product.id },
          data: {
            currentStock: isIn
              ? { increment: parsed.quantity }
              : { decrement: parsed.quantity },
          },
        }),
      ]);

      const newStock = isIn
        ? product.currentStock + parsed.quantity
        : product.currentStock - parsed.quantity;

      await tgSend(chatId, [
        `✅ Stok ${isIn ? "girisi" : "cikisi"} kaydedildi:`,
        `📦 ${product.name}`,
        `${isIn ? "➕" : "➖"} ${parsed.quantity} ${product.unit}`,
        `📊 Yeni stok: ${newStock} ${product.unit}`,
      ].join("\n"));
      return;
    }

    await tgSend(chatId, "❌ Mesaj anlaşılamadı. /yardim yazın.");
  } catch (error) {
    console.error("[Bot] Hata:", error);
    await tgSend(chatId, "❌ İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.");
  }
}

// ── Polling Loop ────────────────────────────────────────────────────────────

let running = true;

export async function startBot(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.length < 10) {
    throw new Error("TELEGRAM_BOT_TOKEN ayarlanmamış.");
  }

  const me = await getMe();
  console.log(`✅ Bot bağlandı: @${me.username}`);
  console.log("📡 Mesaj bekleniyor...");

  let offset = 0;

  while (running) {
    try {
      const updates = await getUpdates(offset);

      for (const update of updates) {
        offset = update.update_id + 1;
        if (update.message) {
          await processMessage(update.message);
        }
      }
    } catch (error: any) {
      console.error("[Bot] Polling hatası:", error.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

export function stopBot(): void {
  running = false;
}
