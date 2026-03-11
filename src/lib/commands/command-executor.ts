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
    return "⚠️ Iptal icin musteri adi belirtmelisiniz. Ornek: /randevu iptal Erdinc Ayar";
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
  const result = await prisma.expense.aggregate({
    where: {
      clinicId,
      type: "INCOME",
      date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const total = result._sum.amount || 0;
  const count = result._count.id || 0;

  console.log(`[Finance] getIncome clinicId=${clinicId} period=${periodLabel} total=${total} count=${count}`);

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
      type: "EXPENSE",
      date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const total = result._sum.amount || 0;
  const count = result._count.id || 0;

  console.log(`[Finance] getExpenses clinicId=${clinicId} period=${periodLabel} total=${total} count=${count}`);

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
      prisma.expense.aggregate({
        where: { clinicId, type: "INCOME", date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { clinicId, type: "EXPENSE", date: { gte: startDate, lte: endDate } },
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
  const kdv = Math.round((totalIncome * taxRate) / (100 + taxRate));
  const uniquePatients = patientCount.length;

  return [
    `📊 ${periodLabel} Raporu:`,
    `💰 Gelir: ${formatTLDetailed(totalIncome)}`,
    `💸 Gider: ${formatTLDetailed(totalExpense)}`,
    `📈 Net Kar: ${formatTLDetailed(netProfit)}`,
    `🧾 KDV (%${taxRate}): ${formatTLDetailed(kdv)}`,
    `👥 Musteri Sayisi: ${uniquePatients}`,
    `📋 Randevu: ${appointmentCount}`,
  ].join("\n");
}

export async function getCashStatus(clinicId: string): Promise<string> {
  const [incomeResult, expenseResult] = await Promise.all([
    prisma.expense.aggregate({
      where: { clinicId, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { clinicId, type: "EXPENSE" },
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
    return "⚠️ Musteri adi belirtmelisiniz. Ornek: /musteri Erdinc Ayar";
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
    return `❌ Musteri bulunamadi: ${patientName.trim()}`;
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
    "👥 Müşteri Listesi:",
    `Toplam: ${totalCount} müşteri`,
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
    prisma.expense.aggregate({
      where: { clinicId, type: "INCOME", date: { gte: dayStart, lte: dayEnd } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { clinicId, type: "EXPENSE", date: { gte: dayStart, lte: dayEnd } },
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

// ── Report Commands ─────────────────────────────────────────────────────────

export async function getDetailedReport(clinicId: string): Promise<string> {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  const taxRate = clinic?.taxRate ?? 20;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthName = TURKISH_MONTHS[now.getUTCMonth()];

  const [incomeResult, expenseResult, incomeByCategory, patientCount, appointmentCount] =
    await Promise.all([
      prisma.expense.aggregate({
        where: { clinicId, type: "INCOME", date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.expense.aggregate({
        where: { clinicId, type: "EXPENSE", date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.expense.findMany({
        where: { clinicId, type: "INCOME", date: { gte: monthStart, lt: monthEnd } },
        select: { category: true, amount: true },
      }),
      prisma.patient.count({ where: { clinicId } }),
      prisma.appointment.count({
        where: { clinicId, date: { gte: monthStart, lt: monthEnd }, status: { not: "CANCELLED" } },
      }),
    ]);

  const totalIncome = incomeResult._sum.amount || 0;
  const totalExpense = expenseResult._sum.amount || 0;
  const netProfit = totalIncome - totalExpense;
  const kdv = Math.round((totalIncome * taxRate) / (100 + taxRate));
  const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  for (const t of incomeByCategory) {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  }
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const lines: string[] = [
    `📊 Detayli Rapor - ${monthName} ${now.getFullYear()}:`,
    "",
    "💰 Gelir:",
    `Toplam: ${formatTLDetailed(totalIncome)} (${incomeResult._count.id} islem)`,
    "",
  ];

  // Category details
  if (sortedCategories.length > 0) {
    lines.push("📋 Kategori Dagilimi:");
    for (const [cat, amount] of sortedCategories) {
      const pct = Math.round((amount / totalIncome) * 100);
      lines.push(`${getCategoryLabel(cat)}: ${formatTL(amount)} (%${pct})`);
    }
    lines.push("");
  }

  lines.push("💸 Gider:");
  lines.push(`Toplam: ${formatTLDetailed(totalExpense)} (${expenseResult._count.id} islem)`);
  lines.push("");
  lines.push("📈 Kar-Zarar:");
  lines.push(`Net Kar: ${formatTLDetailed(netProfit)}`);
  lines.push(`Kar Marji: %${profitMargin}`);
  lines.push(`KDV (%${taxRate}): ${formatTLDetailed(kdv)}`);
  lines.push("");
  lines.push(`👥 Müşteri: ${patientCount} | 📋 Randevu: ${appointmentCount}`);

  return lines.join("\n");
}

export async function getTopServices(clinicId: string): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const treatments = await prisma.treatment.findMany({
    where: { clinicId, date: { gte: monthStart, lt: monthEnd } },
    select: { category: true, amount: true },
  });

  const categoryTotals: Record<string, { amount: number; count: number }> = {};
  for (const t of treatments) {
    if (!categoryTotals[t.category]) {
      categoryTotals[t.category] = { amount: 0, count: 0 };
    }
    categoryTotals[t.category].amount += t.amount;
    categoryTotals[t.category].count += 1;
  }

  const sorted = Object.entries(categoryTotals).sort((a, b) => b[1].amount - a[1].amount);

  if (sorted.length === 0) {
    return "📊 Bu ay henuz islem yapilmamis.";
  }

  const lines: string[] = [`🏆 En Cok Kazandiran Servisler (${TURKISH_MONTHS[now.getUTCMonth()]}):`];

  sorted.forEach(([cat, data], i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    lines.push(`${medal} ${getCategoryLabel(cat)}: ${formatTL(data.amount)} (${data.count} islem)`);
  });

  return lines.join("\n");
}

export async function getTopPatients(clinicId: string): Promise<string> {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

  const treatments = await prisma.treatment.findMany({
    where: { clinicId, date: { gte: yearStart, lt: yearEnd } },
    include: { patient: { select: { name: true, phone: true } } },
  });

  const patientTotals: Record<string, { name: string; amount: number; count: number }> = {};
  for (const t of treatments) {
    if (!patientTotals[t.patientId]) {
      patientTotals[t.patientId] = { name: t.patient.name, amount: 0, count: 0 };
    }
    patientTotals[t.patientId].amount += t.amount;
    patientTotals[t.patientId].count += 1;
  }

  const sorted = Object.entries(patientTotals).sort((a, b) => b[1].amount - a[1].amount).slice(0, 10);

  if (sorted.length === 0) {
    return "👥 Bu yil henuz islem yapilmamis.";
  }

  const lines: string[] = [`👑 En Cok Gelen Musteriler (${now.getFullYear()}):`];

  sorted.forEach(([, data], i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    lines.push(`${medal} ${data.name}: ${formatTL(data.amount)} (${data.count} ziyaret)`);
  });

  return lines.join("\n");
}

export async function getCommissionReport(clinicId: string): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const employees = await prisma.employee.findMany({
    where: { clinicId, isActive: true },
  });

  if (employees.length === 0) {
    return "👥 Henuz calisan kaydi bulunmuyor.";
  }

  const lines: string[] = [`💰 Prim Raporu (${TURKISH_MONTHS[now.getUTCMonth()]} ${now.getFullYear()}):`];

  let totalCommission = 0;

  for (const emp of employees) {
    const result = await prisma.treatment.aggregate({
      where: { clinicId, employeeId: emp.id, date: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
      _count: { id: true },
    });

    const revenue = result._sum.amount || 0;
    const commission = Math.round(revenue * emp.commissionRate / 100);
    totalCommission += commission;

    lines.push(`👤 ${emp.name} (%${emp.commissionRate}): ${formatTL(revenue)} gelir → ${formatTL(commission)} prim`);
  }

  lines.push("");
  lines.push(`Toplam Prim: ${formatTL(totalCommission)}`);

  return lines.join("\n");
}

// ── Send Reminders Command ──────────────────────────────────────────────────

export async function sendReminderCommand(clinicId: string): Promise<string> {
  // Dynamic import to avoid circular deps
  const { processClinicReminders } = await import("@/lib/reminders/reminder-engine");

  const result = await processClinicReminders(clinicId);

  if (result.sent === 0 && result.failed === 0) {
    return "🔔 Gonderilecek hatirlatma bulunmuyor.";
  }

  const lines: string[] = ["🔔 Hatirlatma Gonderim Sonucu:"];

  for (const detail of result.details) {
    const icon = detail.status === "sent" ? "✅" : "❌";
    lines.push(`${icon} ${detail.patientName}`);
  }

  lines.push("");
  lines.push(`Gonderilen: ${result.sent} | Basarisiz: ${result.failed}`);

  return lines.join("\n");
}

// ── Stock Commands ───────────────────────────────────────────────────────────

export async function getStockOverview(clinicId: string): Promise<string> {
  const products = await prisma.product.findMany({
    where: { clinicId, isActive: true },
  });

  if (products.length === 0) {
    return "📦 Henuz urun kaydi bulunmuyor.";
  }

  const totalValue = products.reduce(
    (sum, p) => sum + p.currentStock * p.purchasePrice,
    0
  );
  const lowStock = products.filter((p) => p.currentStock <= p.minStock);

  const lines: string[] = [
    "📦 Stok Durumu:",
    `Toplam Urun: ${products.length}`,
    `Toplam Stok Degeri: ${formatTL(totalValue)}`,
    `Dusuk Stok Uyarisi: ${lowStock.length} urun`,
  ];

  if (lowStock.length > 0) {
    lines.push("");
    lines.push("⚠️ Dusuk Stoklu Urunler:");
    for (const p of lowStock) {
      lines.push(`- ${p.name}: ${p.currentStock} ${p.unit} (min: ${p.minStock})`);
    }
  }

  return lines.join("\n");
}

export async function searchStock(
  clinicId: string,
  query: string
): Promise<string> {
  if (!query.trim()) {
    return "⚠️ Urun adi belirtmelisiniz. Ornek: /stok Nurederm";
  }

  const searchTerm = query.trim().toLowerCase();

  const products = await prisma.product.findMany({
    where: {
      clinicId,
      isActive: true,
      OR: [
        { name: { contains: query.trim() } },
        { sku: { contains: query.trim() } },
      ],
    },
  });

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm) ||
      p.sku.toLowerCase().includes(searchTerm)
  );

  if (filtered.length === 0) {
    return `❌ Urun bulunamadi: "${query.trim()}"`;
  }

  const lines: string[] = [];
  for (const p of filtered) {
    const stockStatus =
      p.currentStock <= p.minStock ? "⚠️ DUSUK" : "✅ Normal";
    lines.push(
      [
        `📦 ${p.name}`,
        `SKU: ${p.sku}`,
        `Kategori: ${p.category}`,
        `Stok: ${p.currentStock} ${p.unit} (min: ${p.minStock}) ${stockStatus}`,
        `Alis: ${formatTL(p.purchasePrice)} | Satis: ${formatTL(p.salePrice)}`,
      ].join("\n")
    );
  }

  return lines.join("\n\n");
}

export async function stockEntry(
  clinicId: string,
  productName: string,
  quantity: number
): Promise<string> {
  if (!productName.trim()) {
    return "⚠️ Urun adi belirtmelisiniz. Ornek: /stok giris Nurederm 10";
  }

  if (quantity <= 0) {
    return "⚠️ Miktar pozitif bir sayi olmalidir.";
  }

  const searchTerm = productName.trim().toLowerCase();
  const products = await prisma.product.findMany({
    where: { clinicId, isActive: true, name: { contains: productName.trim() } },
  });

  const product = products.find((p) =>
    p.name.toLowerCase().includes(searchTerm)
  );

  if (!product) {
    return `❌ Urun bulunamadi: "${productName.trim()}"`;
  }

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        productId: product.id,
        clinicId,
        type: "IN",
        quantity,
        unitPrice: product.purchasePrice,
        totalPrice: product.purchasePrice * quantity,
        description: `Telegram ile stok girisi`,
        date: new Date(),
      },
    }),
    prisma.product.update({
      where: { id: product.id },
      data: { currentStock: { increment: quantity } },
    }),
  ]);

  const newStock = product.currentStock + quantity;

  return [
    "✅ Stok girisi yapildi:",
    `📦 ${product.name}`,
    `➕ ${quantity} ${product.unit} eklendi`,
    `📊 Yeni stok: ${newStock} ${product.unit}`,
  ].join("\n");
}

export async function stockExit(
  clinicId: string,
  productName: string,
  quantity: number
): Promise<string> {
  if (!productName.trim()) {
    return "⚠️ Urun adi belirtmelisiniz. Ornek: /stok cikis Botox 5";
  }

  if (quantity <= 0) {
    return "⚠️ Miktar pozitif bir sayi olmalidir.";
  }

  const searchTerm = productName.trim().toLowerCase();
  const products = await prisma.product.findMany({
    where: { clinicId, isActive: true, name: { contains: productName.trim() } },
  });

  const product = products.find((p) =>
    p.name.toLowerCase().includes(searchTerm)
  );

  if (!product) {
    return `❌ Urun bulunamadi: "${productName.trim()}"`;
  }

  if (product.currentStock < quantity) {
    return `❌ Yetersiz stok! ${product.name} mevcut stok: ${product.currentStock} ${product.unit}`;
  }

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        productId: product.id,
        clinicId,
        type: "OUT",
        quantity,
        unitPrice: product.salePrice,
        totalPrice: product.salePrice * quantity,
        description: `Telegram ile stok cikisi`,
        date: new Date(),
      },
    }),
    prisma.product.update({
      where: { id: product.id },
      data: { currentStock: { decrement: quantity } },
    }),
  ]);

  const newStock = product.currentStock - quantity;

  return [
    "✅ Stok cikisi yapildi:",
    `📦 ${product.name}`,
    `➖ ${quantity} ${product.unit} cikarildi`,
    `📊 Yeni stok: ${newStock} ${product.unit}`,
  ].join("\n");
}

// ── Invoice Commands ─────────────────────────────────────────────────────────

export async function getInvoiceSummary(clinicId: string): Promise<string> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  const monthName = TURKISH_MONTHS[now.getUTCMonth()];

  const invoices = await prisma.invoice.findMany({
    where: {
      clinicId,
      issueDate: { gte: monthStart, lte: monthEnd },
    },
  });

  if (invoices.length === 0) {
    return `🧾 ${monthName} ${now.getUTCFullYear()} - Henuz fatura kesilmemis.`;
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const eFaturaCount = invoices.filter((inv) => inv.type === "EFATURA").length;
  const eArsivCount = invoices.filter((inv) => inv.type === "EARSIV").length;
  const draftCount = invoices.filter((inv) => inv.status === "DRAFT").length;
  const sentCount = invoices.filter((inv) => inv.status === "SENT").length;
  const approvedCount = invoices.filter((inv) => inv.status === "APPROVED").length;
  const cancelledCount = invoices.filter((inv) => inv.status === "CANCELLED").length;

  const lines: string[] = [
    `🧾 Fatura Ozeti - ${monthName} ${now.getUTCFullYear()}:`,
    "",
    `📊 Toplam: ${invoices.length} fatura`,
    `💰 Toplam Tutar: ${formatTLDetailed(totalAmount)}`,
    "",
    "📋 Tur Dagilimi:",
    `e-Fatura: ${eFaturaCount}`,
    `e-Arsiv: ${eArsivCount}`,
    "",
    "📌 Durum Dagilimi:",
  ];

  if (draftCount > 0) lines.push(`Taslak: ${draftCount}`);
  if (sentCount > 0) lines.push(`Gonderildi: ${sentCount}`);
  if (approvedCount > 0) lines.push(`Onaylandi: ${approvedCount}`);
  if (cancelledCount > 0) lines.push(`Iptal: ${cancelledCount}`);

  return lines.join("\n");
}

export async function createInvoiceForPatient(
  clinicId: string,
  patientName: string
): Promise<string> {
  const searchName = patientName.toLowerCase();

  const patients = await prisma.patient.findMany({
    where: {
      clinicId,
      name: { contains: patientName },
    },
  });

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(searchName)
  );

  if (filtered.length === 0) {
    return `❌ Musteri bulunamadi: "${patientName}"`;
  }

  const patient = filtered[0];

  // Get recent treatments
  const treatments = await prisma.treatment.findMany({
    where: { patientId: patient.id, clinicId },
    orderBy: { date: "desc" },
    take: 5,
  });

  const lines: string[] = [
    `🧾 ${patient.name} - Fatura Bilgileri:`,
    "",
  ];

  if (treatments.length > 0) {
    lines.push("📋 Son Islemler:");
    for (const t of treatments) {
      const dateStr = formatDateShort(t.date);
      lines.push(`- ${t.name}: ${formatTL(t.amount)} (${dateStr})`);
    }
    lines.push("");
  } else {
    lines.push("Henuz islem kaydi bulunmuyor.");
    lines.push("");
  }

  lines.push("🔗 Fatura olusturmak icin web panelini kullanin:");
  lines.push("/invoices?tab=create");

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
    "📊 Rapor Komutlari:",
    "/rapor detay - Detayli aylik rapor",
    "/top servis - En cok kazandiran servisler",
    "/top musteri - En cok gelen musteriler",
    "/prim - Calisan prim raporu",
    "",
    "👤 Musteri Komutlari:",
    "/musteri [isim] - Musteri bilgisi",
    "/musteriler - Musteri listesi",
    "/hatirlatmalar - Günün hatirlatmalari",
    "/hatirlatma gonder - Hatirlatmalari gonder",
    "",
    "📦 Stok Komutlari:",
    "/stok - Stok durumu ozeti",
    "/stok [urun adi] - Urun ara",
    "/stok giris [urun] [miktar] - Stok girisi",
    "/stok cikis [urun] [miktar] - Stok cikisi",
    "",
    "🧾 Fatura Komutlari:",
    "/fatura - Bu ayin fatura ozeti",
    "/fatura [musteri adi] - Musteri icin fatura bilgisi",
    "",
    "📋 Genel:",
    "/ozet - Günlük ozet",
    "/yardim - Bu yardim mesaji",
  ].join("\n");
}
