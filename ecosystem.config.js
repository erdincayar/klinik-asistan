/**
 * Poby.ai — pm2 ecosystem configuration
 *
 * Tüm süreçleri tek dosyada tanımlar. Deploy sırasında:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup   # bir kere; output'un çıktısını bir kez çalıştır
 *
 * Mevcut üretim süreçleri (pm2 list'ten):
 *   - inpobi-web      — Next.js (`next start`)
 *   - inpobi-bot      — Telegram bot runner (`npm run bot`)
 *   - poby-catalog    — FastAPI catalog-service (uvicorn)
 *
 * Log dizini: /var/www/klinik-asistan/logs/
 * (pm2 ilk çalıştığında otomatik oluşturulur.)
 */

const path = require("path");
const APP_ROOT = __dirname;
const LOG_DIR = path.join(APP_ROOT, "logs");

module.exports = {
  apps: [
    /* ────────── Next.js ────────── */
    {
      name: "inpobi-web",
      cwd: APP_ROOT,
      script: "node_modules/next/dist/bin/next",
      args: "start",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: `${LOG_DIR}/inpobi-web.error.log`,
      out_file: `${LOG_DIR}/inpobi-web.out.log`,
      merge_logs: true,
      time: true,
    },

    /* ────────── Telegram Bot ────────── */
    {
      name: "inpobi-bot",
      cwd: APP_ROOT,
      script: "npm",
      args: "run bot",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      error_file: `${LOG_DIR}/inpobi-bot.error.log`,
      out_file: `${LOG_DIR}/inpobi-bot.out.log`,
      merge_logs: true,
      time: true,
    },

    /* ────────── FastAPI Catalog Service ────────── */
    {
      name: "catalog-service",
      cwd: path.join(APP_ROOT, "python-services", "catalog-service"),
      script: "venv/bin/uvicorn",
      args: "main:app --host 127.0.0.1 --port 8001",
      interpreter: "none", // uvicorn's shebang handles it
      env: {
        NODE_ENV: "production",
        PORT: 8001,
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: `${LOG_DIR}/catalog-service.error.log`,
      out_file: `${LOG_DIR}/catalog-service.out.log`,
      merge_logs: true,
      time: true,
    },
  ],
};
