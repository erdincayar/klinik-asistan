import { PrismaClient } from "@prisma/client";
import { handleCommand } from "@/lib/commands/command-handler";
import { handleBotMessage } from "@/lib/bot-ai-handler";

// ── Prisma ──────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();


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
  const clinic = await prisma.clinic.findFirst({
    where: { telegramChatId: chatId.toString() },
    select: { id: true },
  });

  console.log(`[Bot] getClinicIdForChat chatId=${chatId} → clinicId=${clinic?.id ?? "NOT FOUND"}`);
  return clinic?.id ?? null;
}

// ── Message Processing ──────────────────────────────────────────────────────

async function processMessage(msg: TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  console.log(`[Bot] ${msg.from?.first_name}: "${text}"`);

  try {
    // /start command — handle BEFORE authorization check so QR linking works for new chats
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      if (parts.length > 1) {
        // Handle QR link code — no auth required
        const code = parts[1].trim();
        try {
          const link = await prisma.telegramLink.findUnique({
            where: { code },
          });
          if (!link) {
            await tgSend(chatId, "❌ Bağlantı kodu geçersiz. Lütfen yeni QR kod oluşturun.");
            return;
          }
          if (link.used) {
            await tgSend(chatId, "❌ Bu bağlantı kodu zaten kullanılmış. Lütfen yeni QR kod oluşturun.");
            return;
          }
          if (link.expiresAt <= new Date()) {
            await tgSend(chatId, "❌ Bağlantı kodunun süresi dolmuş. Lütfen yeni QR kod oluşturun.");
            return;
          }
          // Link the clinic
          await prisma.clinic.update({
            where: { id: link.clinicId },
            data: { telegramChatId: String(chatId) },
          });
          await prisma.telegramLink.update({
            where: { id: link.id },
            data: { used: true },
          });
          await tgSend(chatId, "✅ Telegram bağlantısı başarılı! Artık bu chat üzerinden işletmenizi yönetebilirsiniz.");
          return;
        } catch (err) {
          console.error("[Bot] QR link error:", err);
          await tgSend(chatId, "❌ Bağlantı kodu işlenirken bir hata oluştu. Lütfen tekrar deneyin.");
          return;
        }
      }

      // Plain /start without code — show welcome
      await tgSend(chatId, [
        "👋 Merhaba! Poby Bot'a hoş geldiniz.",
        "",
        "Doğal dilde mesaj yazarak sorgulama ve kayıt yapabilirsiniz:",
        "",
        "📦 Stok: \"Stok durumu\" veya \"Botox ne kadar kaldı?\"",
        "💰 Finans: \"Bu ay gelir\" veya \"Giderler ne durumda?\"",
        "🧾 Fatura: \"Son faturalar\" veya \"Fatura durumu\"",
        "📅 Randevu: \"Bugün randevum var mı?\"",
        "📝 Kayıt: \"Erdinç Ayar pazartesi 15:00 botoks\"",
        "",
        "Komutlar için /yardim yazın.",
      ].join("\n"));
      return;
    }

  const clinicId = await getClinicIdForChat(chatId);
  if (!clinicId) {
    await tgSend(chatId, "⛔ Bu chat henüz bir işletmeye bağlı değil. Ayarlar sayfasından QR kod ile bağlantı kurun.");
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

    // Natural language → AI handler (stok, finans, fatura sorguları + veri girişi)
    await tgSend(chatId, "⏳ Mesajınız işleniyor...");

    const senderId = `telegram:${chatId}`;
    const result = await handleBotMessage(clinicId, text, senderId);
    await tgSend(chatId, result.response);
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
