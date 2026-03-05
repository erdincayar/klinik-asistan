import Anthropic from "@anthropic-ai/sdk";
import {
  getAppointments,
  getWeeklyAppointments,
  cancelAppointment,
  getIncome,
  getExpenses,
  getReport,
  getCashStatus,
  getPatientInfo,
  getPatientsList,
  getReminders,
  getDailySummary,
  getDetailedReport,
  getTopServices,
  getTopPatients,
  getCommissionReport,
  getStockOverview,
  searchStock,
  getInvoiceSummary,
  sendReminderCommand,
} from "./commands/command-executor";
import { processWhatsAppMessage } from "./whatsapp/message-parser";
import { prisma } from "./prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── Intent Types ────────────────────────────────────────────────────────────

type IntentAction =
  | "SELAMLAMA"
  | "RANDEVU_BUGUN"
  | "RANDEVU_YARIN"
  | "RANDEVU_HAFTA"
  | "RANDEVU_IPTAL"
  | "FINANS_GELIR"
  | "FINANS_GIDER"
  | "FINANS_RAPOR"
  | "FINANS_KASA"
  | "STOK_DURUM"
  | "STOK_ARA"
  | "MUSTERI_ARA"
  | "MUSTERI_LISTE"
  | "HATIRLATMA"
  | "HATIRLATMA_GONDER"
  | "GUNLUK_OZET"
  | "DETAYLI_RAPOR"
  | "TOP_SERVIS"
  | "TOP_MUSTERI"
  | "PRIM_RAPOR"
  | "FATURA_OZET"
  | "VERI_GIRISI"
  | "YARDIM"
  | "SERBEST_SORU";

interface ClassifiedIntent {
  action: IntentAction;
  param?: string;
}

// ── System Prompt ───────────────────────────────────────────────────────────

function buildClassifierPrompt(): string {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const dayOfWeek = dayNames[today.getDay()];

  return `Sen bir işletme yönetim asistanısın. Kullanıcının mesajını analiz et ve bir aksiyona eşle.

KRİTİK KURAL: HER mesaj bir aksiyona eşlenmeli. ASLA "bu bir bilgi talebi", "bu bir işlem değil" gibi yanıtlar verme. Bilgi talebi = veri çekme aksiyonu.

Bugün: ${todayStr} (${dayOfWeek})

## Aksiyonlar

SELAMLAMA: Selamlama, merhaba, selam, hi, günaydın, iyi akşamlar, nasılsın, naber
RANDEVU_BUGUN: Bugünkü randevular hakkında HER ŞEY ("bugün randevum var mı", "bugünkü randevularımı göster", "bugün kimler gelecek", "bugünkü randevularımı öğrenebilir miyim", "bugün ne var")
RANDEVU_YARIN: Yarınki randevular ("yarın randevum var mı", "yarınki program", "yarın kimler var")
RANDEVU_HAFTA: Haftalık randevular ("bu hafta kaç randevu var", "haftalık program", "haftanın randevuları")
RANDEVU_IPTAL: Randevu iptali — param: müşteri adı ("Ahmet'in randevusunu iptal et", "Ali randevu iptal")
FINANS_GELIR: Gelir/kazanç/ciro sorgusu ("bu ay ne kadar kazandık", "gelir ne durumda", "bu ayki gelir", "ne kadar para girdi", "kazancım ne kadar", "bu ay kazancım ne")
FINANS_GIDER: Gider/harcama sorgusu ("giderler ne kadar", "bu ay ne harcadık", "harcamalar", "gider durumu")
FINANS_RAPOR: Mali rapor/durum/genel özet ("rapor göster", "aylık rapor", "mali durum", "finansal özet", "gelir gider raporu")
FINANS_KASA: Kasa/bakiye durumu ("kasada ne var", "kasa durumu", "mevcut bakiye", "kasamda ne kadar var")
STOK_DURUM: Genel stok durumu ("stok durumu", "stokta ne var", "düşük stoklar", "stok nasıl", "stoklar ne durumda")
STOK_ARA: Belirli ürün arama — param: ürün adı ("Botox stoku", "Nurederm ne kadar kaldı", "botox kaç tane var")
MUSTERI_ARA: Belirli müşteri bilgisi — param: müşteri adı ("Ahmet'in bilgileri", "Ayşe kaydı", "Mehmet müşteri bilgisi")
MUSTERI_LISTE: Müşteri listesi ("müşteri listesi", "kaç müşterimiz var", "tüm müşteriler")
HATIRLATMA: Hatırlatmaları göster ("hatırlatmalar", "bugün kime hatırlatma var", "hatırlatma listesi")
HATIRLATMA_GONDER: Hatırlatmaları gönder ("hatırlatmaları gönder", "hatırlatma yolla")
GUNLUK_OZET: Günlük genel özet ("günlük özet", "bugün ne var", "özet göster", "günün durumu", "genel durum")
DETAYLI_RAPOR: Detaylı rapor ("detaylı rapor", "ayrıntılı rapor", "kapsamlı rapor")
TOP_SERVIS: En çok kazandıran hizmetler ("en çok kazandıran", "popüler işlemler", "hangi işlem çok yapılıyor")
TOP_MUSTERI: En çok gelen müşteriler ("en iyi müşteriler", "sadık müşteriler", "en çok gelen")
PRIM_RAPOR: Çalışan primleri ("prim raporu", "çalışan primleri", "personel primleri")
FATURA_OZET: Fatura durumu ("fatura durumu", "bu ay kaç fatura kesildi", "fatura özeti")
YARDIM: Ne yapabilirsin, yardım, nasıl kullanırım, komutlar

VERI_GIRISI: Yeni kayıt oluşturma — kişi adı + tarih/saat + işlem, veya kişi adı + işlem + tutar, veya gider açıklaması + tutar, veya ürün + miktar + geldi/kullanıldı
Örnekler: "Ahmet yarın 15:00 dolgu", "Ayşe botoks 5000tl", "Kira 25000tl ödendi", "Botox 5 kutu geldi"

SERBEST_SORU: Yukarıdakilerin hiçbirine uymayan AMA yine de işletmeyle ilgili olabilecek sorular. Bu kategori SADECE diğer hiçbir kategori uymadığında kullanılır.

## Eşleme Kuralları
- "var mı", "ne kadar", "göster", "listele", "öğrenebilir miyim", "nedir", "nasıl", "durum" → her zaman ilgili SORGU aksiyonu
- Randevu kelimesi geçen HER mesaj → RANDEVU_BUGUN/YARIN/HAFTA (hangisi uygunsa)
- Gelir/kazanç/ciro kelimesi geçen HER mesaj → FINANS_GELIR
- Gider/harcama kelimesi geçen HER mesaj → FINANS_GIDER
- Stok kelimesi geçen HER mesaj → STOK_DURUM veya STOK_ARA
- Müşteri/hasta kelimesi geçen HER mesaj → MUSTERI_ARA veya MUSTERI_LISTE
- Kişi adı + zaman + işlem türü → VERI_GIRISI
- Kişi adı + işlem + tutar → VERI_GIRISI
- Belirsiz durumlarda GUNLUK_OZET tercih et (SERBEST_SORU yerine)

SADECE JSON döndür: {"action":"AKSIYON_ADI","param":"varsa parametre"}
param sadece RANDEVU_IPTAL, STOK_ARA, MUSTERI_ARA için gerekli.`;
}

// ── Intent Classification ───────────────────────────────────────────────────

async function classifyIntent(message: string): Promise<ClassifiedIntent> {
  // Quick keyword matching for common patterns (no API call needed)
  const lower = message.toLowerCase().trim();

  // Greetings
  if (/^(merhaba|selam|hi|hey|hello|günaydın|iyi akşamlar|iyi günler|naber|nasılsın)\b/.test(lower)) {
    return { action: "SELAMLAMA" };
  }

  // Help
  if (/^(yardım|yardim|help|ne yapabilirsin|komutlar|\/yardim|\/help)\b/.test(lower)) {
    return { action: "YARDIM" };
  }

  // Try AI classification
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.length < 10) {
    // No API key — try basic keyword matching
    return keywordFallback(lower);
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      system: buildClassifierPrompt(),
      messages: [{ role: "user", content: message }],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    if (!textBlock) return keywordFallback(lower);

    let jsonStr = textBlock.text.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    const action = parsed.action as IntentAction;

    // Validate action is a known type
    if (!VALID_ACTIONS.has(action)) {
      return keywordFallback(lower);
    }

    return {
      action,
      param: parsed.param || undefined,
    };
  } catch (error) {
    console.error("[BotAI] Classification error:", error);
    return keywordFallback(lower);
  }
}

const VALID_ACTIONS = new Set<string>([
  "SELAMLAMA", "RANDEVU_BUGUN", "RANDEVU_YARIN", "RANDEVU_HAFTA", "RANDEVU_IPTAL",
  "FINANS_GELIR", "FINANS_GIDER", "FINANS_RAPOR", "FINANS_KASA",
  "STOK_DURUM", "STOK_ARA", "MUSTERI_ARA", "MUSTERI_LISTE",
  "HATIRLATMA", "HATIRLATMA_GONDER", "GUNLUK_OZET", "DETAYLI_RAPOR",
  "TOP_SERVIS", "TOP_MUSTERI", "PRIM_RAPOR", "FATURA_OZET",
  "VERI_GIRISI", "YARDIM", "SERBEST_SORU",
]);

// ── Keyword Fallback (when AI is unavailable or fails) ──────────────────────

function keywordFallback(lower: string): ClassifiedIntent {
  if (/randevu|program|kimler gelecek/.test(lower)) {
    if (/yarın|yarin/.test(lower)) return { action: "RANDEVU_YARIN" };
    if (/hafta/.test(lower)) return { action: "RANDEVU_HAFTA" };
    if (/iptal/.test(lower)) return { action: "RANDEVU_IPTAL" };
    return { action: "RANDEVU_BUGUN" };
  }
  if (/gelir|kazanç|kazanc|ciro|kazan/.test(lower)) return { action: "FINANS_GELIR" };
  if (/gider|harcama|harca/.test(lower)) return { action: "FINANS_GIDER" };
  if (/rapor|mali durum|finansal/.test(lower)) return { action: "FINANS_RAPOR" };
  if (/kasa|bakiye/.test(lower)) return { action: "FINANS_KASA" };
  if (/stok|ürün|urun/.test(lower)) return { action: "STOK_DURUM" };
  if (/müşteri|musteri|hasta/.test(lower)) return { action: "MUSTERI_LISTE" };
  if (/hatırlatma|hatirlatma/.test(lower)) return { action: "HATIRLATMA" };
  if (/fatura/.test(lower)) return { action: "FATURA_OZET" };
  if (/prim|komisyon/.test(lower)) return { action: "PRIM_RAPOR" };
  if (/özet|ozet|durum|genel/.test(lower)) return { action: "GUNLUK_OZET" };
  // Default: daily summary is always useful
  return { action: "GUNLUK_OZET" };
}

// ── Date Helpers ────────────────────────────────────────────────────────────

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  return {
    start: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
    label: `${MONTHS[month]} ${year}`,
  };
}

// ── Smart Fallback: Fetch clinic data + AI natural response ─────────────────

async function smartFallback(clinicId: string, userMessage: string): Promise<string> {
  // Fetch clinic summary data
  const today = new Date();
  const dayStart = startOfDayUTC(today);
  const dayEnd = endOfDayUTC(today);
  const monthRange = getCurrentMonthRange();

  const [appointmentCount, incomeResult, expenseResult, lowStockProducts, patientCount] =
    await Promise.all([
      prisma.appointment.count({
        where: { clinicId, date: { gte: dayStart, lte: dayEnd }, status: { not: "CANCELLED" } },
      }),
      prisma.treatment.aggregate({
        where: { clinicId, date: { gte: monthRange.start, lte: monthRange.end } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.expense.aggregate({
        where: { clinicId, date: { gte: monthRange.start, lte: monthRange.end } },
        _sum: { amount: true },
      }),
      prisma.product.findMany({
        where: { clinicId, isActive: true },
        select: { name: true, currentStock: true, minStock: true, unit: true },
      }),
      prisma.patient.count({ where: { clinicId } }),
    ]);

  const totalIncome = incomeResult._sum.amount || 0;
  const totalExpense = expenseResult._sum.amount || 0;
  const lowStock = lowStockProducts.filter((p) => p.currentStock <= p.minStock);

  const clinicData = `İşletme Verileri:
- Bugünkü randevu: ${appointmentCount}
- Bu ay gelir: ${(totalIncome / 100).toLocaleString("tr-TR")} TL (${incomeResult._count.id} işlem)
- Bu ay gider: ${(totalExpense / 100).toLocaleString("tr-TR")} TL
- Toplam müşteri: ${patientCount}
- Düşük stok uyarısı: ${lowStock.length} ürün${lowStock.length > 0 ? " (" + lowStock.map((p) => `${p.name}: ${p.currentStock} ${p.unit}`).join(", ") + ")" : ""}`;

  // Try to get a smart AI response using clinic data
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.length < 10) {
    // No API key — return summary data directly
    return `📋 İşletme Özeti:\n📅 Bugün ${appointmentCount} randevu\n💰 Bu ay gelir: ${(totalIncome / 100).toLocaleString("tr-TR")} TL\n💸 Bu ay gider: ${(totalExpense / 100).toLocaleString("tr-TR")} TL\n👥 Toplam müşteri: ${patientCount}\n${lowStock.length > 0 ? `⚠️ ${lowStock.length} üründe düşük stok` : "✅ Stoklar normal"}`;
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: `Sen bir işletme yönetim asistanısın. Kullanıcının sorusuna aşağıdaki işletme verileriyle yardımcı ol.
Türkçe yanıt ver. Kısa ve bilgilendirici ol. Emoji kullan.
ASLA "bu bilgi mevcut değil" veya "yapamam" deme. Elindeki verilerle en iyi yanıtı ver.

${clinicData}`,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    if (textBlock) return textBlock.text.trim();
  } catch (error) {
    console.error("[BotAI] Smart fallback AI error:", error);
  }

  // Final fallback — return raw data
  return `📋 İşletme Özeti:\n📅 Bugün ${appointmentCount} randevu\n💰 Bu ay gelir: ${(totalIncome / 100).toLocaleString("tr-TR")} TL\n💸 Bu ay gider: ${(totalExpense / 100).toLocaleString("tr-TR")} TL\n👥 Toplam müşteri: ${patientCount}\n${lowStock.length > 0 ? `⚠️ ${lowStock.length} üründe düşük stok` : "✅ Stoklar normal"}\n\nBaşka bir konuda yardım ister misiniz?`;
}

// ── Intent Executor ─────────────────────────────────────────────────────────

async function executeIntent(
  intent: ClassifiedIntent,
  clinicId: string,
  originalMessage: string
): Promise<string> {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  switch (intent.action) {
    case "SELAMLAMA":
      return "👋 Merhaba! Size nasıl yardımcı olabilirim?\n\nBirkaç örnek:\n📅 \"Bugün randevum var mı?\"\n💰 \"Bu ay ne kadar kazandık?\"\n📦 \"Stok durumu nedir?\"\n📊 \"Günlük özet göster\"";

    case "RANDEVU_BUGUN":
      return getAppointments(clinicId, startOfDayUTC(today));

    case "RANDEVU_YARIN":
      return getAppointments(clinicId, startOfDayUTC(tomorrow));

    case "RANDEVU_HAFTA":
      return getWeeklyAppointments(clinicId);

    case "RANDEVU_IPTAL":
      if (!intent.param) return "⚠️ İptal için müşteri adı belirtmelisiniz. Örnek: \"Ahmet'in randevusunu iptal et\"";
      return cancelAppointment(clinicId, intent.param);

    case "FINANS_GELIR": {
      const range = getCurrentMonthRange();
      return getIncome(clinicId, range.start, range.end, range.label);
    }

    case "FINANS_GIDER": {
      const range = getCurrentMonthRange();
      return getExpenses(clinicId, range.start, range.end, range.label);
    }

    case "FINANS_RAPOR": {
      const range = getCurrentMonthRange();
      return getReport(clinicId, range.start, range.end, range.label);
    }

    case "FINANS_KASA":
      return getCashStatus(clinicId);

    case "STOK_DURUM":
      return getStockOverview(clinicId);

    case "STOK_ARA":
      if (!intent.param) return getStockOverview(clinicId);
      return searchStock(clinicId, intent.param);

    case "MUSTERI_ARA":
      if (!intent.param) return getPatientsList(clinicId);
      return getPatientInfo(clinicId, intent.param);

    case "MUSTERI_LISTE":
      return getPatientsList(clinicId);

    case "HATIRLATMA":
      return getReminders(clinicId);

    case "HATIRLATMA_GONDER":
      return sendReminderCommand(clinicId);

    case "GUNLUK_OZET":
      return getDailySummary(clinicId);

    case "DETAYLI_RAPOR":
      return getDetailedReport(clinicId);

    case "TOP_SERVIS":
      return getTopServices(clinicId);

    case "TOP_MUSTERI":
      return getTopPatients(clinicId);

    case "PRIM_RAPOR":
      return getCommissionReport(clinicId);

    case "FATURA_OZET":
      return getInvoiceSummary(clinicId);

    case "VERI_GIRISI": {
      const result = await processWhatsAppMessage(originalMessage, clinicId);
      return result.confirmationMessage;
    }

    case "YARDIM":
      return getHelpMessage();

    case "SERBEST_SORU":
      return smartFallback(clinicId, originalMessage);

    default:
      return smartFallback(clinicId, originalMessage);
  }
}

// ── Help Message ────────────────────────────────────────────────────────────

function getHelpMessage(): string {
  return `🤖 inPobi AI Asistan

Doğal dilde yazabilirsiniz, komut ezberlemenize gerek yok!

📅 Randevu:
• "Bugün randevum var mı?"
• "Yarınki randevular"
• "Bu hafta kaç randevu var?"

💰 Finans:
• "Bu ay ne kadar kazandık?"
• "Giderler ne durumda?"
• "Kasada ne kadar var?"

📦 Stok:
• "Stok durumu nedir?"
• "Botox ne kadar kaldı?"

👤 Müşteri:
• "Ahmet'in bilgilerini göster"
• "Müşteri listesi"

📊 Raporlar:
• "Detaylı rapor"
• "En çok kazandıran işlemler"

📝 Veri Girişi:
• "Ahmet yarın 15:00 dolgu" (randevu)
• "Ayşe botoks 5000tl" (gelir)
• "Kira 25000tl ödendi" (gider)`;
}

// ── Main Export ──────────────────────────────────────────────────────────────

export interface BotResponse {
  response: string;
  intent: IntentAction;
}

export async function handleBotMessage(
  clinicId: string,
  message: string
): Promise<BotResponse> {
  try {
    const intent = await classifyIntent(message);

    console.log(`[BotAI] Message: "${message}" → Intent: ${intent.action}${intent.param ? ` (${intent.param})` : ""}`);

    const response = await executeIntent(intent, clinicId, message);

    return { response, intent: intent.action };
  } catch (error) {
    console.error("[BotAI] Error:", error);
    // Even on error, try to return something useful
    try {
      const fallback = await smartFallback(clinicId, message);
      return { response: fallback, intent: "SERBEST_SORU" };
    } catch {
      return {
        response: "👋 Bir hata oluştu ama buradayım! Tekrar deneyin veya \"yardım\" yazın.",
        intent: "SERBEST_SORU",
      };
    }
  }
}
