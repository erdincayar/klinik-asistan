import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ParsedAppointment {
  type: "APPOINTMENT";
  patientName: string;
  date: string;
  time: string;
  treatmentType: string;
  notes: string;
}

export interface ParsedIncome {
  type: "INCOME";
  patientName: string;
  treatmentType: string;
  treatmentName: string;
  amount: number;
  notes: string;
}

export interface ParsedExpense {
  type: "EXPENSE";
  description: string;
  amount: number;
  category: string;
}

export interface ParsedAmbiguous {
  type: "AMBIGUOUS";
  message: string;
  originalText: string;
  options: string[];
}

export interface ParseError {
  type: "ERROR";
  message: string;
  originalText: string;
}

export type ParsedMessage =
  | ParsedAppointment
  | ParsedIncome
  | ParsedExpense
  | ParsedAmbiguous
  | ParseError;

function buildSystemPrompt(): string {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dayNames = [
    "Pazar",
    "Pazartesi",
    "Salı",
    "Çarşamba",
    "Perşembe",
    "Cuma",
    "Cumartesi",
  ];
  const dayOfWeek = dayNames[today.getDay()];

  // Pre-calculate upcoming dates for each day name
  const upcomingDates: Record<string, string> = {};
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const name = dayNames[d.getDay()].toLowerCase();
    if (!upcomingDates[name]) {
      upcomingDates[name] = d.toISOString().split("T")[0];
    }
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  return `Sen bir klinik yönetim sistemi için WhatsApp mesaj ayrıştırıcısısın.
Doktorun doğal dilde yazdığı kısa Türkçe mesajları yapılandırılmış JSON verisine dönüştürüyorsun.

## Bugünün Bilgileri
- Bugün: ${todayStr} (${dayOfWeek})
- Yarın: ${tomorrowStr}
- Yaklaşan günler: ${Object.entries(upcomingDates).map(([day, date]) => `${day} → ${date}`).join(", ")}

## 3 Mesaj Tipi

### 1. RANDEVU (APPOINTMENT)
Hasta adı + zaman bilgisi (gün/saat) içeren mesajlar.
Örnekler:
- "erdinç ayar çarşamba 3 dolgu randevu" → Erdinç Ayar, çarşamba 15:00, Dolgu
- "Ayşe Yılmaz pazartesi saat 3 botoks kontrol" → randevu
- "Mehmet yarın 14:30 dolgu" → randevu
- "yarın 2ye mehmet diş tedavi" → Mehmet, yarın 14:00, Diş tedavi
- "ali bey cuma 10 diş tedavi" → randevu
- "zeynep 15:00 botoks" → bugün 15:00 randevu (gün belirtilmemişse bugün)

### 2. GELİR (INCOME)
Hasta adı + işlem/tedavi + tutar (TL/lira) içeren mesajlar. Bir kişiye yapılan işlem ve ödeme.
Örnekler:
- "Kerem İnanır dolgu 5000tl alındı" → Kerem İnanır, Dolgu, 5000 TL
- "Ayşe botoks 3000tl" → Ayşe, Botoks, 3000 TL
- "Fatma hanım botoks 3500 lira" → gelir
- "Ahmet bey diş tedavi 2000tl ödendi" → gelir
- "mehmet 7500tl dolgu" → gelir

### 3. GİDER (EXPENSE)
Hasta adı OLMAYAN, ürün/malzeme/kira/fatura/maaş gibi işletme gideri + tutar içeren mesajlar.
Örnekler:
- "Nurederm ürün alındı 50000tl ödendi" → Nurederm ürün alımı, 50000 TL
- "Kira 25000 ödendi" → Kira, 25000 TL
- "malzeme alımı 15000tl" → Malzeme alımı, 15000 TL
- "Elektrik faturası 3500tl" → gider
- "maaş 20000tl" → gider

### 4. BELİRSİZ (AMBIGUOUS)
Eğer mesaj birden fazla şekilde yorumlanabiliyorsa (örneğin gelir mi gider mi belli değilse), AMBIGUOUS döndür ve seçenekleri sun.

## Saat Kuralları
- Tek sayı saat: 1-6 arası → öğleden sonra kabul et (1→13:00, 2→14:00, 3→15:00, 4→16:00, 5→17:00, 6→18:00)
- Tek sayı saat: 7-12 arası → sabah kabul et (7→07:00, 8→08:00, 9→09:00, 10→10:00, 11→11:00, 12→12:00)
- "saat 3" → 15:00, "3e" veya "3'e" → 15:00, "2ye" veya "2'ye" → 14:00
- "14:30" → 14:30 (24 saat formatı direkt al)
- Saat belirtilmemişse ve randevu ise: "09:00" varsayılan

## Gün Kuralları
- "bugün" → ${todayStr}
- "yarın" → ${tomorrowStr}
- "pazartesi", "salı", vb. → yaklaşan ilk o gün (yukarıdaki tarihleri kullan)
- Gün belirtilmemişse ve randevu ise: bugünü kullan (${todayStr})

## Tutar Kuralları
- Tutarları HER ZAMAN kuruş cinsine çevir: 5000 TL → 500000, 3500 lira → 350000
- "tl", "TL", "Tl", "lira", "₺" hepsini tanı
- Binlik ayraç kullanılabilir: "50.000tl" → 5000000 kuruş

## Tedavi/İşlem Türleri
- "botoks", "botox", "btx" → BOTOX
- "dolgu", "filler" → DOLGU
- "diş", "diş tedavi", "diş tedavisi" → DIS_TEDAVI
- Diğer her şey → GENEL

## Gider Kategorileri
- "malzeme", "ürün", "sarf" → MALZEME
- "kira" → KIRA
- "elektrik", "su", "doğalgaz", "fatura", "internet", "telefon" → FATURA
- "maaş", "personel" → MAAS
- Diğer → DIGER

## Önemli Kurallar
- "hanım", "bey", "hoca" gibi hitap ekleri hasta adına DAHİL ETMEMELİSİN
- Hasta adını düzgün büyük harfle yaz (Title Case): "mehmet" → "Mehmet"
- SADECE JSON döndür, başka hiçbir metin yazma
- JSON markdown code block kullanma, düz JSON döndür`;
}

export async function parseWhatsAppMessage(
  message: string
): Promise<ParsedMessage> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-anthropic-api-key" || apiKey.length < 10) {
    return {
      type: "ERROR",
      message:
        "ANTHROPIC_API_KEY ayarlanmamış. .env dosyasına gerçek API anahtarını ekleyin.",
      originalText: message,
    };
  }

  const systemPrompt = buildSystemPrompt();

  const userPrompt = `Mesaj: "${message}"

Aşağıdaki JSON formatlarından uygun olanını döndür:

RANDEVU:
{"type":"APPOINTMENT","patientName":"Ad Soyad","date":"YYYY-MM-DD","time":"HH:MM","treatmentType":"BOTOX|DOLGU|DIS_TEDAVI|GENEL","notes":"varsa ek not"}

GELİR:
{"type":"INCOME","patientName":"Ad Soyad","treatmentType":"BOTOX|DOLGU|DIS_TEDAVI|GENEL","treatmentName":"işlem açıklaması","amount":kuruş_cinsinden_sayı,"notes":"varsa ek not"}

GİDER:
{"type":"EXPENSE","description":"gider açıklaması","amount":kuruş_cinsinden_sayı,"category":"MALZEME|KIRA|FATURA|MAAS|DIGER"}

BELİRSİZ:
{"type":"AMBIGUOUS","message":"kullanıcıya sorulacak soru","originalText":"orijinal mesaj","options":["seçenek1","seçenek2"]}

HATA:
{"type":"ERROR","message":"neden anlaşılamadı","originalText":"orijinal mesaj"}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    if (!textBlock) {
      return {
        type: "ERROR",
        message: "AI yanıt vermedi",
        originalText: message,
      };
    }

    // Extract JSON - handle both plain JSON and markdown code blocks
    let jsonStr = textBlock.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    return parsed as ParsedMessage;
  } catch (error: any) {
    console.error("[WhatsApp Parser] Error:", error?.message || error);

    if (error?.status === 401) {
      return {
        type: "ERROR",
        message: "API anahtarı geçersiz. .env dosyasındaki ANTHROPIC_API_KEY'i kontrol edin.",
        originalText: message,
      };
    }

    return {
      type: "ERROR",
      message: "Mesaj parse edilemedi. Lütfen tekrar deneyin.",
      originalText: message,
    };
  }
}

export async function findOrCreatePatient(
  name: string,
  clinicId: string,
  phone?: string
): Promise<{ patient: any; isNew: boolean }> {
  const cleanName = name
    .trim()
    .replace(/\s+(hanım|bey|hoca|hocam)$/i, "")
    .trim();
  const nameParts = cleanName.split(/\s+/);
  const firstName = nameParts[0];

  // Try full name match first
  let patient = await prisma.patient.findFirst({
    where: {
      clinicId,
      name: { contains: cleanName },
    },
  });

  // Try first name match
  if (!patient && firstName.length >= 2) {
    patient = await prisma.patient.findFirst({
      where: {
        clinicId,
        name: { contains: firstName },
      },
    });
  }

  if (patient) {
    return { patient, isNew: false };
  }

  // Create new patient
  const newPatient = await prisma.patient.create({
    data: {
      name: cleanName,
      phone: phone || null,
      clinicId,
    },
  });

  return { patient: newPatient, isNew: true };
}

export interface ProcessResult {
  success: boolean;
  parsed: ParsedMessage;
  confirmationMessage: string;
  patientIsNew?: boolean;
  recordId?: string;
}

export async function processWhatsAppMessage(
  message: string,
  clinicId: string
): Promise<ProcessResult> {
  const parsed = await parseWhatsAppMessage(message);

  if (parsed.type === "ERROR") {
    return {
      success: false,
      parsed,
      confirmationMessage: `❌ ${parsed.message}`,
    };
  }

  if (parsed.type === "AMBIGUOUS") {
    const options = parsed.options.map((o, i) => `${i + 1}. ${o}`).join("\n");
    return {
      success: false,
      parsed,
      confirmationMessage: `🤔 ${parsed.message}\n\n${options}\n\nLütfen netleştirerek tekrar yazın.`,
    };
  }

  try {
    if (parsed.type === "APPOINTMENT") {
      const { patient, isNew } = await findOrCreatePatient(
        parsed.patientName,
        clinicId
      );

      // Calculate endTime (30 min after startTime)
      const [h, m] = parsed.time.split(":").map(Number);
      const endMinutes = h * 60 + m + 30;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

      const appointment = await prisma.appointment.create({
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
        weekday: "long",
        day: "numeric",
        month: "long",
      });

      const treatmentLabel =
        { BOTOX: "Botoks", DOLGU: "Dolgu", DIS_TEDAVI: "Diş Tedavi", GENEL: "Genel" }[
          parsed.treatmentType
        ] || parsed.treatmentType;

      let msg = `✅ Randevu oluşturuldu:\n📋 ${patient.name}\n📅 ${dateFormatted} saat ${parsed.time}\n💉 ${treatmentLabel}`;
      if (parsed.notes) msg += `\n📝 ${parsed.notes}`;
      if (isNew) msg += `\n\n⚠️ Yeni hasta kaydı oluşturuldu: ${patient.name}`;

      return {
        success: true,
        parsed,
        confirmationMessage: msg,
        patientIsNew: isNew,
        recordId: appointment.id,
      };
    }

    if (parsed.type === "INCOME") {
      const { patient, isNew } = await findOrCreatePatient(
        parsed.patientName,
        clinicId
      );

      const treatment = await prisma.treatment.create({
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

      let msg = `✅ Gelir kaydedildi:\n👤 ${patient.name}\n💉 ${treatmentLabel}\n💰 ${amountTL} TL`;
      if (isNew) msg += `\n\n⚠️ Yeni hasta kaydı oluşturuldu: ${patient.name}`;

      return {
        success: true,
        parsed,
        confirmationMessage: msg,
        patientIsNew: isNew,
        recordId: treatment.id,
      };
    }

    if (parsed.type === "EXPENSE") {
      const expense = await prisma.expense.create({
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

      const msg = `✅ Gider kaydedildi:\n📦 ${parsed.description}\n🏷️ ${categoryLabel}\n💸 ${amountTL} TL`;

      return {
        success: true,
        parsed,
        confirmationMessage: msg,
        recordId: expense.id,
      };
    }

    return {
      success: false,
      parsed,
      confirmationMessage: "❌ Bilinmeyen mesaj tipi",
    };
  } catch (error) {
    console.error("[WhatsApp Process] Error:", error);
    return {
      success: false,
      parsed,
      confirmationMessage:
        "❌ İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.",
    };
  }
}
