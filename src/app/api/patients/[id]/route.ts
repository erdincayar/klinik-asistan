import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { patientSchema } from "@/lib/validations";

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

    const patient = await prisma.patient.findFirst({
      where: { id: params.id, clinicId },
      include: {
        treatments: { orderBy: { date: "desc" } },
        debts: {
          orderBy: { createdAt: "desc" },
          include: { payments: { orderBy: { paidAt: "desc" } } },
        },
      },
    });

    if (!patient) {
      return Response.json({ error: "Müşteri bulunamadı" }, { status: 404 });
    }

    return Response.json(patient);
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

    const existing = await prisma.patient.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!existing) {
      return Response.json({ error: "Müşteri bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patientSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Geçersiz veri") },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return Response.json(patient);
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

    const existing = await prisma.patient.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!existing) {
      return Response.json({ error: "Müşteri bulunamadı" }, { status: 404 });
    }

    const pid = params.id;
    const safeDelete = async (fn: () => Promise<any>) => { try { await fn(); } catch {} };

    // Delete all related records before deleting patient
    await safeDelete(() => prisma.transactionCustomValue.deleteMany({ where: { treatment: { patientId: pid } } }));
    await safeDelete(() => prisma.treatment.deleteMany({ where: { patientId: pid } }));
    await safeDelete(() => prisma.debtPayment.deleteMany({ where: { debt: { patientId: pid } } }));
    await safeDelete(() => prisma.debt.deleteMany({ where: { patientId: pid } }));
    await safeDelete(() => prisma.appointment.deleteMany({ where: { patientId: pid } }));
    await safeDelete(() => prisma.invoice.deleteMany({ where: { patientId: pid } }));
    await safeDelete(() => prisma.patientPhoto.deleteMany({ where: { patientId: pid } }));
    await safeDelete(() => prisma.patientPreference.deleteMany({ where: { patientId: pid } }));
    await safeDelete(() => prisma.patientVisitPattern.deleteMany({ where: { patientId: pid } }));
    await safeDelete(() => prisma.reminderLog.deleteMany({ where: { patientId: pid } }));
    await safeDelete(() => prisma.customerCustomValue.deleteMany({ where: { customerId: pid } }));
    await safeDelete(() => prisma.consentFormResponse.deleteMany({ where: { patientId: pid } }));

    await prisma.patient.delete({ where: { id: pid } });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
