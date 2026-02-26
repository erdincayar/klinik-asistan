import { prisma } from "@/lib/prisma";

// ── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  BOTOX: "Botoks",
  DOLGU: "Dolgu",
  DIS_TEDAVI: "Dis Tedavi",
  GENEL: "Genel",
};

const TURKISH_MONTHS = [
  "Ocak",
  "Subat",
  "Mart",
  "Nisan",
  "Mayis",
  "Haziran",
  "Temmuz",
  "Agustos",
  "Eylul",
  "Ekim",
  "Kasim",
  "Aralik",
];

const TURKISH_DAYS = [
  "Pazar",
  "Pazartesi",
  "Sali",
  "Carsamba",
  "Persembe",
  "Cuma",
  "Cumartesi",
];

function formatTL(kurus: number): string {
  const tl = kurus / 100;
  return tl.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " TL";
}

function formatTLDetailed(kurus: number): string {
  const tl = kurus / 100;
  return tl.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
}

function formatDateTR(date: Date): string {
  const d = date.getUTCDate();
  const m = TURKISH_MONTHS[date.getUTCMonth()];
  const y = date.getUTCFullYear();
  return `${d} ${m} ${y}`;
}

function formatDateShort(date: Date): string {
  const d = date.getUTCDate().toString().padStart(2, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}.${m}.${y}`;
}

function formatDateShortMonth(date: Date): string {
  const d = date.getUTCDate();
  const m = TURKISH_MONTHS[date.getUTCMonth()].substring(0, 3);
  return `${d} ${m}`;
}

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

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

// ── Appointment Commands ─────────────────────────────────────────────────────

export async function getAppointments(
  clinicId: string,
  date: Date
): Promise<string> {
  const dayStart = startOfDayUTC(date);
  const dayEnd = endOfDayUTC(date);

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      date: { gte: dayStart, lte: dayEnd },
      status: { not: "CANCELLED" },
    },
    include: { patient: true },
    orderBy: { startTime: "asc" },
  });

  const dateLabel = formatDateTR(date);

  if (appointments.length === 0) {
    return `📅 ${dateLabel} icin randevu bulunmuyor.`;
  }

  const lines = appointments.map((a) => {
    const treatmentLabel = getCategoryLabel(a.treatmentType);
    return `${a.startTime} - ${a.patient.name} (${treatmentLabel})`;
  });

  return [
    `📅 ${dateLabel} Randevulari:`,
    ...lines,
    "",
    `Toplam: ${appointments.length} randevu`,
  ].join("\n");
}

export async function getWeeklyAppointments(
  clinicId: string
): Promise<string> {
  const today = new Date();
  const dayOfWeek = today.getUTCDay(); // 0=Sunday
  // Monday of this week
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + mondayOffset);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      date: { gte: monday, lte: sunday },
      status: { not: "CANCELLED" },
    },
    orderBy: { date: "asc" },
  });

  // Group by day
  const dayCounts: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const key = d.toISOString().split("T")[0];
    dayCounts[key] = 0;
  }

  for (const a of appointments) {
    const key = a.date.toISOString().split("T")[0];
    if (key in dayCounts) {
      dayCounts[key]++;
    }
  }

  const lines: string[] = [];
  let total = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const key = d.toISOString().split("T")[0];
    const dayName = TURKISH_DAYS[d.getUTCDay()];
    const dateShort = formatDateShortMonth(d);
    const count = dayCounts[key] || 0;
    total += count;
    lines.push(`${dayName} (${dateShort}): ${count} randevu`);
  }

  return [
    "📅 Bu Hafta Randevu Ozeti:",
    ...lines,
    "",
    `Toplam: ${total} randevu`,
  ].join("\n");
}

export async function cancelAppointment(
  clinicId: string,
  patientName: string
): Promise<string> {
  if (!patientName.trim()) {
    return "⚠️ Iptal icin hasta adi belirtmelisiniz. Ornek: /randevu iptal Erdinc Ayar";
  }

  const searchName = patientName.trim().toLowerCase();

  // Find SCHEDULED appointments where patient name contains the search term
  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      status: "SCHEDULED",
      patient: {
        name: { contains: patientName.trim() },
      },
    },
    include: { patient: true },
    orderBy: { date: "asc" },
  });

  // SQLite contains is case-sensitive, so filter manually
  const filtered = appointments.filter((a) =>
    a.patient.name.toLowerCase().includes(searchName)
  );

  if (filtered.length === 0) {
    return `❌ Randevu bulunamadi: "${patientName.trim()}"`;
  }

  if (filtered.length === 1) {
    const appt = filtered[0];
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "CANCELLED" },
    });

    const dateLabel = formatDateTR(appt.date);
    const treatmentLabel = getCategoryLabel(appt.treatmentType);
    return [
      "✅ Randevu iptal edildi:",
      `👤 ${appt.patient.name}`,
      `📅 ${dateLabel} ${appt.startTime}`,
      `💉 ${treatmentLabel}`,
    ].join("\n");
  }

  // Multiple matches
  const lines = filtered.map((a, i) => {
    const dateLabel = formatDateTR(a.date);
    const treatmentLabel = getCategoryLabel(a.treatmentType);
    return `${i + 1}. ${a.patient.name} - ${dateLabel} ${a.startTime} (${treatmentLabel})`;
  });

  return [
    `⚠️ Birden fazla randevu bulundu (${filtered.length}):`,
    ...lines,
    "",
    "Lutfen tarih belirterek tekrar deneyin.",
  ].join("\n");
}

// ── Finance Commands ─────────────────────────────────────────────────────────

export async function getIncome(
  clinicId: string,
  startDate: Date,
  endDate: Date,
  periodLabel: string
): Promise<string> {
  const result = await prisma.treatment.aggregate({
    where: {
      clinicId,
      date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const total = result._sum.amount || 0;
  const count = result._count.id || 0;

  return [
    `💰 ${periodLabel} Gelir:`,
    `Toplam: ${formatTLDetailed(total)}`,
    `Islem Sayisi: ${count}`,
  ].join("\n");
}

export async function getExpenses(
  clinicId: string,
  startDate: Date,
  endDate: Date,
  periodLabel: string
): Promise<string> {
  const result = await prisma.expense.aggregate({
    where: {
      clinicId,
      date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const total = result._sum.amount || 0;
  const count = result._count.id || 0;

  return [
    `💸 ${periodLabel} Gider:`,
    `Toplam: ${formatTLDetailed(total)}`,
    `Islem Sayisi: ${count}`,
  ].join("\n");
}

export async function getReport(
  clinicId: string,
  startDate: Date,
  endDate: Date,
  periodLabel: string
): Promise<string> {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  const taxRate = clinic?.taxRate ?? 20;

  const [incomeResult, expenseResult, patientCount, appointmentCount] =
    await Promise.all([
      prisma.treatment.aggregate({
        where: { clinicId, date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { clinicId, date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),
      prisma.treatment.findMany({
        where: { clinicId, date: { gte: startDate, lte: endDate } },
        select: { patientId: true },
        distinct: ["patientId"],
      }),
      prisma.appointment.count({
        where: {
          clinicId,
          date: { gte: startDate, lte: endDate },
          status: { not: "CANCELLED" },
        },
      }),
    ]);

  const totalIncome = incomeResult._sum.amount || 0;
  const totalExpense = expenseResult._sum.amount || 0;
  const netProfit = totalIncome - totalExpense;
  const kdv = Math.round((totalIncome * taxRate) / 100);
  const uniquePatients = patientCount.length;

  return [
    `📊 ${periodLabel} Raporu:`,
    `💰 Gelir: ${formatTLDetailed(totalIncome)}`,
    `💸 Gider: ${formatTLDetailed(totalExpense)}`,
    `📈 Net Kar: ${formatTLDetailed(netProfit)}`,
    `🧾 KDV (%${taxRate}): ${formatTLDetailed(kdv)}`,
    `👥 Hasta Sayisi: ${uniquePatients}`,
    `📋 Randevu: ${appointmentCount}`,
  ].join("\n");
}

export async function getCashStatus(clinicId: string): Promise<string> {
  const [incomeResult, expenseResult] = await Promise.all([
    prisma.treatment.aggregate({
      where: { clinicId },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { clinicId },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = incomeResult._sum.amount || 0;
  const totalExpense = expenseResult._sum.amount || 0;
  const cash = totalIncome - totalExpense;

  return [
    "🏦 Kasa Durumu:",
    `💰 Toplam Gelir: ${formatTLDetailed(totalIncome)}`,
    `💸 Toplam Gider: ${formatTLDetailed(totalExpense)}`,
    `💵 Kasa: ${formatTLDetailed(cash)}`,
  ].join("\n");
}

// ── Patient Commands ─────────────────────────────────────────────────────────

export async function getPatientInfo(
  clinicId: string,
  patientName: string
): Promise<string> {
  if (!patientName.trim()) {
    return "⚠️ Hasta adi belirtmelisiniz. Ornek: /hasta Erdinc Ayar";
  }

  const searchName = patientName.trim().toLowerCase();

  // SQLite contains is case-sensitive so we fetch broader and filter
  const patients = await prisma.patient.findMany({
    where: {
      clinicId,
      name: { contains: patientName.trim() },
    },
  });

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(searchName)
  );

  if (filtered.length === 0) {
    return `❌ Hasta bulunamadi: ${patientName.trim()}`;
  }

  // Use first match
  const patient = filtered[0];

  // Get treatments
  const treatments = await prisma.treatment.findMany({
    where: { patientId: patient.id, clinicId },
    orderBy: { date: "asc" },
  });

  // Get upcoming appointments
  const now = new Date();
  const todayStart = startOfDayUTC(now);
  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      patientId: patient.id,
      clinicId,
      date: { gte: todayStart },
      status: "SCHEDULED",
    },
    orderBy: { date: "asc" },
    take: 5,
  });

  const lines: string[] = [];

  // Patient header
  lines.push(`👤 ${patient.name}`);
  if (patient.phone) lines.push(`📞 ${patient.phone}`);
  if (patient.email) lines.push(`📧 ${patient.email}`);
  if (patient.notes) lines.push(`📝 ${patient.notes}`);

  // Treatment history
  if (treatments.length > 0) {
    lines.push("");
    lines.push("📋 Islem Gecmisi:");
    let totalAmount = 0;
    treatments.forEach((t, i) => {
      const dateStr = formatDateShort(t.date);
      lines.push(`${i + 1}. ${t.name} - ${formatTL(t.amount)} (${dateStr})`);
      totalAmount += t.amount;
    });
    lines.push(`Toplam: ${formatTL(totalAmount)}`);
  }

  // Upcoming appointments
  if (upcomingAppointments.length > 0) {
    lines.push("");
    lines.push("📅 Yaklaşan Randevu:");
    for (const a of upcomingAppointments) {
      const dateLabel = `${a.date.getUTCDate()} ${TURKISH_MONTHS[a.date.getUTCMonth()]}`;
      const treatmentLabel = getCategoryLabel(a.treatmentType);
      lines.push(`${dateLabel} ${a.startTime} - ${treatmentLabel}`);
    }
  }

  return lines.join("\n");
}

export async function getPatientsList(clinicId: string): Promise<string> {
  const totalCount = await prisma.patient.count({ where: { clinicId } });

  const recentPatients = await prisma.patient.findMany({
    where: { clinicId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const lines: string[] = [
    "👥 Hasta Listesi:",
    `Toplam: ${totalCount} hasta`,
  ];

  if (recentPatients.length > 0) {
    lines.push("Son eklenenler:");
    recentPatients.forEach((p, i) => {
      const dateStr = formatDateShort(p.createdAt);
      lines.push(`${i + 1}. ${p.name} (${dateStr})`);
    });
  }

  return lines.join("\n");
}

// ── Reminder Commands ────────────────────────────────────────────────────────

export async function getReminders(clinicId: string): Promise<string> {
  const today = new Date();
  const todayStart = startOfDayUTC(today);

  // Get all active reminders for this clinic
  const reminders = await prisma.reminder.findMany({
    where: { clinicId, isActive: true },
  });

  if (reminders.length === 0) {
    return "🔔 Bugün gönderilecek hatirlatma yok.";
  }

  const duePatients: Array<{
    patientName: string;
    phone: string | null;
    categoryLabel: string;
    intervalDays: number;
  }> = [];

  for (const reminder of reminders) {
    // Find treatments where: treatment.date + intervalDays <= today
    // meaning the reminder period has elapsed
    const cutoffDate = new Date(todayStart);
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - reminder.intervalDays);
    const cutoffStart = startOfDayUTC(cutoffDate);
    const cutoffEnd = endOfDayUTC(cutoffDate);

    // Treatments that were done exactly intervalDays ago (today is the reminder day)
    const treatments = await prisma.treatment.findMany({
      where: {
        clinicId,
        category: reminder.treatmentCategory,
        date: { gte: cutoffStart, lte: cutoffEnd },
      },
      include: { patient: true },
    });

    for (const t of treatments) {
      duePatients.push({
        patientName: t.patient.name,
        phone: t.patient.phone,
        categoryLabel: getCategoryLabel(t.category),
        intervalDays: reminder.intervalDays,
      });
    }
  }

  if (duePatients.length === 0) {
    return "🔔 Bugün gönderilecek hatirlatma yok.";
  }

  const lines: string[] = ["🔔 Bugünkü Hatirlatmalar:"];

  duePatients.forEach((dp, i) => {
    const monthsOrDays =
      dp.intervalDays >= 30
        ? `${Math.round(dp.intervalDays / 30)} ay doldu`
        : `${dp.intervalDays} gün doldu`;
    lines.push(
      `${i + 1}. ${dp.patientName} - ${dp.categoryLabel} kontrolü (${monthsOrDays})`
    );
    if (dp.phone) {
      lines.push(`   📞 ${dp.phone}`);
    }
  });

  lines.push(`Toplam: ${duePatients.length} hatirlatma`);

  return lines.join("\n");
}

// ── Daily Summary ────────────────────────────────────────────────────────────

export async function getDailySummary(clinicId: string): Promise<string> {
  const today = new Date();
  const dayStart = startOfDayUTC(today);
  const dayEnd = endOfDayUTC(today);
  const dateLabel = formatDateTR(today);

  const [appointments, incomeResult, expenseResult] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        clinicId,
        date: { gte: dayStart, lte: dayEnd },
        status: { not: "CANCELLED" },
      },
      include: { patient: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.treatment.aggregate({
      where: { clinicId, date: { gte: dayStart, lte: dayEnd } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { clinicId, date: { gte: dayStart, lte: dayEnd } },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = incomeResult._sum.amount || 0;
  const totalExpense = expenseResult._sum.amount || 0;

  // Count reminders due today (reuse logic)
  const reminders = await prisma.reminder.findMany({
    where: { clinicId, isActive: true },
  });

  let reminderCount = 0;
  for (const reminder of reminders) {
    const cutoffDate = new Date(dayStart);
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - reminder.intervalDays);
    const cutoffStart = startOfDayUTC(cutoffDate);
    const cutoffEnd = endOfDayUTC(cutoffDate);

    const count = await prisma.treatment.count({
      where: {
        clinicId,
        category: reminder.treatmentCategory,
        date: { gte: cutoffStart, lte: cutoffEnd },
      },
    });
    reminderCount += count;
  }

  const lines: string[] = [`📋 Günlük Ozet (${dateLabel}):`, ""];

  // Appointments section
  lines.push(`📅 Bugünkü Randevular: ${appointments.length}`);
  if (appointments.length > 0) {
    for (const a of appointments) {
      const treatmentLabel = getCategoryLabel(a.treatmentType);
      lines.push(`${a.startTime} - ${a.patient.name} (${treatmentLabel})`);
    }
  }

  lines.push("");
  lines.push(`💰 Bugünkü Gelir: ${formatTL(totalIncome)}`);
  lines.push(`💸 Bugünkü Gider: ${formatTL(totalExpense)}`);
  lines.push(`🔔 Bekleyen Hatirlatma: ${reminderCount}`);

  return lines.join("\n");
}

// ── Help Command ─────────────────────────────────────────────────────────────

export function getHelpText(): string {
  return [
    "📖 Komut Listesi:",
    "",
    "📅 Randevu Komutlari:",
    "/randevu - Bugünkü randevular",
    "/randevu yarin - Yarinin randevulari",
    "/randevu bu hafta - Haftalik ozet",
    "/randevu iptal [isim] - Randevu iptali",
    "",
    "💰 Finans Komutlari:",
    "/gelir - Bu ayin geliri",
    "/gelir [dönem] - Dönem geliri",
    "/gider - Bu ayin gideri",
    "/rapor - Aylik rapor",
    "/kasa - Kasa durumu",
    "",
    "👤 Hasta Komutlari:",
    "/hasta [isim] - Hasta bilgisi",
    "/hastalar - Hasta listesi",
    "/hatirlatmalar - Günün hatirlatmalari",
    "",
    "📋 Genel:",
    "/ozet - Günlük ozet",
    "/yardim - Bu yardim mesaji",
  ].join("\n");
}
