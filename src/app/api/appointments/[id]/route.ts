import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: params.id, clinicId },
      include: {
        patient: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!appointment) {
      return Response.json({ error: "Randevu bulunamadı" }, { status: 404 });
    }

    return Response.json(appointment);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const existing = await prisma.appointment.findFirst({
      where: { id: params.id, clinicId },
    });

    if (!existing) {
      return Response.json({ error: "Randevu bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const { status, notes, meetingNotes, startTime, endTime, date, treatmentType } = body;

    // Validate status if provided
    const validStatuses = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];
    if (status && !validStatuses.includes(status)) {
      return Response.json(
        { error: "Geçersiz randevu durumu" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (meetingNotes !== undefined) updateData.meetingNotes = meetingNotes;
    if (treatmentType) updateData.treatmentType = treatmentType;
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (date) updateData.date = new Date(date);

    // If time is changing, check for conflicts
    if (startTime || endTime || date) {
      const checkDate = date ? new Date(date) : existing.date;
      const checkStart = startTime || existing.startTime;
      const checkEnd = endTime || existing.endTime;
      const nextDay = new Date(checkDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const conflicts = await prisma.appointment.findMany({
        where: {
          clinicId,
          id: { not: params.id },
          date: { gte: checkDate, lt: nextDay },
          status: { not: "CANCELLED" },
          OR: [
            { startTime: { lt: checkEnd }, endTime: { gt: checkStart } },
          ],
        },
      });

      if (conflicts.length > 0) {
        return Response.json(
          { error: "Bu saatte başka bir randevu var" },
          { status: 409 }
        );
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
    });

    // If cancelled, include freed slot info
    if (status === "CANCELLED") {
      return Response.json({
        ...appointment,
        cancelledSlot: {
          date: existing.date,
          startTime: existing.startTime,
          endTime: existing.endTime,
        },
      });
    }

    return Response.json(appointment);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const existing = await prisma.appointment.findFirst({
      where: { id: params.id, clinicId },
    });

    if (!existing) {
      return Response.json({ error: "Randevu bulunamadı" }, { status: 404 });
    }

    // Cascade cleanup
    const safeDelete = async (fn: () => Promise<any>) => { try { await fn(); } catch {} };
    await safeDelete(() => prisma.transactionCustomValue.deleteMany({ where: { treatment: { appointmentId: params.id } } }));
    await safeDelete(() => prisma.treatment.deleteMany({ where: { appointmentId: params.id } }));
    // Delete related REMINDER alarms
    const alarms = await prisma.alarm.findMany({ where: { clinicId, conditions: { path: ["appointmentId"], equals: params.id } } }).catch(() => []);
    for (const alarm of alarms) {
      await safeDelete(() => prisma.alarmLog.deleteMany({ where: { alarmId: alarm.id } }));
      await safeDelete(() => prisma.alarm.delete({ where: { id: alarm.id } }));
    }

    await prisma.appointment.delete({
      where: { id: params.id },
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
