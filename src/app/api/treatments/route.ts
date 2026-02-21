import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { treatmentSchema } from "@/lib/validations";

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
    const patientId = searchParams.get("patientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");

    const where: any = { clinicId };
    if (patientId) where.patientId = patientId;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lt = new Date(endDate);
    }

    const treatments = await prisma.treatment.findMany({
      where,
      include: {
        patient: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    return Response.json(treatments);
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
    const parsed = treatmentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Geçersiz veri") },
        { status: 400 }
      );
    }

    const { date, ...rest } = parsed.data;

    const treatment = await prisma.treatment.create({
      data: {
        ...rest,
        date: new Date(date),
        clinicId,
      },
      include: {
        patient: { select: { name: true } },
      },
    });

    return Response.json(treatment, { status: 201 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
