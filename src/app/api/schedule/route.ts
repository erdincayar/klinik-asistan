import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clinicScheduleSchema } from "@/lib/validations";
import { z } from "zod";

const defaultSchedule = [
  { dayOfWeek: 0, startTime: "09:00", endTime: "18:00", slotDuration: 30, isActive: false },
  { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", slotDuration: 30, isActive: true },
  { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", slotDuration: 30, isActive: true },
  { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", slotDuration: 30, isActive: true },
  { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", slotDuration: 30, isActive: true },
  { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", slotDuration: 30, isActive: true },
  { dayOfWeek: 6, startTime: "09:00", endTime: "18:00", slotDuration: 30, isActive: false },
];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const schedules = await prisma.clinicSchedule.findMany({
      where: { clinicId },
      orderBy: { dayOfWeek: "asc" },
    });

    if (schedules.length === 0) {
      return Response.json(
        defaultSchedule.map((s) => ({ ...s, id: null, clinicId }))
      );
    }

    return Response.json(schedules);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const body = await request.json();
    const arraySchema = z.array(clinicScheduleSchema);
    const parsed = arraySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Geçersiz veri") },
        { status: 400 }
      );
    }

    const results = [];

    for (const item of parsed.data) {
      const existing = await prisma.clinicSchedule.findFirst({
        where: { clinicId, dayOfWeek: item.dayOfWeek },
      });

      if (existing) {
        const updated = await prisma.clinicSchedule.update({
          where: { id: existing.id },
          data: {
            startTime: item.startTime,
            endTime: item.endTime,
            slotDuration: item.slotDuration,
            isActive: item.isActive,
          },
        });
        results.push(updated);
      } else {
        const created = await prisma.clinicSchedule.create({
          data: {
            clinicId,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            slotDuration: item.slotDuration,
            isActive: item.isActive,
          },
        });
        results.push(created);
      }
    }

    return Response.json(results, { status: 201 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
