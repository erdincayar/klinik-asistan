import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["STOCK", "CUSTOMER_VISIT", "CUSTOMER_BIRTHDAY", "FINANCE", "REMINDER"]),
  conditions: z.record(z.string(), z.any()),
  isActive: z.boolean().optional(),
  isGroup: z.boolean().optional(),
  groupName: z.string().optional(),
  customerId: z.string().optional(),
});

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

    const alarms = await prisma.alarm.findMany({
      where: { clinicId },
      include: {
        _count: { select: { logs: true } },
        customer: { select: { id: true, name: true } },
      },
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
      return Response.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Geçersiz veri" }, { status: 400 });
    }

    const alarm = await prisma.alarm.create({
      data: {
        clinicId,
        name: parsed.data.name,
        type: parsed.data.type,
        conditions: parsed.data.conditions,
        isActive: parsed.data.isActive ?? true,
        isGroup: parsed.data.isGroup ?? false,
        groupName: parsed.data.groupName,
        customerId: parsed.data.customerId,
      },
    });

    return Response.json(alarm, { status: 201 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
