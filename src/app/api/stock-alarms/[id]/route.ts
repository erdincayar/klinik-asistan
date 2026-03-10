import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stockAlarmSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await request.json();
    const parsed = stockAlarmSchema.partial().safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues?.[0]?.message || "Geçersiz veri" },
        { status: 400 }
      );
    }

    const alarm = await prisma.stockAlarm.updateMany({
      where: { id, clinicId },
      data: parsed.data,
    });

    if (alarm.count === 0) {
      return Response.json({ error: "Alarm bulunamadı" }, { status: 404 });
    }

    const updated = await prisma.stockAlarm.findUnique({
      where: { id },
      include: { product: { select: { id: true, name: true, sku: true } } },
    });

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    const result = await prisma.stockAlarm.deleteMany({
      where: { id, clinicId },
    });

    if (result.count === 0) {
      return Response.json({ error: "Alarm bulunamadı" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
