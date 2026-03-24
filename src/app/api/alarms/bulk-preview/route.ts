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

    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const mode = url.searchParams.get("mode") || "smart";
    const multiplier = parseFloat(url.searchParams.get("multiplier") || "2");
    const defaultThreshold = parseInt(url.searchParams.get("defaultThreshold") || "60", 10);
    const thresholdDays = parseInt(url.searchParams.get("thresholdDays") || "60", 10);
    const daysBefore = parseInt(url.searchParams.get("daysBefore") || "3", 10);

    if (type === "CUSTOMER_VISIT") {
      const patients = await prisma.patient.findMany({
        where: { clinicId },
        select: {
          id: true,
          name: true,
          treatments: {
            orderBy: { date: "asc" as const },
            select: { date: true },
          },
        },
      });

      let smartCount = 0;
      let defaultCount = 0;
      const customers: Array<{
        id: string;
        name: string;
        treatmentCount: number;
        avgInterval: number | null;
        thresholdDays: number;
        mode: string;
      }> = [];

      for (const patient of patients) {
        const treatmentCount = patient.treatments.length;
        let avgInterval: number | null = null;
        let patientThreshold: number;
        let patientMode: string;

        if (mode === "smart" && treatmentCount >= 3) {
          // Calculate average interval
          const intervals: number[] = [];
          for (let i = 1; i < patient.treatments.length; i++) {
            const diff =
              new Date(patient.treatments[i].date).getTime() -
              new Date(patient.treatments[i - 1].date).getTime();
            intervals.push(diff / (1000 * 60 * 60 * 24));
          }
          avgInterval = Math.round(intervals.reduce((s, d) => s + d, 0) / intervals.length);
          patientThreshold = Math.round(avgInterval * multiplier);
          patientMode = "smart";
          smartCount++;
        } else if (mode === "smart") {
          // Not enough data, use default threshold
          patientThreshold = defaultThreshold;
          patientMode = "default";
          defaultCount++;
        } else {
          // Manual mode
          patientThreshold = thresholdDays;
          patientMode = "manual";
        }

        customers.push({
          id: patient.id,
          name: patient.name,
          treatmentCount,
          avgInterval,
          thresholdDays: patientThreshold,
          mode: patientMode,
        });
      }

      return Response.json({
        total: customers.length,
        smartCount,
        defaultCount,
        customers,
      });
    }

    if (type === "CUSTOMER_BIRTHDAY") {
      const patients = await prisma.patient.findMany({
        where: { clinicId, dateOfBirth: { not: null } },
        select: { id: true, name: true, dateOfBirth: true },
      });

      return Response.json({
        total: patients.length,
        daysBefore,
        customers: patients.map((p) => ({
          id: p.id,
          name: p.name,
          dateOfBirth: p.dateOfBirth,
        })),
      });
    }

    return Response.json({ error: "Geçersiz tür" }, { status: 400 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
