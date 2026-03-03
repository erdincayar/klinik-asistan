import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appointmentSchema } from "@/lib/validations";

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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const patientId = searchParams.get("patientId");
    const employeeId = searchParams.get("employeeId");

    const where: any = { clinicId };

    if (date) {
      const d = new Date(date);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      where.date = { gte: d, lt: next };
    } else if (startDate && endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.date = { gte: new Date(startDate), lt: end };
    }

    if (status) {
      where.status = status;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    const raw = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        employee: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    const appointments = raw.map((a) => ({
      id: a.id,
      patientId: a.patient.id,
      patientName: a.patient.name,
      patientPhone: a.patient.phone,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      treatmentType: a.treatmentType,
      status: a.status,
      notes: a.notes,
      employeeId: a.employee?.id || null,
      employeeName: a.employee?.name || null,
      employeeColor: a.employee?.color || null,
    }));

    return Response.json({ appointments });
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
    const parsed = appointmentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Geçersiz veri") },
        { status: 400 }
      );
    }

    const { patientId, employeeId, date, startTime, endTime, treatmentType, notes } =
      parsed.data;

    const appointmentDate = new Date(date);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Check for time conflicts per employee (if employee assigned)
    if (employeeId) {
      const conflicts = await prisma.appointment.findMany({
        where: {
          clinicId,
          employeeId,
          date: { gte: appointmentDate, lt: nextDay },
          status: { not: "CANCELLED" },
          OR: [
            { startTime: { lt: endTime }, endTime: { gt: startTime } },
          ],
        },
      });

      if (conflicts.length > 0) {
        return Response.json(
          { error: "Bu çalışanın bu saatte başka bir randevusu var" },
          { status: 409 }
        );
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        clinicId,
        employeeId: employeeId || null,
        date: appointmentDate,
        startTime,
        endTime,
        treatmentType,
        notes,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        employee: { select: { id: true, name: true, color: true } },
      },
    });

    return Response.json(appointment, { status: 201 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
