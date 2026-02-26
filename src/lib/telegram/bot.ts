export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    date: number;
  };
}

export interface TelegramSendMessageParams {
  chat_id: number | string;
  text: string;
  parse_mode?: "HTML" | "Markdown";
}

export async function sendTelegramMessage(
  params: TelegramSendMessageParams
): Promise<{ success: boolean; message: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token === "your-telegram-bot-token" || token.length < 10) {
    // Mock mode - log to console
    console.log("\n========================================");
    console.log("[Telegram Mock] Mesaj Gonderimi");
    console.log(`Chat ID: ${params.chat_id}`);
    console.log(`Mesaj: ${params.text}`);
    if (params.parse_mode) {
      console.log(`Parse Mode: ${params.parse_mode}`);
    }
    console.log("========================================\n");

    return {
      success: true,
      message: "Telegram mesaji gonderildi (simulasyon)",
    };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: params.chat_id,
        text: params.text,
        parse_mode: params.parse_mode,
      }),
    });

    const data = await response.json();

    if (response.ok && data.ok) {
      return { success: true, message: "Telegram mesaji gonderildi" };
    } else {
      console.error("[Telegram] API error:", data);
      return {
        success: false,
        message: `Telegram hatasi: ${data.description || "Bilinmeyen hata"}`,
      };
    }
  } catch (error) {
    console.error("[Telegram] Send error:", error);
    return { success: false, message: "Telegram mesaji gonderilemedi" };
  }
}

export async function setTelegramWebhook(
  webhookUrl: string
): Promise<{ success: boolean; message: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token === "your-telegram-bot-token" || token.length < 10) {
    console.log("\n========================================");
    console.log("[Telegram Mock] Webhook Ayarlama");
    console.log(`URL: ${webhookUrl}`);
    console.log("========================================\n");

    return {
      success: true,
      message: "Telegram webhook ayarlandi (simulasyon)",
    };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/setWebhook`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: webhookUrl }),
    });

    const data = await response.json();

    if (response.ok && data.ok) {
      return { success: true, message: "Telegram webhook ayarlandi" };
    } else {
      console.error("[Telegram] Webhook error:", data);
      return {
        success: false,
        message: `Webhook hatasi: ${data.description || "Bilinmeyen hata"}`,
      };
    }
  } catch (error) {
    console.error("[Telegram] Webhook error:", error);
    return { success: false, message: "Telegram webhook ayarlanamadi" };
  }
}

export function parseTelegramUpdate(body: unknown): TelegramUpdate | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const update = body as Record<string, unknown>;

  if (typeof update.update_id !== "number") {
    return null;
  }

  // Validate message structure if present
  if (update.message) {
    const msg = update.message as Record<string, unknown>;

    if (typeof msg.message_id !== "number") {
      return null;
    }

    if (!msg.from || typeof msg.from !== "object") {
      return null;
    }

    const from = msg.from as Record<string, unknown>;
    if (typeof from.id !== "number" || typeof from.first_name !== "string") {
      return null;
    }

    if (!msg.chat || typeof msg.chat !== "object") {
      return null;
    }

    const chat = msg.chat as Record<string, unknown>;
    if (typeof chat.id !== "number" || typeof chat.type !== "string") {
      return null;
    }

    if (typeof msg.date !== "number") {
      return null;
    }

    if (msg.text !== undefined && typeof msg.text !== "string") {
      return null;
    }
  }

  return body as TelegramUpdate;
}
