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
        customValues: true,
        treatments: { orderBy: { date: "asc" as const }, select: { date: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get alert rule threshold
    const alertRule = await prisma.customerAlertRule.findFirst({
      where: { clinicId, alertType: "no_visit", isActive: true },
    });
    const thresholdDays = alertRule?.thresholdDays ?? 60;

    const result = patients.map((p) => {
      const { treatments, ...rest } = p;
      let riskStatus: "new" | "active" | "warning" | "risk" = "new";

      if (treatments.length > 0) {
        const last = treatments[treatments.length - 1].date;
        const daysSince = Math.floor(
          (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24),
        );
        let expectedInterval = thresholdDays;
        if (treatments.length >= 2) {
          const intervals: number[] = [];
          for (let i = 1; i < treatments.length; i++) {
            const diff = new Date(treatments[i].date).getTime() - new Date(treatments[i - 1].date).getTime();
            intervals.push(diff / (1000 * 60 * 60 * 24));
          }
          expectedInterval = Math.round(intervals.reduce((s, d) => s + d, 0) / intervals.length);
        }

        if (daysSince <= expectedInterval) riskStatus = "active";
        else if (daysSince <= expectedInterval * 1.5) riskStatus = "warning";
        else riskStatus = "risk";
      }

      return { ...rest, riskStatus };
    });

    return Response.json(result);
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
