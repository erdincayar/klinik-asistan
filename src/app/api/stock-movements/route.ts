import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stockMovementSchema } from "@/lib/validations";

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
    const productId = searchParams.get("productId") || "";
    const type = searchParams.get("type") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const where: any = { clinicId };

    if (productId) {
      where.productId = productId;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { name: true, sku: true, unit: true } },
      },
      orderBy: { date: "desc" },
    });

    return Response.json(movements);
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
    const parsed = stockMovementSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Geçersiz veri") },
        { status: 400 }
      );
    }

    // Verify product belongs to clinic
    const product = await prisma.product.findFirst({
      where: { id: parsed.data.productId, clinicId },
    });
    if (!product) {
      return Response.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    const { productId, type, quantity, unitPrice = 0, description, reference, date } = parsed.data;
    const totalPrice = quantity * unitPrice;

    // Calculate new stock
    let newStock = product.currentStock;
    if (type === "IN") {
      newStock = product.currentStock + quantity;
    } else if (type === "OUT") {
      if (product.currentStock < quantity) {
        return Response.json(
          { error: "Yetersiz stok" },
          { status: 400 }
        );
      }
      newStock = product.currentStock - quantity;
    } else if (type === "ADJUSTMENT") {
      // For adjustment: positive quantity adds, negative would subtract
      // But since quantity min is 1, we use the quantity as the new absolute difference
      // Actually per spec: ADJUSTMENT sets currentStock + quantity for positive
      newStock = product.currentStock + quantity;
    }

    // Create movement and update stock in a transaction
    const movement = await prisma.$transaction(async (tx) => {
      const created = await tx.stockMovement.create({
        data: {
          productId,
          type,
          quantity,
          unitPrice,
          totalPrice,
          description,
          reference,
          date: date ? new Date(date) : new Date(),
          clinicId,
        },
        include: {
          product: { select: { name: true, sku: true, unit: true } },
        },
      });

      await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      });

      return created;
    });

    return Response.json(movement, { status: 201 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
