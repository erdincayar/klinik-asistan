import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bulkCreateSchema = z.object({
  type: z.enum(["CUSTOMER_VISIT", "CUSTOMER_BIRTHDAY"]),
  groupName: z.string().min(1),
  mode: z.enum(["smart", "manual"]),
  multiplier: z.number().optional(),
  defaultThreshold: z.number().optional(),
  thresholdDays: z.number().optional(),
  daysBefore: z.number().optional(),
});

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
    const parsed = bulkCreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Geçersiz veri" }, { status: 400 });
    }

    const { type, groupName, mode, multiplier = 2, defaultThreshold = 60, thresholdDays = 60, daysBefore = 3 } = parsed.data;

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

      let created = 0;

      // Process in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < patients.length; i += chunkSize) {
        const chunk = patients.slice(i, i + chunkSize);

        await prisma.$transaction(
          chunk.map((patient) => {
            let patientThreshold: number;
            let patientMode: string;

            if (mode === "smart" && patient.treatments.length >= 3) {
              const intervals: number[] = [];
              for (let j = 1; j < patient.treatments.length; j++) {
                const diff =
                  new Date(patient.treatments[j].date).getTime() -
                  new Date(patient.treatments[j - 1].date).getTime();
                intervals.push(diff / (1000 * 60 * 60 * 24));
              }
              const avgInterval = intervals.reduce((s, d) => s + d, 0) / intervals.length;
              patientThreshold = Math.round(avgInterval * multiplier);
              patientMode = "smart";
            } else if (mode === "smart") {
              patientThreshold = defaultThreshold;
              patientMode = "default";
            } else {
              patientThreshold = thresholdDays;
              patientMode = "manual";
            }

            const conditions = {
              thresholdDays: patientThreshold,
              multiplier,
              mode: patientMode,
              customerId: patient.id,
            };

            return prisma.alarm.upsert({
              where: {
                id: `bulk_${clinicId}_${patient.id}_${type}_${groupName}`,
              },
              create: {
                clinicId,
                name: `${patient.name} - Ziyaret Takibi`,
                type,
                conditions,
                isGroup: true,
                groupName,
                customerId: patient.id,
              },
              update: {
                conditions,
                name: `${patient.name} - Ziyaret Takibi`,
              },
            });
          }),
        );

        // Count (upsert doesn't tell us created vs updated easily, so we approximate)
        created += chunk.length;
      }

      return Response.json({ created, total: patients.length, groupName });
    }

    if (type === "CUSTOMER_BIRTHDAY") {
      const patients = await prisma.patient.findMany({
        where: { clinicId, dateOfBirth: { not: null } },
        select: { id: true, name: true },
      });

      let created = 0;

      const chunkSize = 50;
      for (let i = 0; i < patients.length; i += chunkSize) {
        const chunk = patients.slice(i, i + chunkSize);

        await prisma.$transaction(
          chunk.map((patient) => {
            const conditions = {
              daysBefore,
              customerId: patient.id,
            };

            return prisma.alarm.upsert({
              where: {
                id: `bulk_${clinicId}_${patient.id}_${type}_${groupName}`,
              },
              create: {
                clinicId,
                name: `${patient.name} - Doğum Günü`,
                type,
                conditions,
                isGroup: true,
                groupName,
                customerId: patient.id,
              },
              update: {
                conditions,
                name: `${patient.name} - Doğum Günü`,
              },
            });
          }),
        );

        created += chunk.length;
      }

      return Response.json({ created, total: patients.length, groupName });
    }

    return Response.json({ error: "Geçersiz tür" }, { status: 400 });
  } catch (err) {
    console.error("[BulkCreate] Error:", err);
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
