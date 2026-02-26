import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPendingRemindersSummary, sendReminder, generatePersonalizedMessage } from "@/lib/reminders/reminder-engine";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

  const searchParams = req.nextUrl.searchParams;
  const tab = searchParams.get("tab") || "pending";

  switch (tab) {
    case "pending": {
      const pending = await getPendingRemindersSummary(clinicId);
      return Response.json({ pending });
    }
    case "history": {
      const logs = await prisma.reminderLog.findMany({
        where: { clinicId },
        include: { patient: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return Response.json({ logs });
    }
    case "rules": {
      const rules = await prisma.reminder.findMany({
        where: { clinicId },
        orderBy: { createdAt: "desc" },
      });
      return Response.json({ rules });
    }
    case "stats": {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const pending = await getPendingRemindersSummary(clinicId);
      const sentToday = await prisma.reminderLog.count({
        where: { clinicId, status: "SENT", createdAt: { gte: today, lt: tomorrow } },
      });
      const sentMonth = await prisma.reminderLog.count({
        where: { clinicId, status: "SENT", createdAt: { gte: monthStart } },
      });

      return Response.json({ pendingCount: pending.length, sentToday, sentMonth });
    }
    default:
      return Response.json({ error: "Invalid tab" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

  const body = await req.json();
  const { action } = body;

  switch (action) {
    case "send_reminder": {
      const { patientId, treatmentCategory, lastTreatmentDate, intervalDays } = body;

      // Get patient preferences
      const preferences = await prisma.patientPreference.findMany({
        where: { patientId, clinicId },
      });
      const prefTypes = preferences.map(p => p.type);

      // Get patient name
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) return Response.json({ error: "Patient not found" }, { status: 404 });

      // Get reminder template
      const reminder = await prisma.reminder.findFirst({
        where: { clinicId, treatmentCategory, isActive: true },
      });

      const message = await generatePersonalizedMessage(
        patient.name,
        treatmentCategory,
        new Date(lastTreatmentDate),
        intervalDays,
        prefTypes,
        reminder?.messageTemplate || "Sayin {hasta}, {islem} kontrolunuz icin randevu zamaniniz gelmistir."
      );

      const logId = await sendReminder(patientId, clinicId, message);
      return Response.json({ success: true, logId, message });
    }
    case "create_rule": {
      const { treatmentCategory, intervalDays, messageTemplate } = body;
      const rule = await prisma.reminder.create({
        data: {
          clinicId,
          treatmentCategory,
          intervalDays: parseInt(intervalDays),
          messageTemplate,
          isActive: true,
        },
      });
      return Response.json({ success: true, rule });
    }
    case "toggle_rule": {
      const { ruleId, isActive } = body;
      await prisma.reminder.update({
        where: { id: ruleId },
        data: { isActive },
      });
      return Response.json({ success: true });
    }
    case "delete_rule": {
      const { ruleId } = body;
      await prisma.reminder.delete({ where: { id: ruleId } });
      return Response.json({ success: true });
    }
    case "update_preferences": {
      const { patientId, preferences } = body as { patientId: string; preferences: string[] };

      // Delete existing preferences
      await prisma.patientPreference.deleteMany({
        where: { patientId, clinicId },
      });

      // Create new preferences
      if (preferences.length > 0) {
        await prisma.patientPreference.createMany({
          data: preferences.map(type => ({
            patientId,
            clinicId,
            type,
          })),
        });
      }

      return Response.json({ success: true });
    }
    case "search_patients": {
      const { query } = body;
      const patients = await prisma.patient.findMany({
        where: {
          clinicId,
          name: { contains: query },
        },
        include: {
          preferences: true,
          visitPattern: true,
        },
        take: 10,
      });
      // SQLite case-sensitive filter
      const filtered = patients.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
      );
      return Response.json({ patients: filtered });
    }
    default:
      return Response.json({ error: "Invalid action" }, { status: 400 });
  }
}
