import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  patientId: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().min(1).optional(),
  date: z.string().optional(),
  category: z.string().optional(),
  customValues: z.array(z.object({
    fieldKey: z.string(),
    value: z.string(),
  })).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic" }, { status: 400 });
    }

    const { id } = await params;

    const treatment = await prisma.treatment.findFirst({
      where: { id, clinicId },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        customValues: true,
      },
    });

    if (!treatment) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(treatment);
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || "Geçersiz veri" },
        { status: 400 },
      );
    }

    const { customValues, date, ...rest } = parsed.data;

    const updateData: any = { ...rest };
    if (date) updateData.date = new Date(date);

    const treatment = await prisma.treatment.update({
      where: { id, clinicId },
      data: updateData,
      include: {
        patient: { select: { name: true } },
        customValues: true,
      },
    });

    // Upsert custom values
    if (customValues && customValues.length > 0) {
      await Promise.all(
        customValues.map((cv) =>
          prisma.transactionCustomValue.upsert({
            where: { treatmentId_fieldKey: { treatmentId: id, fieldKey: cv.fieldKey } },
            update: { value: cv.value },
            create: { treatmentId: id, fieldKey: cv.fieldKey, value: cv.value },
          }),
        ),
      );
    }

    // Fire-and-forget: update autocomplete
    if (rest.name) {
      prisma.clinicServiceName.upsert({
        where: { clinicId_name: { clinicId, name: rest.name } },
        update: { usageCount: { increment: 1 } },
        create: { clinicId, name: rest.name },
      }).catch(() => {});
    }
    if (rest.category) {
      prisma.clinicCategory.upsert({
        where: { clinicId_name: { clinicId, name: rest.category } },
        update: { usageCount: { increment: 1 } },
        create: { clinicId, name: rest.category },
      }).catch(() => {});
    }

    return NextResponse.json(treatment);
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic" }, { status: 400 });
    }

    const { id } = await params;

    const existing = await prisma.treatment.findFirst({
      where: { id, clinicId },
    });
    if (!existing) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Reverse stock movements created by this treatment
      const reference = `treatment-${id}`;
      const stockMovements = await tx.stockMovement.findMany({
        where: { clinicId, reference },
      });

      for (const movement of stockMovements) {
        const product = await tx.product.findFirst({
          where: { id: movement.productId, clinicId },
        });
        if (!product) continue;

        if (movement.type === "OUT") {
          // Was a sale — reverse stock deduction
          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: (product.currentStock ?? 0) + movement.quantity },
          });
        } else if (movement.type === "IN") {
          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: Math.max(0, (product.currentStock ?? 0) - movement.quantity) },
          });
        }
      }

      // Delete stock movements
      await tx.stockMovement.deleteMany({ where: { clinicId, reference } });

      // Delete linked debt records
      await tx.debt.deleteMany({ where: { clinicId, treatmentId: id } });

      // Delete custom values
      await tx.transactionCustomValue.deleteMany({ where: { treatmentId: id } });

      // Delete the treatment
      await tx.treatment.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
