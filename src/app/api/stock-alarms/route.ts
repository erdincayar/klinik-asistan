import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stockAlarmSchema } from "@/lib/validations";

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

    const alarms = await prisma.stockAlarm.findMany({
      where: { clinicId },
      include: { product: { select: { id: true, name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(alarms);
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
    const parsed = stockAlarmSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues?.[0]?.message || "Geçersiz veri" },
        { status: 400 }
      );
    }

    const alarm = await prisma.stockAlarm.create({
      data: {
        ...parsed.data,
        clinicId,
      },
      include: { product: { select: { id: true, name: true, sku: true } } },
    });

    return Response.json(alarm, { status: 201 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
