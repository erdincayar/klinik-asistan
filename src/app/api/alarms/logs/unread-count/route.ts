import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const count = await prisma.alarmLog.count({
      where: { clinicId, isRead: false },
    });

    return Response.json({ count });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
