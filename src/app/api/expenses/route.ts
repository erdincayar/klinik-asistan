import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";

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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");

    const where: any = { clinicId };
    if (category) where.category = category;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lt = new Date(endDate);
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return Response.json(expenses);
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
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Geçersiz veri") },
        { status: 400 }
      );
    }

    const { date, addToDebt, contactName, dueDate, ...rest } = parsed.data;
    const lineItems = body.lineItems;

    const expense = await prisma.expense.create({
      data: {
        ...rest,
        date: new Date(date),
        clinicId,
      },
    });

    // Process line items: create stock IN movements for product-based items (purchase)
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
              type: "IN",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
              description: `Alış: ${item.description}`,
              reference: `expense-${expense.id}`,
              date: new Date(date),
              clinicId,
            },
          });

          await prisma.product.update({
            where: { id: item.productId },
            data: {
              currentStock: (product.currentStock ?? 0) + item.quantity,
              purchasePrice: item.unitPrice,
            },
          });
        }
      }
    }

    // Optionally create a cari hesap (debt) record
    if (addToDebt && contactName) {
      await prisma.debt.create({
        data: {
          clinicId,
          direction: "PAYABLE",
          contactName,
          description: rest.description,
          totalAmount: rest.amount,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });
    }

    return Response.json(expense, { status: 201 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
