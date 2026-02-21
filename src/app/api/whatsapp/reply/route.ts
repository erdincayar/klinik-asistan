import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const { patientPhone, replyNumber, appointmentId } = await request.json();

    if (!appointmentId) {
      return Response.json(
        { error: "appointmentId gerekli" },
        { status: 400 }
      );
    }

    // Find the cancelled appointment
    const cancelledAppointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId, status: "CANCELLED" },
    });

    if (!cancelledAppointment) {
      return Response.json(
        { error: "İptal edilmiş randevu bulunamadı" },
        { status: 404 }
      );
    }

    // Get available slots for that date
    const targetDate = cancelledAppointment.date;
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayOfWeek = targetDate.getDay();

    const schedule = await prisma.clinicSchedule.findFirst({
      where: { clinicId, dayOfWeek },
    });

    if (!schedule || !schedule.isActive) {
      return Response.json(
        { error: "Bu gün için çalışma saati tanımlanmamış" },
        { status: 400 }
      );
    }

    // Generate available slots
    const [startH, startM] = schedule.startTime.split(":").map(Number);
    const [endH, endM] = schedule.endTime.split(":").map(Number);
    const scheduleStartMinutes = startH * 60 + startM;
    const scheduleEndMinutes = endH * 60 + endM;

    const allSlots: { startTime: string; endTime: string }[] = [];
    for (
      let mins = scheduleStartMinutes;
      mins + schedule.slotDuration <= scheduleEndMinutes;
      mins += schedule.slotDuration
    ) {
      const slotStart = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
      const slotEndMins = mins + schedule.slotDuration;
      const slotEnd = `${String(Math.floor(slotEndMins / 60)).padStart(2, "0")}:${String(slotEndMins % 60).padStart(2, "0")}`;
      allSlots.push({ startTime: slotStart, endTime: slotEnd });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        date: { gte: targetDate, lt: nextDay },
        status: { not: "CANCELLED" },
      },
    });

    const availableSlots = allSlots.filter((slot) => {
      return !appointments.some(
        (apt) => apt.startTime < slot.endTime && apt.endTime > slot.startTime
      );
    });

    // Select slot based on reply number (1-indexed)
    const slotIndex = (replyNumber || 1) - 1;
    if (slotIndex < 0 || slotIndex >= availableSlots.length) {
      return Response.json(
        { error: "Geçersiz slot seçimi", availableSlots },
        { status: 400 }
      );
    }

    const selectedSlot = availableSlots[slotIndex];

    // Create new appointment
    const newAppointment = await prisma.appointment.create({
      data: {
        patientId: cancelledAppointment.patientId,
        clinicId,
        date: targetDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        treatmentType: cancelledAppointment.treatmentType,
        notes: `Yeniden randevu (önceki: ${cancelledAppointment.id})`,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
    });

    return Response.json(newAppointment, { status: 201 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
