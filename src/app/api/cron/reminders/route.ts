import { NextRequest } from "next/server";
import { processClinicReminders, getPendingRemindersSummary } from "@/lib/reminders/reminder-engine";
import { prisma } from "@/lib/prisma";

// Vercel Cron configuration
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds max

// GET: Manual trigger or status check
export async function GET(req: NextRequest) {
  // Check for authorization
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow Vercel Cron (sends authorization header) or direct calls with secret
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all clinics
    const clinics = await prisma.clinic.findMany({
      select: { id: true, name: true },
    });

    const results = [];

    for (const clinic of clinics) {
      const pending = await getPendingRemindersSummary(clinic.id);
      results.push({
        clinicId: clinic.id,
        clinicName: clinic.name,
        pendingReminders: pending.length,
        patients: pending.map(p => ({
          name: p.patientName,
          category: p.treatmentCategory,
          daysSince: p.daysSince,
        })),
      });
    }

    return Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      clinics: results,
    });
  } catch (error) {
    console.error("[Cron/Reminders] Error:", error);
    return Response.json({ error: "Failed to get reminder status" }, { status: 500 });
  }
}

// POST: Execute reminders (triggered by Vercel Cron or manual)
export async function POST(req: NextRequest) {
  // Check for authorization
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clinics = await prisma.clinic.findMany({
      select: { id: true, name: true },
    });

    const results = [];
    let totalSent = 0;
    let totalFailed = 0;

    for (const clinic of clinics) {
      const result = await processClinicReminders(clinic.id);
      totalSent += result.sent;
      totalFailed += result.failed;
      results.push({
        clinicId: clinic.id,
        clinicName: clinic.name,
        ...result,
      });
    }

    return Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      totalSent,
      totalFailed,
      clinics: results,
    });
  } catch (error) {
    console.error("[Cron/Reminders] Error:", error);
    return Response.json({ error: "Failed to process reminders" }, { status: 500 });
  }
}
