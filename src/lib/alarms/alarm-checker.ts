import { prisma } from "@/lib/prisma";

interface CheckResult {
  checked: number;
  triggered: number;
  errors: number;
}

export async function checkAllAlarms(clinicId: string): Promise<CheckResult> {
  const result: CheckResult = { checked: 0, triggered: 0, errors: 0 };

  const alarms = await prisma.alarm.findMany({
    where: { clinicId, isActive: true },
  });

  for (const alarm of alarms) {
    result.checked++;
    try {
      let triggered = 0;
      const conditions = alarm.conditions as Record<string, any>;

      switch (alarm.type) {
        case "STOCK":
          triggered = await checkStockAlarm(clinicId, alarm.id, conditions);
          break;
        case "CUSTOMER_VISIT":
          triggered = await checkCustomerVisitAlarm(clinicId, alarm.id, conditions);
          break;
        case "CUSTOMER_BIRTHDAY":
          triggered = await checkBirthdayAlarm(clinicId, alarm.id, conditions);
          break;
        default:
          break;
      }

      if (triggered > 0) {
        result.triggered += triggered;
        await prisma.alarm.update({
          where: { id: alarm.id },
          data: { lastTriggeredAt: new Date() },
        });
      }
    } catch (err) {
      console.error(`[AlarmChecker] Error checking alarm ${alarm.id}:`, err);
      result.errors++;
    }
  }

  return result;
}

async function checkStockAlarm(
  clinicId: string,
  alarmId: string,
  conditions: Record<string, any>,
): Promise<number> {
  const { productId, thresholdQuantity } = conditions;
  if (!thresholdQuantity) return 0;

  const whereClause: any = { clinicId, isActive: true };
  if (productId) {
    whereClause.id = productId;
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    select: { id: true, name: true, currentStock: true },
  });

  let triggered = 0;
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  for (const product of products) {
    if (product.currentStock != null && product.currentStock <= thresholdQuantity) {
      // Dedup: skip if unread log exists for same alarm+entity in last 24h
      const existing = await prisma.alarmLog.findFirst({
        where: {
          alarmId,
          entityId: product.id,
          isRead: false,
          createdAt: { gte: oneDayAgo },
        },
      });
      if (existing) continue;

      await prisma.alarmLog.create({
        data: {
          alarmId,
          clinicId,
          message: `${product.name} stok seviyesi düşük: ${product.currentStock} adet`,
          entityId: product.id,
          entityName: product.name,
        },
      });
      triggered++;
    }
  }

  return triggered;
}

async function checkCustomerVisitAlarm(
  clinicId: string,
  alarmId: string,
  conditions: Record<string, any>,
): Promise<number> {
  const multiplier = conditions.multiplier ?? 2;

  // Get patients with 3+ treatments
  const patients = await prisma.patient.findMany({
    where: { clinicId },
    select: {
      id: true,
      name: true,
      treatments: {
        orderBy: { date: "asc" as const },
        select: { date: true },
      },
    },
  });

  let triggered = 0;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const patient of patients) {
    if (patient.treatments.length < 3) continue;

    // Calculate average interval
    const intervals: number[] = [];
    for (let i = 1; i < patient.treatments.length; i++) {
      const diff =
        new Date(patient.treatments[i].date).getTime() -
        new Date(patient.treatments[i - 1].date).getTime();
      intervals.push(diff / (1000 * 60 * 60 * 24));
    }
    const avgInterval = intervals.reduce((s, d) => s + d, 0) / intervals.length;

    const lastVisit = patient.treatments[patient.treatments.length - 1].date;
    const daysSince = Math.floor(
      (now.getTime() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSince > avgInterval * multiplier) {
      // Dedup: skip if log exists for same patient in last 7 days
      const existing = await prisma.alarmLog.findFirst({
        where: {
          alarmId,
          entityId: patient.id,
          createdAt: { gte: sevenDaysAgo },
        },
      });
      if (existing) continue;

      await prisma.alarmLog.create({
        data: {
          alarmId,
          clinicId,
          message: `${patient.name} ${daysSince} gündür ziyaret etmedi (ort. aralık: ${Math.round(avgInterval)} gün)`,
          entityId: patient.id,
          entityName: patient.name,
        },
      });
      triggered++;
    }
  }

  return triggered;
}

async function checkBirthdayAlarm(
  clinicId: string,
  alarmId: string,
  conditions: Record<string, any>,
): Promise<number> {
  const daysBefore = conditions.daysBefore ?? 3;

  const patients = await prisma.patient.findMany({
    where: { clinicId, dateOfBirth: { not: null } },
    select: { id: true, name: true, dateOfBirth: true },
  });

  let triggered = 0;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const patient of patients) {
    if (!patient.dateOfBirth) continue;

    const dob = new Date(patient.dateOfBirth);
    // Build this year's birthday
    const birthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    // If birthday already passed this year, check next year
    if (birthday.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      birthday.setFullYear(birthday.getFullYear() + 1);
    }

    const daysUntil = Math.floor(
      (birthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntil >= 0 && daysUntil <= daysBefore) {
      // Dedup: skip if log exists for same patient+alarm in last 30 days
      const existing = await prisma.alarmLog.findFirst({
        where: {
          alarmId,
          entityId: patient.id,
          createdAt: { gte: thirtyDaysAgo },
        },
      });
      if (existing) continue;

      const msg = daysUntil === 0
        ? `Bugün ${patient.name} adlı müşterinin doğum günü!`
        : `${patient.name} adlı müşterinin doğum günü ${daysUntil} gün sonra`;

      await prisma.alarmLog.create({
        data: {
          alarmId,
          clinicId,
          message: msg,
          entityId: patient.id,
          entityName: patient.name,
        },
      });
      triggered++;
    }
  }

  return triggered;
}
