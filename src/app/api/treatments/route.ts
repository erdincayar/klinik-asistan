import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { treatmentSchema } from "@/lib/validations";

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
    const patientId = searchParams.get("patientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");

    const where: any = { clinicId };
    if (patientId) where.patientId = patientId;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lt = new Date(endDate);
    }

    const treatments = await prisma.treatment.findMany({
      where,
      include: {
        patient: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    return Response.json(treatments);
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
    const { customValues, addToDebt, contactName, dueDate, lineItems, ...treatmentBody } = body;
    const parsed = treatmentSchema.safeParse(treatmentBody);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Geçersiz veri") },
        { status: 400 }
      );
    }

    const { date, ...rest } = parsed.data;

    // If no patientId, save as income record in Expense table instead
    if (!rest.patientId) {
      const incomeRecord = await prisma.expense.create({
        data: {
          clinicId,
          description: rest.name || "Gelir",
          amount: rest.amount,
          category: rest.category || "SATIS",
          type: "INCOME",
          date: new Date(date),
        },
      });

      // Process line items for stock OUT
      if (Array.isArray(lineItems)) {
        for (const item of lineItems) {
          if (item.productId && item.quantity > 0) {
            const product = await prisma.product.findFirst({
              where: { id: item.productId, clinicId },
            });
            if (!product) continue;
            await prisma.stockMovement.create({
              data: {
                productId: item.productId,
                type: "OUT",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.unitPrice * item.quantity,
                description: `Satış: ${rest.name || item.description}`,
                reference: `expense-income-${incomeRecord.id}`,
                date: new Date(date),
                clinicId,
              },
            });
            await prisma.product.update({
              where: { id: item.productId },
              data: { currentStock: Math.max(0, (product.currentStock ?? 0) - item.quantity) },
            });
          }
        }
      }

      // Cari hesap
      if (addToDebt && contactName) {
        await prisma.debt.create({
          data: {
            clinicId,
            direction: "RECEIVABLE",
            contactName,
            description: rest.name || "Gelir",
            totalAmount: rest.amount,
            dueDate: dueDate ? new Date(dueDate) : null,
          },
        });
      }

      return Response.json(incomeRecord, { status: 201 });
    }

    const treatment = await prisma.treatment.create({
      data: {
        ...rest,
        date: new Date(date),
        clinicId,
      },
      include: {
        patient: { select: { name: true } },
      },
    });

    // Save custom values if provided
    if (Array.isArray(customValues) && customValues.length > 0) {
      await Promise.all(
        customValues.map((cv: { fieldKey: string; value: string }) =>
          prisma.transactionCustomValue.create({
            data: { treatmentId: treatment.id, fieldKey: cv.fieldKey, value: cv.value },
          }),
        ),
      ).catch(() => {});
    }

    // Process line items: create stock OUT movements for product-based items
    if (Array.isArray(lineItems)) {
      for (const item of lineItems) {
        if (item.productId && item.quantity > 0) {
          const product = await prisma.product.findFirst({
            where: { id: item.productId, clinicId },
          });
          if (!product) continue;

          await prisma.stockMovement.create({
            data: {
              productId: item.productId,
              type: "OUT",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
              description: `Satış: ${rest.name || item.description}`,
              reference: `treatment-${treatment.id}`,
              date: new Date(date),
              clinicId,
            },
          });

          await prisma.product.update({
            where: { id: item.productId },
            data: {
              currentStock: Math.max(0, (product.currentStock ?? 0) - item.quantity),
            },
          });
        }
      }
    }

    // Create cari hesap entry if requested
    if (addToDebt && contactName) {
      const patient = await prisma.patient.findFirst({
        where: { id: rest.patientId, clinicId },
        select: { name: true },
      });
      await prisma.debt.create({
        data: {
          clinicId,
          direction: "RECEIVABLE",
          contactName: contactName || patient?.name || "Bilinmeyen",
          description: `${rest.name || "Gelir"} - ${rest.category || ""}`,
          totalAmount: rest.amount,
          patientId: rest.patientId || null,
          treatmentId: treatment.id,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });
    }

    // Fire-and-forget: upsert service name and category for autocomplete
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

    return Response.json(treatment, { status: 201 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
