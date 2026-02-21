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

export interface ParseError {
  type: "ERROR";
  message: string;
  originalText: string;
}

export type ParsedMessage = ParsedAppointment | ParsedIncome | ParsedExpense | ParseError;

export async function parseWhatsAppMessage(message: string): Promise<ParsedMessage> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dayOfWeek = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"][today.getDay()];

  const systemPrompt = `Sen bir WhatsApp mesajı ayrıştırıcısısın. Doktorun gönderdiği kısa mesajları yapılandırılmış veriye çeviriyorsun.

Bugün: ${todayStr} (${dayOfWeek})

3 tip mesaj var:

1. RANDEVU: Hasta adı + gün/saat + işlem türü içerir.
   Örnekler:
   - "Ayşe Erdoğan pazartesi saat 3 botoks kontrol" → randevu
   - "Mehmet yarın 14:30 dolgu" → randevu
   - "Ali bey cuma 10 diş tedavi" → randevu

2. GELİR/TEDAVİ: Hasta adı + işlem + tutar içerir. "alındı", "ödendi", "TL", "lira" gibi kelimeler ipucu.
   Örnekler:
   - "Kerem İnanır dolgu 5000tl alındı" → gelir
   - "Fatma hanım botoks 3500 lira" → gelir
   - "Ahmet bey diş tedavi 2000tl ödendi" → gelir

3. GİDER: Hasta adı YOK, ürün/malzeme/kira/fatura + tutar içerir.
   Örnekler:
   - "Nurederm ürün alındı 50000tl" → gider
   - "Kira 25000 ödendi" → gider
   - "Elektrik faturası 3500tl" → gider

Kurallar:
- "saat 3" → "15:00" (mesai saati varsayımı)
- "yarın" → bugünün ertesi günü tarih olarak hesapla
- "pazartesi" → gelecek pazartesi tarih olarak hesapla
- Tutarlar kuruş cinsine çevir (5000tl → 500000)
- İşlem türleri: BOTOX, DOLGU, DIS_TEDAVI, GENEL
- Gider kategorileri: MALZEME, KIRA, FATURA, MAAS, DIGER
- "botoks" veya "botox" → BOTOX, "dolgu" veya "filler" → DOLGU, "diş" → DIS_TEDAVI

SADECE JSON döndür, başka hiçbir şey yazma.`;

  const userPrompt = `Mesajı parse et: "${message}"

Eğer RANDEVU ise:
{"type":"APPOINTMENT","patientName":"...","date":"YYYY-MM-DD","time":"HH:MM","treatmentType":"BOTOX|DOLGU|DIS_TEDAVI|GENEL","notes":"..."}

Eğer GELİR ise:
{"type":"INCOME","patientName":"...","treatmentType":"BOTOX|DOLGU|DIS_TEDAVI|GENEL","treatmentName":"...","amount":kuruş_cinsinden_sayı,"notes":"..."}

Eğer GİDER ise:
{"type":"EXPENSE","description":"...","amount":kuruş_cinsinden_sayı,"category":"MALZEME|KIRA|FATURA|MAAS|DIGER"}

Eğer anlayamıyorsan:
{"type":"ERROR","message":"Mesaj anlaşılamadı","originalText":"..."}`;

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
      return { type: "ERROR", message: "AI yanıt vermedi", originalText: message };
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = textBlock.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    return parsed as ParsedMessage;
  } catch (error) {
    console.error("[WhatsApp Parser] Error:", error);
    return { type: "ERROR", message: "Mesaj parse edilemedi", originalText: message };
  }
}

export async function findOrCreatePatient(
  name: string,
  clinicId: string,
  phone?: string
): Promise<{ patient: any; isNew: boolean }> {
  // Fuzzy match: search by partial name (case-insensitive via contains)
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0];

  // Try exact match first
  let patient = await prisma.patient.findFirst({
    where: {
      clinicId,
      name: { contains: name.trim() },
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
      name: name.trim(),
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
      confirmationMessage: `❌ Mesaj anlaşılamadı: "${message}"\nLütfen şu formatlardan birini kullanın:\n- Randevu: "Hasta adı gün saat işlem"\n- Gelir: "Hasta adı işlem tutarTL"\n- Gider: "Açıklama tutarTL"`,
    };
  }

  try {
    if (parsed.type === "APPOINTMENT") {
      const { patient, isNew } = await findOrCreatePatient(parsed.patientName, clinicId);

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

      let msg = `✅ Randevu oluşturuldu:\n${patient.name} - ${dateFormatted} ${parsed.time} - ${parsed.treatmentType}`;
      if (parsed.notes) msg += `\nNot: ${parsed.notes}`;
      if (isNew) msg += `\n⚠️ Yeni hasta oluşturuldu: ${patient.name}`;

      return { success: true, parsed, confirmationMessage: msg, patientIsNew: isNew, recordId: appointment.id };
    }

    if (parsed.type === "INCOME") {
      const { patient, isNew } = await findOrCreatePatient(parsed.patientName, clinicId);

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
      let msg = `✅ ${patient.name} - ${parsed.treatmentName || parsed.treatmentType} - ${amountTL} TL kaydedildi`;
      if (isNew) msg += `\n⚠️ Yeni hasta oluşturuldu: ${patient.name}`;

      return { success: true, parsed, confirmationMessage: msg, patientIsNew: isNew, recordId: treatment.id };
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
      const msg = `✅ Gider kaydedildi: ${parsed.description} - ${amountTL} TL`;

      return { success: true, parsed, confirmationMessage: msg, recordId: expense.id };
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
      confirmationMessage: "❌ İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.",
    };
  }
}
