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
import { parseWhatsAppMessage, findOrCreatePatient } from "./whatsapp/message-parser";
import { prisma } from "./prisma";
import {
  getConversationState,
  setConversationState,
  clearConversationState,
  type ConversationState,
  type PendingAppointmentData,
} from "./bot-conversation-state";
import { TOKEN_COSTS } from "./token-costs";
import { checkBalance, deductTokens } from "./token-service";

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

// ── Employee Selection Helpers ──────────────────────────────────────────────

async function checkTimeConflict(
  clinicId: string,
  employeeId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ hasConflict: boolean; conflictInfo?: string }> {
  const dayStart = startOfDayUTC(new Date(date));
  const dayEnd = endOfDayUTC(new Date(date));

  const existing = await prisma.appointment.findMany({
    where: {
      clinicId,
      employeeId,
      date: { gte: dayStart, lte: dayEnd },
      status: { not: "CANCELLED" },
    },
    include: { patient: { select: { name: true } } },
  });

  for (const apt of existing) {
    // Simple time overlap check: if new start < existing end AND new end > existing start
    if (startTime < apt.endTime && endTime > apt.startTime) {
      return {
        hasConflict: true,
        conflictInfo: `${apt.patient.name} - ${apt.startTime}-${apt.endTime}`,
      };
    }
  }

  return { hasConflict: false };
}

async function createAppointmentWithEmployee(
  patientId: string,
  patientName: string,
  date: string,
  time: string,
  endTime: string,
  treatmentType: string,
  notes: string,
  employeeId: string | undefined,
  employeeName: string | undefined,
  clinicId: string
): Promise<string> {
  const appointment = await prisma.appointment.create({
    data: {
      patientId,
      clinicId,
      employeeId: employeeId || null,
      date: new Date(date),
      startTime: time,
      endTime,
      treatmentType,
      notes: notes || null,
      status: "SCHEDULED",
    },
  });

  const dateFormatted = new Date(date).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const treatmentLabel =
    { BOTOX: "Botoks", DOLGU: "Dolgu", DIS_TEDAVI: "Diş Tedavi", GENEL: "Genel" }[treatmentType] || treatmentType;

  let msg = `✅ Randevu oluşturuldu:\n📋 ${patientName}\n📅 ${dateFormatted} saat ${time}\n💉 ${treatmentLabel}`;
  if (employeeName) msg += `\n👤 ${employeeName}`;
  if (notes) msg += `\n📝 ${notes}`;

  return msg;
}

async function handleDataEntry(
  message: string,
  clinicId: string,
  senderId: string
): Promise<string> {
  const parsed = await parseWhatsAppMessage(message);

  if (parsed.type === "ERROR") {
    return `❌ ${parsed.message}`;
  }

  if (parsed.type === "AMBIGUOUS") {
    const options = parsed.options.map((o, i) => `${i + 1}. ${o}`).join("\n");
    return `🤔 ${parsed.message}\n\n${options}\n\nLütfen netleştirerek tekrar yazın.`;
  }

  // For APPOINTMENT type, go through employee selection flow
  if (parsed.type === "APPOINTMENT") {
    const { patient, isNew } = await findOrCreatePatient(parsed.patientName, clinicId);

    // Calculate endTime (30 min after startTime)
    const [h, m] = parsed.time.split(":").map(Number);
    const endMinutes = h * 60 + m + 30;
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

    // Fetch active employees
    const employees = await prisma.employee.findMany({
      where: { clinicId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const newPatientNote = isNew ? `\n\n⚠️ Yeni müşteri kaydı oluşturuldu: ${patient.name}` : "";

    if (employees.length === 0) {
      // No employees — create without employee
      const msg = await createAppointmentWithEmployee(
        patient.id, patient.name, parsed.date, parsed.time, endTime,
        parsed.treatmentType, parsed.notes, undefined, undefined, clinicId
      );
      return msg + newPatientNote;
    }

    if (employees.length === 1) {
      // Single employee — auto-assign, check conflict
      const emp = employees[0];
      const conflict = await checkTimeConflict(clinicId, emp.id, parsed.date, parsed.time, endTime);

      if (conflict.hasConflict) {
        // Store state and ask for confirmation
        const convKey = senderId;
        setConversationState(convKey, {
          step: "AWAITING_CONFLICT_CONFIRM",
          clinicId,
          pendingAppointment: {
            patientId: patient.id,
            patientName: patient.name,
            date: parsed.date,
            time: parsed.time,
            endTime,
            treatmentType: parsed.treatmentType,
            notes: parsed.notes,
            employees,
            selectedEmployeeId: emp.id,
            selectedEmployeeName: emp.name,
          },
          createdAt: Date.now(),
        });

        return `⚠️ ${emp.name} için ${parsed.time} saatinde çakışma var!\nMevcut randevu: ${conflict.conflictInfo}\n\nYine de oluşturmak istiyor musunuz? (evet/hayır)` + newPatientNote;
      }

      const msg = await createAppointmentWithEmployee(
        patient.id, patient.name, parsed.date, parsed.time, endTime,
        parsed.treatmentType, parsed.notes, emp.id, emp.name, clinicId
      );
      return msg + newPatientNote;
    }

    // Multiple employees — ask which one
    const convKey = senderId;
    setConversationState(convKey, {
      step: "AWAITING_EMPLOYEE",
      clinicId,
      pendingAppointment: {
        patientId: patient.id,
        patientName: patient.name,
        date: parsed.date,
        time: parsed.time,
        endTime,
        treatmentType: parsed.treatmentType,
        notes: parsed.notes,
        employees,
      },
      createdAt: Date.now(),
    });

    const empList = employees.map((e, i) => `${i + 1}. ${e.name}`).join("\n");
    const dateFormatted = new Date(parsed.date).toLocaleDateString("tr-TR", {
      weekday: "long", day: "numeric", month: "long",
    });
    const treatmentLabel =
      { BOTOX: "Botoks", DOLGU: "Dolgu", DIS_TEDAVI: "Diş Tedavi", GENEL: "Genel" }[parsed.treatmentType] || parsed.treatmentType;

    return `📋 ${patient.name} - ${dateFormatted} ${parsed.time} - ${treatmentLabel}\n\n👤 Hangi çalışana atansın?\n${empList}\n\nNumara yazın veya "iptal" yazarak vazgeçin.` + newPatientNote;
  }

  // For non-APPOINTMENT types, use the original processWhatsAppMessage flow
  const { processWhatsAppMessage } = await import("./whatsapp/message-parser");
  const result = await processWhatsAppMessage(message, clinicId);
  return result.confirmationMessage;
}

async function handleEmployeeSelection(
  convKey: string,
  state: ConversationState,
  message: string
): Promise<string> {
  const pending = state.pendingAppointment!;
  const lower = message.toLowerCase().trim();

  // Try to parse number
  const num = parseInt(lower, 10);
  if (isNaN(num) || num < 1 || num > pending.employees.length) {
    return `⚠️ Lütfen 1-${pending.employees.length} arası bir numara yazın veya "iptal" yazın.\n\n${pending.employees.map((e, i) => `${i + 1}. ${e.name}`).join("\n")}`;
  }

  const selectedEmployee = pending.employees[num - 1];

  // Check for time conflicts
  const conflict = await checkTimeConflict(
    state.clinicId, selectedEmployee.id, pending.date, pending.time, pending.endTime
  );

  if (conflict.hasConflict) {
    // Update state to conflict confirmation
    setConversationState(convKey, {
      ...state,
      step: "AWAITING_CONFLICT_CONFIRM",
      pendingAppointment: {
        ...pending,
        selectedEmployeeId: selectedEmployee.id,
        selectedEmployeeName: selectedEmployee.name,
      },
      createdAt: Date.now(),
    });

    return `⚠️ ${selectedEmployee.name} için ${pending.time} saatinde çakışma var!\nMevcut randevu: ${conflict.conflictInfo}\n\nYine de oluşturmak istiyor musunuz? (evet/hayır)`;
  }

  // No conflict — create appointment
  clearConversationState(convKey);

  return createAppointmentWithEmployee(
    pending.patientId, pending.patientName, pending.date, pending.time, pending.endTime,
    pending.treatmentType, pending.notes, selectedEmployee.id, selectedEmployee.name, state.clinicId
  );
}

async function handleConflictConfirmation(
  convKey: string,
  state: ConversationState,
  message: string
): Promise<string> {
  const pending = state.pendingAppointment!;
  const lower = message.toLowerCase().trim();

  if (/^(evet|e|yes|y|olsun|tamam|ok)/.test(lower)) {
    clearConversationState(convKey);
    return createAppointmentWithEmployee(
      pending.patientId, pending.patientName, pending.date, pending.time, pending.endTime,
      pending.treatmentType, pending.notes,
      pending.selectedEmployeeId, pending.selectedEmployeeName, state.clinicId
    );
  }

  if (/^(hayır|hayir|h|no|n|vazgeç|vazgec|iptal)/.test(lower)) {
    clearConversationState(convKey);
    return "❌ Randevu oluşturma iptal edildi.";
  }

  return "Lütfen 'evet' veya 'hayır' yazın.";
}

// ── Intent Executor ─────────────────────────────────────────────────────────

async function executeIntent(
  intent: ClassifiedIntent,
  clinicId: string,
  originalMessage: string,
  senderId: string
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

    case "VERI_GIRISI":
      return handleDataEntry(originalMessage, clinicId, senderId);

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

// ── Slash Command Handler (Token-free) ───────────────────────────────────────

async function handleSlashCommand(clinicId: string, command: string): Promise<string | null> {
  const cmd = command.toLowerCase().trim();

  if (cmd === "/randevu") {
    return getAppointments(clinicId, startOfDayUTC(new Date()));
  }
  if (cmd === "/yarın" || cmd === "/yarin") {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return getAppointments(clinicId, startOfDayUTC(tomorrow));
  }
  if (cmd === "/gelir") {
    const range = getCurrentMonthRange();
    return getIncome(clinicId, range.start, range.end, range.label);
  }
  if (cmd === "/gider") {
    const range = getCurrentMonthRange();
    return getExpenses(clinicId, range.start, range.end, range.label);
  }
  if (cmd === "/stok") {
    return getStockOverview(clinicId);
  }
  if (cmd === "/müşteri" || cmd === "/musteri") {
    return getPatientsList(clinicId);
  }
  if (cmd === "/rapor") {
    return getDailySummary(clinicId);
  }
  if (cmd === "/yardım" || cmd === "/yardim") {
    return getSlashHelpMessage();
  }

  return null;
}

function getSlashHelpMessage(): string {
  return `📋 Komutlar (token harcamaz):

/randevu — Bugünkü randevular
/yarın — Yarınki randevular
/gelir — Bu ayki gelir
/gider — Bu ayki giderler
/stok — Stok durumu
/müşteri — Müşteri listesi
/rapor — Günlük özet
/yardım — Bu mesaj

💬 Serbest metin yazarak AI asistanla da konuşabilirsiniz (1000 token harcar).`;
}

// ── Main Export ──────────────────────────────────────────────────────────────

export interface BotResponse {
  response: string;
  intent: IntentAction;
}

export async function handleBotMessage(
  clinicId: string,
  message: string,
  senderId: string = "unknown"
): Promise<BotResponse> {
  try {
    const lower = message.toLowerCase().trim();

    // Check for cancel/abort commands first
    if (/^(iptal|vazgeç|vazgec|cancel)$/.test(lower)) {
      const state = getConversationState(senderId);
      if (state && state.step !== "IDLE") {
        clearConversationState(senderId);
        return { response: "❌ İşlem iptal edildi.", intent: "SERBEST_SORU" };
      }
    }

    // Check conversation state first
    const convState = getConversationState(senderId);
    if (convState) {
      if (convState.step === "AWAITING_EMPLOYEE") {
        const response = await handleEmployeeSelection(senderId, convState, message);
        return { response, intent: "VERI_GIRISI" };
      }
      if (convState.step === "AWAITING_CONFLICT_CONFIRM") {
        const response = await handleConflictConfirmation(senderId, convState, message);
        return { response, intent: "VERI_GIRISI" };
      }
    }

    // Slash commands — no token cost
    if (message.trim().startsWith("/")) {
      const slashResponse = await handleSlashCommand(clinicId, message.trim());
      if (slashResponse !== null) {
        return { response: slashResponse, intent: "YARDIM" };
      }
    }

    // Free-text AI — check token balance
    const tokenAction = senderId.startsWith("telegram:") ? "TELEGRAM_BOT_AI" : "WHATSAPP_BOT_AI";
    const tokenCost = TOKEN_COSTS[tokenAction];

    const hasBalance = await checkBalance(clinicId, tokenCost);
    if (!hasBalance) {
      return {
        response: "⚠️ Token bakiyeniz yetersiz. Komutları kullanmak için / ile başlayın.\n\nÖrnek: /randevu, /gelir, /stok, /yardım",
        intent: "SERBEST_SORU",
      };
    }

    // Normal intent classification
    const intent = await classifyIntent(message);

    console.log(`[BotAI] Message: "${message}" → Intent: ${intent.action}${intent.param ? ` (${intent.param})` : ""}`);

    const response = await executeIntent(intent, clinicId, message, senderId);

    // Deduct tokens after successful AI response
    await deductTokens(clinicId, tokenAction, tokenCost);

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
