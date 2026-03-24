import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appointmentTransactionsSchema } from "@/lib/validations";

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

    // Verify appointment belongs to clinic
    const appointment = await prisma.appointment.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!appointment) {
      return Response.json({ error: "Randevu bulunamadı" }, { status: 404 });
    }

    const treatments = await prisma.treatment.findMany({
      where: { appointmentId: params.id, clinicId },
      include: { employee: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ treatments });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(
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

    // Verify appointment belongs to clinic
    const appointment = await prisma.appointment.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!appointment) {
      return Response.json({ error: "Randevu bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = appointmentTransactionsSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues?.[0]?.message || "Geçersiz veri" },
        { status: 400 }
      );
    }

    const { transactions, markCompleted } = parsed.data;

    const results = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const item of transactions) {
        const treatment = await tx.treatment.create({
          data: {
            patientId: item.patientId,
            name: item.name,
            amount: item.amount,
            date: new Date(item.date),
            category: item.category || "GENEL",
            paymentMethod: item.paymentMethod || null,
            description: item.description || null,
            employeeId: item.employeeId || null,
            appointmentId: params.id,
            clinicId,
          },
        });
        created.push(treatment);
      }

      if (markCompleted) {
        await tx.appointment.update({
          where: { id: params.id },
          data: { status: "COMPLETED" },
        });
      }

      return created;
    });

    // Fire-and-forget: upsert service names
    for (const item of transactions) {
      if (item.name) {
        prisma.clinicServiceName.upsert({
          where: { clinicId_name: { clinicId, name: item.name } },
          update: { usageCount: { increment: 1 } },
          create: { clinicId, name: item.name },
        }).catch(() => {});
      }
    }

    return Response.json({ treatments: results }, { status: 201 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
