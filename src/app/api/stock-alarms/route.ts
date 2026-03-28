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

    const [stockAlarms, mainAlarms] = await Promise.all([
      prisma.stockAlarm.findMany({
        where: { clinicId },
        include: { product: { select: { id: true, name: true, sku: true } } },
        orderBy: { createdAt: "desc" },
      }),
      // Ana Alarm tablosundaki STOCK tipli alarmları da getir (AI oluşturmuş olabilir)
      prisma.alarm.findMany({
        where: { clinicId, type: "STOCK" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Ana Alarm tablosundaki STOCK alarmlarını StockAlarm formatına dönüştür
    const convertedAlarms = mainAlarms
      .filter((a) => !stockAlarms.some((sa) => sa.name === a.name)) // Duplikat engelle
      .map((a) => ({
        id: a.id,
        clinicId: a.clinicId,
        name: a.name,
        type: "STOCK" as const,
        threshold: (a.conditions as any)?.thresholdQuantity || (a.conditions as any)?.threshold || 0,
        productId: (a.conditions as any)?.productId || null,
        product: null,
        currency: null,
        isActive: a.isActive,
        lastTriggered: a.lastTriggeredAt,
        createdAt: a.createdAt,
        _fromMainAlarm: true, // UI'da AI badge göstermek için
        aiGenerated: a.aiGenerated,
      }));

    return Response.json([...stockAlarms, ...convertedAlarms]);
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
