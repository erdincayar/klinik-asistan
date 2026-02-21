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
      },
    });

    if (!patient) {
      return Response.json({ error: "Hasta bulunamadı" }, { status: 404 });
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
      return Response.json({ error: "Hasta bulunamadı" }, { status: 404 });
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
      return Response.json({ error: "Hasta bulunamadı" }, { status: 404 });
    }

    await prisma.treatment.deleteMany({ where: { patientId: params.id } });
    await prisma.patient.delete({ where: { id: params.id } });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
