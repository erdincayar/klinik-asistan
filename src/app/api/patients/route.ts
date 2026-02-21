import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { patientSchema } from "@/lib/validations";

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
    const search = searchParams.get("search") || "";

    const patients = await prisma.patient.findMany({
      where: {
        clinicId,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { treatments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(patients);
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
    const parsed = patientSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Geçersiz veri") },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.create({
      data: {
        ...parsed.data,
        clinicId,
      },
    });

    return Response.json(patient, { status: 201 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
