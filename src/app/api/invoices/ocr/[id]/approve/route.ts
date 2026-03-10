import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface StockMapping {
  description: string;
  productId: string | null;
  quantity: number;
  unitPrice: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const stockMappings: StockMapping[] = body.stockMappings || [];

    const invoice = await prisma.uploadedInvoice.findFirst({
      where: { id, clinicId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Fatura bulunamadı" }, { status: 404 });
    }

    if (invoice.approved) {
      return NextResponse.json({ error: "Fatura zaten onaylanmış" }, { status: 400 });
    }

    if (invoice.status !== "COMPLETED") {
      return NextResponse.json({ error: "Fatura henüz işlenmemiş" }, { status: 400 });
    }

    const parsedAmount = invoice.amount ? Math.round(invoice.amount * 100) : 0;

    await prisma.$transaction(async (tx) => {
      // 1. Create expense or income record
      if (invoice.invoiceType === "EXPENSE") {
        if (parsedAmount > 0) {
          const expense = await tx.expense.create({
            data: {
              clinicId,
              description: `Fatura - ${invoice.vendor || invoice.fileName}`,
              amount: parsedAmount,
              category: invoice.category || "DIGER",
              date: invoice.invoiceDate || new Date(),
            },
          });

          await tx.uploadedInvoice.update({
            where: { id },
            data: { linkedExpenseId: expense.id },
          });
        }

        // Stock IN for expense invoices (purchases)
        for (const mapping of stockMappings) {
          if (!mapping.productId) continue;
          const product = await tx.product.findFirst({
            where: { id: mapping.productId, clinicId },
          });
          if (!product) continue;

          const unitPriceKurus = Math.round(mapping.unitPrice * 100);
          await tx.stockMovement.create({
            data: {
              productId: mapping.productId,
              type: "IN",
              quantity: mapping.quantity,
              unitPrice: unitPriceKurus,
              totalPrice: unitPriceKurus * mapping.quantity,
              description: `Fatura: ${invoice.vendor || invoice.fileName} - ${mapping.description}`,
              reference: `invoice-${id}`,
              date: invoice.invoiceDate || new Date(),
              clinicId,
            },
          });

          await tx.product.update({
            where: { id: mapping.productId },
            data: { currentStock: product.currentStock + mapping.quantity },
          });
        }
      } else {
        // INCOME type — create Expense record with type INCOME + stock OUT (sales)
        if (parsedAmount > 0) {
          const incomeRecord = await tx.expense.create({
            data: {
              clinicId,
              description: `Fatura - ${invoice.vendor || invoice.fileName}`,
              amount: parsedAmount,
              category: invoice.category || "SATIS",
              type: "INCOME",
              date: invoice.invoiceDate || new Date(),
            },
          });

          await tx.uploadedInvoice.update({
            where: { id },
            data: { linkedExpenseId: incomeRecord.id },
          });
        }

        for (const mapping of stockMappings) {
          if (!mapping.productId) continue;
          const product = await tx.product.findFirst({
            where: { id: mapping.productId, clinicId },
          });
          if (!product) continue;

          const newStock = Math.max(0, product.currentStock - mapping.quantity);
          const unitPriceKurus = Math.round(mapping.unitPrice * 100);

          await tx.stockMovement.create({
            data: {
              productId: mapping.productId,
              type: "OUT",
              quantity: mapping.quantity,
              unitPrice: unitPriceKurus,
              totalPrice: unitPriceKurus * mapping.quantity,
              description: `Satış Faturası: ${invoice.vendor || invoice.fileName} - ${mapping.description}`,
              reference: `invoice-${id}`,
              date: invoice.invoiceDate || new Date(),
              clinicId,
            },
          });

          await tx.product.update({
            where: { id: mapping.productId },
            data: { currentStock: newStock },
          });
        }
      }

      // 2. Mark as approved
      await tx.uploadedInvoice.update({
        where: { id },
        data: { approved: true },
      });
    });

    return NextResponse.json({ success: true, message: "Fatura onaylandı" });
  } catch (error) {
    console.error("Approve invoice error:", error);
    return NextResponse.json({ error: "Onaylama hatası" }, { status: 500 });
  }
}
