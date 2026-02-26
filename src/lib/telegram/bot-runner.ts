import "tsconfig-paths/register";
import { createBot } from "@/lib/telegram/real-bot";

console.log("🤖 Klinik Asistan Telegram Bot başlatılıyor...");

try {
  const bot = createBot();

  bot.getMe().then((me) => {
    console.log(`✅ Bot bağlandı: @${me.username}`);
    console.log("📡 Mesaj bekleniyor...");
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("\n🛑 Bot kapatılıyor...");
    bot.stopPolling();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} catch (error) {
  console.error("❌ Bot başlatılamadı:", error);
  process.exit(1);
}
