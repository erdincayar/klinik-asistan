import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return Response.json(
        { error: "Tarih parametresi gerekli" },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // Get clinic schedule for this day
    const schedule = await prisma.clinicSchedule.findFirst({
      where: { clinicId, dayOfWeek },
    });

    if (!schedule || !schedule.isActive) {
      return Response.json([]);
    }

    // Generate all possible slots
    const slots: { startTime: string; endTime: string; available: boolean }[] =
      [];

    const [startH, startM] = schedule.startTime.split(":").map(Number);
    const [endH, endM] = schedule.endTime.split(":").map(Number);
    const scheduleStartMinutes = startH * 60 + startM;
    const scheduleEndMinutes = endH * 60 + endM;

    for (
      let mins = scheduleStartMinutes;
      mins + schedule.slotDuration <= scheduleEndMinutes;
      mins += schedule.slotDuration
    ) {
      const slotStart = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
      const slotEndMins = mins + schedule.slotDuration;
      const slotEnd = `${String(Math.floor(slotEndMins / 60)).padStart(2, "0")}:${String(slotEndMins % 60).padStart(2, "0")}`;
      slots.push({ startTime: slotStart, endTime: slotEnd, available: true });
    }

    // Get existing appointments for that date (not cancelled)
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        date: { gte: targetDate, lt: nextDay },
        status: { not: "CANCELLED" },
      },
    });

    // Mark occupied slots
    for (const slot of slots) {
      const isOccupied = appointments.some(
        (apt) => apt.startTime < slot.endTime && apt.endTime > slot.startTime
      );
      if (isOccupied) {
        slot.available = false;
      }
    }

    return Response.json(slots);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
