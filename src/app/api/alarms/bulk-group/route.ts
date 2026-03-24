import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  groupName: z.string().min(1),
  isActive: z.boolean(),
});

const deleteSchema = z.object({
  groupName: z.string().min(1),
});

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Geçersiz veri" }, { status: 400 });
    }

    const result = await prisma.alarm.updateMany({
      where: { clinicId, groupName: parsed.data.groupName },
      data: { isActive: parsed.data.isActive },
    });

    return Response.json({ updated: result.count });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Geçersiz veri" }, { status: 400 });
    }

    // First get all alarm IDs in this group to delete their logs
    const groupAlarms = await prisma.alarm.findMany({
      where: { clinicId, groupName: parsed.data.groupName },
      select: { id: true },
    });

    const alarmIds = groupAlarms.map((a) => a.id);

    // Delete logs first, then alarms
    await prisma.$transaction([
      prisma.alarmLog.deleteMany({
        where: { alarmId: { in: alarmIds } },
      }),
      prisma.alarm.deleteMany({
        where: { clinicId, groupName: parsed.data.groupName },
      }),
    ]);

    return Response.json({ deleted: alarmIds.length });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
