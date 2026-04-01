import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const expense = await prisma.expense.findFirst({
      where: { id: params.id, clinicId },
    });

    if (!expense) {
      return Response.json({ error: "Gider bulunamadı" }, { status: 404 });
    }

    return Response.json(expense);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const existing = await prisma.expense.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!existing) {
      return Response.json({ error: "Gider bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Geçersiz veri") },
        { status: 400 }
      );
    }

    const { date, ...rest } = parsed.data;

    const expense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        ...rest,
        date: new Date(date),
      },
    });

    return Response.json(expense);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const existing = await prisma.expense.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!existing) {
      return Response.json({ error: "Gider bulunamadı" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // If this expense is linked to an uploaded invoice, clean up invoice side effects
      const linkedInvoice = await tx.uploadedInvoice.findFirst({
        where: { linkedExpenseId: params.id, clinicId },
      });

      if (linkedInvoice && linkedInvoice.approved) {
        const reference = `invoice-${linkedInvoice.id}`;

        // Reverse stock movements
        const stockMovements = await tx.stockMovement.findMany({
          where: { clinicId, reference },
        });

        for (const movement of stockMovements) {
          const product = await tx.product.findFirst({
            where: { id: movement.productId, clinicId },
          });
          if (!product) continue;

          if (movement.type === "IN") {
            await tx.product.update({
              where: { id: product.id },
              data: {
                currentStock: Math.max(0, (product.currentStock ?? 0) - movement.quantity),
              },
            });
          } else if (movement.type === "OUT") {
            await tx.product.update({
              where: { id: product.id },
              data: {
                currentStock: (product.currentStock ?? 0) + movement.quantity,
              },
            });
          }
        }

        // Delete stock movements
        await tx.stockMovement.deleteMany({
          where: { clinicId, reference },
        });

        // Reset invoice approval state
        await tx.uploadedInvoice.update({
          where: { id: linkedInvoice.id },
          data: {
            approved: false,
            linkedExpenseId: null,
            profitData: undefined,
          },
        });
      }

      // Reverse stock movements created by manual income/expense forms
      for (const ref of [`expense-${params.id}`, `expense-income-${params.id}`]) {
        const manualMovements = await tx.stockMovement.findMany({
          where: { clinicId, reference: ref },
        });
        for (const movement of manualMovements) {
          const product = await tx.product.findFirst({
            where: { id: movement.productId, clinicId },
          });
          if (!product) continue;
          if (movement.type === "IN") {
            await tx.product.update({
              where: { id: product.id },
              data: { currentStock: Math.max(0, (product.currentStock ?? 0) - movement.quantity) },
            });
          } else if (movement.type === "OUT") {
            await tx.product.update({
              where: { id: product.id },
              data: { currentStock: (product.currentStock ?? 0) + movement.quantity },
            });
          }
        }
        await tx.stockMovement.deleteMany({ where: { clinicId, reference: ref } });
      }

      // Delete the expense
      await tx.expense.delete({ where: { id: params.id } });
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
