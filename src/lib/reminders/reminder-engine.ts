import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Preference type labels (Turkish)
const PREFERENCE_LABELS: Record<string, string> = {
  INDIRIM_SEVER: "Indirim sever",
  HEDIYE_SEVER: "Hediye sever",
  ARKADASIYLA_GELIR: "Arkadasiyla gelir",
  SADIK_MUSTERI: "Sadik musteri",
  FIYAT_HASSAS: "Fiyat hassas",
};

const CATEGORY_LABELS: Record<string, string> = {
  BOTOX: "Botoks",
  DOLGU: "Dolgu",
  DIS_TEDAVI: "Dis Tedavi",
  GENEL: "Genel",
};

// Find patients who are due for reminders
export async function findDuePatients(clinicId: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Get active reminder rules
  const reminders = await prisma.reminder.findMany({
    where: { clinicId, isActive: true },
  });

  const duePatients: Array<{
    patientId: string;
    patientName: string;
    phone: string | null;
    treatmentCategory: string;
    lastTreatmentDate: Date;
    intervalDays: number;
    messageTemplate: string;
  }> = [];

  for (const reminder of reminders) {
    // Find patients whose last treatment of this category was >= intervalDays ago
    const cutoffDate = new Date(today);
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - reminder.intervalDays);

    // Get the latest treatment per patient for this category
    const treatments = await prisma.treatment.findMany({
      where: {
        clinicId,
        category: reminder.treatmentCategory,
        date: { lte: cutoffDate },
      },
      include: { patient: true },
      orderBy: { date: "desc" },
    });

    // Deduplicate by patient (take the most recent treatment per patient)
    const seenPatients = new Set<string>();
    for (const t of treatments) {
      if (seenPatients.has(t.patientId)) continue;
      seenPatients.add(t.patientId);

      // Check if we already sent a reminder for this patient recently (within 30 days)
      const recentLog = await prisma.reminderLog.findFirst({
        where: {
          patientId: t.patientId,
          clinicId,
          createdAt: {
            gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      if (recentLog) continue; // Skip if already reminded recently

      // Check there's no newer treatment of this category after cutoff
      const newerTreatment = await prisma.treatment.findFirst({
        where: {
          patientId: t.patientId,
          clinicId,
          category: reminder.treatmentCategory,
          date: { gt: cutoffDate },
        },
      });

      if (newerTreatment) continue; // Patient already had a recent treatment

      duePatients.push({
        patientId: t.patientId,
        patientName: t.patient.name,
        phone: t.patient.phone,
        treatmentCategory: reminder.treatmentCategory,
        lastTreatmentDate: t.date,
        intervalDays: reminder.intervalDays,
        messageTemplate: reminder.messageTemplate,
      });
    }
  }

  return duePatients;
}

// Generate personalized reminder message using Claude AI
export async function generatePersonalizedMessage(
  patientName: string,
  treatmentCategory: string,
  lastTreatmentDate: Date,
  intervalDays: number,
  preferences: string[],
  messageTemplate: string
): Promise<string> {
  const categoryLabel = CATEGORY_LABELS[treatmentCategory] || treatmentCategory;
  const prefLabels = preferences.map(p => PREFERENCE_LABELS[p] || p);

  const daysSinceTreatment = Math.floor(
    (new Date().getTime() - lastTreatmentDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const monthsSince = Math.round(daysSinceTreatment / 30);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: `Sen bir klinik asistanisin. Hastalara hatirlatma mesajlari yaziyorsun.
Mesajlar kisa, samimi ve profesyonel olmali. WhatsApp mesaji olarak gonderilecek.
Emoji kullanabilirsin ama asiri kullanma. Mesaj 2-3 cumle olmali.`,
      messages: [
        {
          role: "user",
          content: `Asagidaki bilgilere gore kisisellestirilmis bir hatirlatma mesaji yaz:

Hasta Adi: ${patientName}
Islem Turu: ${categoryLabel}
Son Islem: ${monthsSince} ay once
Beklenen Aralik: ${intervalDays} gun
Hasta Tercihleri: ${prefLabels.length > 0 ? prefLabels.join(", ") : "Bilinmiyor"}
Sablon: ${messageTemplate}

Kuralar:
- Hasta adini kullan
- Islem turune gore ozel mesaj yaz
${prefLabels.includes("Indirim sever") ? "- Indirim firsati oldugundan bahset" : ""}
${prefLabels.includes("Hediye sever") ? "- Kucuk bir surpriz hediye olacagindan bahset" : ""}
${prefLabels.includes("Arkadasiyla gelir") ? "- Arkadasiyla birlikte gelirse ozel fiyat olacagindan bahset" : ""}
${prefLabels.includes("Sadik musteri") ? "- Sadik musterilere ozel avantajlardan bahset" : ""}
${prefLabels.includes("Fiyat hassas") ? "- Uygun fiyat seceneklerinden bahset" : ""}
- Sadece mesaj metnini yaz, baska bir sey yazma`,
        },
      ],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    return textBlock?.text || messageTemplate;
  } catch (error) {
    console.error("[ReminderEngine] AI message generation failed:", error);
    // Fallback to template-based message
    return messageTemplate
      .replace("{hasta}", patientName)
      .replace("{islem}", categoryLabel)
      .replace("{gun}", String(intervalDays));
  }
}

// Send a reminder and log it
export async function sendReminder(
  patientId: string,
  clinicId: string,
  messageContent: string,
  channel: string = "WHATSAPP"
): Promise<string> {
  // Create log entry
  const log = await prisma.reminderLog.create({
    data: {
      patientId,
      clinicId,
      messageContent,
      channel,
      status: "SENT",
      sentAt: new Date(),
    },
    include: { patient: true },
  });

  return log.id;
}

// Process all due reminders for a clinic
export async function processClinicReminders(clinicId: string): Promise<{
  sent: number;
  failed: number;
  details: Array<{ patientName: string; status: string }>;
}> {
  const duePatients = await findDuePatients(clinicId);
  let sent = 0;
  let failed = 0;
  const details: Array<{ patientName: string; status: string }> = [];

  for (const dp of duePatients) {
    try {
      // Get patient preferences
      const preferences = await prisma.patientPreference.findMany({
        where: { patientId: dp.patientId, clinicId },
      });
      const prefTypes = preferences.map(p => p.type);

      // Generate personalized message
      const message = await generatePersonalizedMessage(
        dp.patientName,
        dp.treatmentCategory,
        dp.lastTreatmentDate,
        dp.intervalDays,
        prefTypes,
        dp.messageTemplate
      );

      // Send and log
      await sendReminder(dp.patientId, clinicId, message);
      sent++;
      details.push({ patientName: dp.patientName, status: "sent" });
    } catch (error) {
      console.error(`[ReminderEngine] Failed for ${dp.patientName}:`, error);
      failed++;
      details.push({ patientName: dp.patientName, status: "failed" });
    }
  }

  return { sent, failed, details };
}

// Get pending reminders summary (without sending)
export async function getPendingRemindersSummary(clinicId: string) {
  const duePatients = await findDuePatients(clinicId);

  return duePatients.map(dp => ({
    patientId: dp.patientId,
    patientName: dp.patientName,
    phone: dp.phone,
    treatmentCategory: CATEGORY_LABELS[dp.treatmentCategory] || dp.treatmentCategory,
    lastTreatmentDate: dp.lastTreatmentDate.toISOString().split("T")[0],
    daysSince: Math.floor(
      (new Date().getTime() - dp.lastTreatmentDate.getTime()) / (1000 * 60 * 60 * 24)
    ),
    intervalDays: dp.intervalDays,
  }));
}

// Update patient visit pattern after a treatment is recorded
export async function updateVisitPattern(patientId: string, clinicId: string) {
  const treatments = await prisma.treatment.findMany({
    where: { patientId, clinicId },
    orderBy: { date: "asc" },
  });

  if (treatments.length === 0) return;

  const lastTreatment = treatments[treatments.length - 1];
  let averageVisitDays: number | null = null;

  if (treatments.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < treatments.length; i++) {
      const diff = treatments[i].date.getTime() - treatments[i - 1].date.getTime();
      intervals.push(Math.floor(diff / (1000 * 60 * 60 * 24)));
    }
    averageVisitDays = Math.round(
      intervals.reduce((sum, d) => sum + d, 0) / intervals.length
    );
  }

  await prisma.patientVisitPattern.upsert({
    where: { patientId },
    update: {
      averageVisitDays,
      lastVisitDate: lastTreatment.date,
      totalVisits: treatments.length,
      lastCategory: lastTreatment.category,
    },
    create: {
      patientId,
      clinicId,
      averageVisitDays,
      lastVisitDate: lastTreatment.date,
      totalVisits: treatments.length,
      lastCategory: lastTreatment.category,
    },
  });
}
