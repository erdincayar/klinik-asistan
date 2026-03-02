import "tsconfig-paths/register";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { startBot, stopBot } from "@/lib/telegram/real-bot";

console.log("🤖 inPobi Telegram Bot başlatılıyor...");

const shutdown = () => {
  console.log("\n🛑 Bot kapatılıyor...");
  stopBot();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startBot().catch((error) => {
  console.error("❌ Bot başlatılamadı:", error);
  process.exit(1);
});
