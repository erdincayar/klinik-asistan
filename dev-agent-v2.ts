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
    return execSync(cmd, { cwd, timeout: 180000, encoding: 'utf-8' });
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

function readProjectStructure(): string {
  const fileList = runCmd("find src -type f \\( -name '*.tsx' -o -name '*.ts' \\) | sort");
  return fileList;
}

function readFile(filePath: string): string {
  const full = path.join(PROJECT_DIR, filePath);
  if (!fs.existsSync(full)) return '';
  return fs.readFileSync(full, 'utf-8');
}

function findRelevantFiles(instruction: string): string[] {
  const keywords: Record<string, string[]> = {
    'ana sayfa|landing|hero|anasayfa': ['src/app/page.tsx'],
    'sidebar|menu|navigasyon': ['src/app/(dashboard)/layout.tsx'],
    'dashboard|genel bakis|ozet': ['src/app/(dashboard)/dashboard/page.tsx'],
    'finans|gelir|gider|kasa': ['src/app/(dashboard)/finance/page.tsx', 'src/app/api/finance/route.ts'],
    'hasta|patient': ['src/app/(dashboard)/patients/page.tsx', 'src/app/api/patients/route.ts'],
    'randevu|appointment|takvim': ['src/app/(dashboard)/appointments/page.tsx', 'src/app/api/appointments/route.ts'],
    'rapor|report|analiz': ['src/app/(dashboard)/reports/page.tsx', 'src/app/api/reports/route.ts'],
    'hatirlatma|reminder': ['src/app/(dashboard)/reminders/page.tsx'],
    'calisan|employee|prim': ['src/app/(dashboard)/employees/page.tsx'],
    'ayar|setting|profil': ['src/app/(dashboard)/settings/page.tsx'],
    'whatsapp|mesaj': ['src/app/(dashboard)/whatsapp/page.tsx', 'src/lib/whatsapp/message-parser.ts'],
    'telegram|bot': ['src/lib/telegram/real-bot.ts'],
    'ai asistan|yapay zeka': ['src/app/(dashboard)/ai-assistant/page.tsx', 'src/lib/ai/claude.ts'],
    'login|giris|auth|kayit|register': ['src/app/(auth)/login/page.tsx', 'src/app/(auth)/register/page.tsx'],
    'onboarding|baslangic|kurulum': ['src/app/onboarding/page.tsx'],
    'prisma|veritabani|schema|model': ['prisma/schema.prisma'],
    'renk|tema|style|tasarim': ['src/app/globals.css', 'tailwind.config.ts'],
    'stok|envanter|urun': ['prisma/schema.prisma'],
  };

  const lower = instruction.toLowerCase();
  const files: string[] = [];

  for (const [pattern, paths] of Object.entries(keywords)) {
    const parts = pattern.split('|');
    if (parts.some(p => lower.includes(p))) {
      files.push(...paths);
    }
  }

  if (files.length === 0) {
    files.push('src/app/page.tsx', 'src/app/(dashboard)/layout.tsx', 'prisma/schema.prisma');
  }

  return [...new Set(files)].filter(f => fs.existsSync(path.join(PROJECT_DIR, f)));
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

bot.onText(/\/kod\s+(.+)/, async (msg, match) => {
  if (!isAuthorized(msg.chat.id)) return;
  const instruction = match![1];
  bot.sendMessage(msg.chat.id, '🤖 Çalışıyorum: "' + instruction + '"');

  try {
    const relevantFiles = findRelevantFiles(instruction);
    bot.sendMessage(msg.chat.id, '📂 İlgili dosyalar: ' + relevantFiles.join(', '));

    let fileContents = '';
    for (const f of relevantFiles) {
      const content = readFile(f);
      if (content.length > 8000) {
        fileContents += '\n\n--- ' + f + ' (ilk 8000 karakter) ---\n' + content.slice(0, 8000);
      } else {
        fileContents += '\n\n--- ' + f + ' ---\n' + content;
      }
    }

    const allFiles = readProjectStructure();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: `Sen KlinikAsistan projesinin gelistiricisisin. Next.js 14, Tailwind CSS, Prisma, PostgreSQL, shadcn/ui kullaniliyor.
Proje dizini: ${PROJECT_DIR}

PROJE DOSYALARI:
${allFiles}

ILGILI DOSYA ICERIKLERI:
${fileContents}

KURALLAR:
1. Kullanici kisa ve basit talimatlar verecek. Sen dosyalari zaten goruyorsun, ne yapman gerektigini anla.
2. Yanitini SADECE JSON formatinda ver, baska hicbir sey yazma.
3. JSON formati:
{
  "changes": [
    {
      "file": "src/app/page.tsx",
      "action": "edit",
      "search": "degistirilecek TAM metin (dosyadaki haliyle, bosluklar dahil)",
      "replace": "yeni metin"
    }
  ],
  "summary": "Turkce ozet"
}
4. edit icin search alani dosyadaki BIREBIR ayni metni icermeli. Bosluklar, satirlar, her sey ayni olmali.
5. Yeni dosya olusturmak icin action: "create" ve content: "tam dosya icerigi" kullan.
6. Turkce karakter kullan (i, s, g, u, o, c degil -> ı, ş, ğ, ü, ö, ç)
7. Tailwind CSS kullan, inline style kullanma.
8. Yeni sayfa ekliyorsan sidebar menusune de ekle.
9. Yeni model ekliyorsan prisma schema ve API route da ekle.
10. Her zaman calisan, build hatasi vermeyecek kod yaz.`,
      messages: [{ role: 'user', content: instruction }]
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
          bot.sendMessage(msg.chat.id, '✅ Oluşturuldu: ' + change.file);
        } else if (change.action === 'edit') {
          if (!fs.existsSync(filePath)) {
            bot.sendMessage(msg.chat.id, '⚠️ Dosya yok: ' + change.file);
            continue;
          }
          let content = fs.readFileSync(filePath, 'utf-8');
          if (content.includes(change.search)) {
            content = content.replace(change.search, change.replace);
            fs.writeFileSync(filePath, content, 'utf-8');
            applied++;
            bot.sendMessage(msg.chat.id, '✅ Güncellendi: ' + change.file);
          } else {
            bot.sendMessage(msg.chat.id, '⚠️ Metin bulunamadı: ' + change.file);
          }
        } else if (change.action === 'delete') {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            applied++;
            bot.sendMessage(msg.chat.id, '✅ Silindi: ' + change.file);
          }
        }
      } catch (e: any) {
        bot.sendMessage(msg.chat.id, '❌ Hata (' + change.file + '): ' + e.message);
      }
    }

    bot.sendMessage(msg.chat.id, '📝 ' + applied + '/' + changes.changes.length + ' değişiklik uygulandı.\n📋 ' + changes.summary + '\n\n🔨 Build başlıyor...');

    const build = runCmd('npm run build');
    if (build.includes('HATA') || (build.includes('Type error') || build.includes('Module not found'))) {
      bot.sendMessage(msg.chat.id, '❌ Build hatası! Geri alınıyor...\n' + build.slice(-2000));
      runCmd('git checkout -- .');
      return;
    }

    runCmd('git add -A');
    runCmd('git commit -m "telegram-agent: ' + instruction.slice(0, 50) + '"');
    runCmd('git push origin main');
    runCmd('pm2 restart klinik-web');

    bot.sendMessage(msg.chat.id, '🎉 Tamamlandı!\n\n✅ ' + applied + ' dosya güncellendi\n✅ Build başarılı\n✅ Git push yapıldı\n✅ Site güncellendi\n\n📋 ' + changes.summary);

  } catch (e: any) {
    bot.sendMessage(msg.chat.id, '❌ Hata: ' + e.message);
  }
});

bot.onText(/\/yardim|\/help|\/start/, (msg) => {
  if (!isAuthorized(msg.chat.id)) return;
  bot.sendMessage(msg.chat.id, '🤖 KlinikDev Agent v2\n\nKomutlar:\n/kod <ne istiyorsan yaz> - AI kod değişikliği\n/deploy - Git pull + rebuild\n/status - Sunucu durumu\n/logs [app] - Loglar\n/dosya <yol> - Dosya oku\n/geri - Geri al\n/yardim - Bu mesaj\n\nÖrnekler:\n/kod hero başlığını değiştir\n/kod sidebar a stok takibi ekle\n/kod finans sayfasındaki renkleri değiştir\n/kod yeni modül ekle: Stok Takibi\n/kod login sayfasına logo ekle');
});

console.log('🤖 KlinikDev Agent v2 başlatıldı!');
