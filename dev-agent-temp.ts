import TelegramBot from 'node-telegram-bot-api';
import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const BOT_TOKEN = '8781782586:AAHVXAAbWGIgNDeNJoAWkYgaxH9xTFUX7aI';
const AUTHORIZED_CHAT = 831297804;
const PROJECT_DIR = '/var/www/klinik-asistan';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function isAuthorized(chatId: number): boolean {
  return chatId === AUTHORIZED_CHAT;
}

function runCmd(cmd: string, cwd = PROJECT_DIR): string {
  try {
    return execSync(cmd, { cwd, timeout: 120000, encoding: 'utf-8' });
  } catch (e: any) {
    return 'HATA: ' + e.message + '\n' + (e.stderr || '');
  }
}

function sendLong(chatId: number, text: string) {
  const maxLen = 4000;
  if (text.length <= maxLen) {
    bot.sendMessage(chatId, text);
  } else {
    for (let i = 0; i < text.length; i += maxLen) {
      bot.sendMessage(chatId, text.substring(i, i + maxLen));
    }
  }
}

bot.onText(/\/status/, (msg) => {
  if (!isAuthorized(msg.chat.id)) return;
  const pm2 = runCmd('pm2 jlist');
  try {
    const processes = JSON.parse(pm2);
    const status = processes.map((p: any) => {
      const icon = p.pm2_env.status === 'online' ? '🟢' : '🔴';
      const mem = Math.round(p.monit.memory / 1024 / 1024);
      return icon + ' ' + p.name + ' - ' + p.pm2_env.status + ' | CPU: ' + p.monit.cpu + '% | RAM: ' + mem + 'MB';
    }).join('\n');
    const disk = runCmd('df -h / | tail -1');
    const ram = runCmd("free -h | grep Mem | awk '{print $3\"/\"$2}'");
    bot.sendMessage(msg.chat.id, '📊 Sunucu Durumu\n\n' + status + '\n\n💾 Disk: ' + disk.trim() + '\n🧠 RAM: ' + ram.trim());
  } catch {
    bot.sendMessage(msg.chat.id, 'PM2: ' + pm2);
  }
});

bot.onText(/\/logs(?:\s+(.+))?/, (msg, match) => {
  if (!isAuthorized(msg.chat.id)) return;
  const app = match?.[1] || 'klinik-web';
  const logs = runCmd('pm2 logs ' + app + ' --lines 30 --nostream');
  sendLong(msg.chat.id, '📋 ' + app + ' Logs:\n' + logs.slice(-3500));
});

bot.onText(/\/deploy/, async (msg) => {
  if (!isAuthorized(msg.chat.id)) return;
  bot.sendMessage(msg.chat.id, '🚀 Deploy başlıyor...');
  const pull = runCmd('git pull origin main');
  bot.sendMessage(msg.chat.id, '📥 Git Pull:\n' + pull);
  runCmd('npm install');
  bot.sendMessage(msg.chat.id, '📦 npm install tamamlandı');
  runCmd('npx prisma generate');
  runCmd('npx prisma db push');
  bot.sendMessage(msg.chat.id, '🗄️ Prisma tamamlandı');
  const build = runCmd('npm run build');
  if (build.includes('HATA')) {
    bot.sendMessage(msg.chat.id, '❌ Build hatası:\n' + build.slice(-2000));
    return;
  }
  bot.sendMessage(msg.chat.id, '✅ Build başarılı');
  runCmd('pm2 restart klinik-web');
  runCmd('pm2 restart klinik-bot');
  bot.sendMessage(msg.chat.id, '🎉 Deploy tamamlandı! Site güncellendi.');
});

bot.onText(/\/dosya\s+(.+)/, (msg, match) => {
  if (!isAuthorized(msg.chat.id)) return;
  const filePath = path.join(PROJECT_DIR, match![1]);
  if (!fs.existsSync(filePath)) {
    bot.sendMessage(msg.chat.id, '❌ Dosya bulunamadı');
    return;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  sendLong(msg.chat.id, '📄 ' + match![1] + ':\n' + content.slice(-3500));
});

bot.onText(/\/geri/, (msg) => {
  if (!isAuthorized(msg.chat.id)) return;
  const revert = runCmd('git revert HEAD --no-edit');
  const build = runCmd('npm run build');
  if (!build.includes('HATA')) {
    runCmd('pm2 restart klinik-web');
    bot.sendMessage(msg.chat.id, '⏪ Son değişiklik geri alındı.\n' + revert);
  } else {
    runCmd('git revert HEAD --no-edit');
    bot.sendMessage(msg.chat.id, '❌ Geri alma başarısız.');
  }
});

bot.onText(/\/kod\s+(.+)/s, async (msg, match) => {
  if (!isAuthorized(msg.chat.id)) return;
  const instruction = match![1];
  bot.sendMessage(msg.chat.id, '🤖 Çalışıyorum: "' + instruction + '"\n\nBu birkaç dakika sürebilir...');
  try {
    const fileList = runCmd("find src -type f -name '*.tsx' -o -name '*.ts' | head -60");
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: 'Sen bir Next.js gelistiricisin. Proje: KlinikAsistan SaaS (Next.js 14, Tailwind CSS, Prisma, PostgreSQL). Proje dizini: ' + PROJECT_DIR + '. Dosyalar:\n' + fileList + '\n\nKURALLAR:\n- Yanitini SADECE JSON formatinda ver\n- JSON: { "changes": [{ "file": "dosya/yolu", "action": "create|edit", "content": "tam icerik (create)", "search": "eski metin (edit)", "replace": "yeni metin (edit)" }], "summary": "ozet" }\n- Turkce karakter kullan\n- Tailwind CSS kullan',
      messages: [{ role: 'user', content: 'Su degisikligi yap: ' + instruction }]
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    let changes;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON bulunamadi');
      changes = JSON.parse(jsonMatch[0]);
    } catch {
      bot.sendMessage(msg.chat.id, '⚠️ AI yaniti parse edilemedi:\n' + text.slice(0, 3000));
      return;
    }
    let applied = 0;
    for (const change of changes.changes) {
      const filePath = path.join(PROJECT_DIR, change.file);
      try {
        if (change.action === 'create') {
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filePath, change.content, 'utf-8');
          applied++;
        } else if (change.action === 'edit') {
          if (!fs.existsSync(filePath)) continue;
          let content = fs.readFileSync(filePath, 'utf-8');
          if (content.includes(change.search)) {
            content = content.replace(change.search, change.replace);
            fs.writeFileSync(filePath, content, 'utf-8');
            applied++;
          } else {
            bot.sendMessage(msg.chat.id, '⚠️ Metin bulunamadi: ' + change.file);
          }
        }
      } catch (e: any) {
        bot.sendMessage(msg.chat.id, '❌ Dosya hatasi (' + change.file + '): ' + e.message);
      }
    }
    bot.sendMessage(msg.chat.id, '📝 ' + applied + '/' + changes.changes.length + ' degisiklik uygulandi.\n' + changes.summary + '\n\n🔨 Build basliyor...');
    const build = runCmd('npm run build');
    if (build.includes('HATA') || (build.includes('Error') && build.includes('Failed'))) {
      bot.sendMessage(msg.chat.id, '❌ Build hatasi! Geri aliniyor...\n' + build.slice(-2000));
      runCmd('git checkout -- .');
      return;
    }
    runCmd('git add -A');
    runCmd('git commit -m "telegram-agent: ' + instruction.slice(0, 50) + '"');
    runCmd('git push origin main');
    runCmd('pm2 restart klinik-web');
    bot.sendMessage(msg.chat.id, '🎉 Tamamlandi!\n\n✅ ' + applied + ' dosya guncellendi\n✅ Build basarili\n✅ Git push yapildi\n✅ Site yeniden baslatildi\n\n📋 ' + changes.summary);
  } catch (e: any) {
    bot.sendMessage(msg.chat.id, '❌ Hata: ' + e.message);
  }
});

bot.onText(/\/yardim|\/help|\/start/, (msg) => {
  if (!isAuthorized(msg.chat.id)) return;
  bot.sendMessage(msg.chat.id, '🤖 KlinikDev Agent\n\nKomutlar:\n/kod <talimat> - AI ile kod degisikligi\n/deploy - Git pull + rebuild\n/status - Sunucu durumu\n/logs [app] - PM2 loglari\n/dosya <yol> - Dosya icerigi\n/geri - Son degisikligi geri al\n/yardim - Bu mesaj\n\nOrnek:\n/kod Hero basligini degistir\n/kod Yeni sayfa ekle: Stok Takibi');
});

console.log('🤖 KlinikDev Agent baslatildi!');
