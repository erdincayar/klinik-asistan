import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const isRead = searchParams.get("isRead");
    const type = searchParams.get("type");

    const where: any = { clinicId };
    if (isRead === "false") where.isRead = false;
    if (isRead === "true") where.isRead = true;
    if (type) {
      where.alarm = { type };
    }

    const logs = await prisma.alarmLog.findMany({
      where,
      include: {
        alarm: { select: { name: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return Response.json(logs);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
