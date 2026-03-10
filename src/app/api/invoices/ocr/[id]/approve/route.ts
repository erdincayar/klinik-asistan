import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
    // Allow overriding invoiceType from frontend
    const overrideInvoiceType: string | undefined = body.invoiceType;

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

    const invoiceType = overrideInvoiceType || invoice.invoiceType;
    const parsedAmount = invoice.amount ? Math.round(invoice.amount * 100) : 0;

    await prisma.$transaction(async (tx) => {
      // Update invoiceType if changed
      if (overrideInvoiceType && overrideInvoiceType !== invoice.invoiceType) {
        await tx.uploadedInvoice.update({
          where: { id },
          data: { invoiceType: overrideInvoiceType },
        });
      }

      if (invoiceType === "EXPENSE") {
        // ─── EXPENSE INVOICE ───
        if (parsedAmount > 0) {
          const expense = await tx.expense.create({
            data: {
              clinicId,
              description: `Fatura - ${invoice.vendor || invoice.fileName}`,
              amount: parsedAmount,
              category: invoice.category || "DIGER",
              type: "EXPENSE",
              date: invoice.invoiceDate || new Date(),
            },
          });

          await tx.uploadedInvoice.update({
            where: { id },
            data: { linkedExpenseId: expense.id },
          });
        }

        // Process stock mappings
        for (const mapping of stockMappings) {
          const unitPriceKurus = Math.round(mapping.unitPrice * 100);

          if (mapping.productId) {
            // Matched product: add stock + update purchasePrice
            const product = await tx.product.findFirst({
              where: { id: mapping.productId, clinicId },
            });
            if (!product) continue;

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
              data: {
                currentStock: product.currentStock + mapping.quantity,
                purchasePrice: unitPriceKurus,
              },
            });
          } else if (mapping.description && mapping.quantity > 0) {
            // Unmatched product: create new product + add stock
            const sku = `INV-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
            const newProduct = await tx.product.create({
              data: {
                name: mapping.description,
                sku,
                category: "DIGER",
                unit: "ADET",
                currentStock: mapping.quantity,
                purchasePrice: unitPriceKurus,
                salePrice: 0,
                clinicId,
              },
            });

            await tx.stockMovement.create({
              data: {
                productId: newProduct.id,
                type: "IN",
                quantity: mapping.quantity,
                unitPrice: unitPriceKurus,
                totalPrice: unitPriceKurus * mapping.quantity,
                description: `Fatura (yeni ürün): ${invoice.vendor || invoice.fileName} - ${mapping.description}`,
                reference: `invoice-${id}`,
                date: invoice.invoiceDate || new Date(),
                clinicId,
              },
            });
          }
        }
      } else {
        // ─── INCOME INVOICE ───
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

        // Calculate profit data
        const matchedItems: Array<{
          description: string;
          productId: string;
          productName: string;
          quantity: number;
          salePrice: number;
          costPrice: number;
          profit: number;
        }> = [];
        const unmatchedItems: Array<{
          description: string;
          quantity: number;
          salePrice: number;
        }> = [];

        for (const mapping of stockMappings) {
          const unitPriceKurus = Math.round(mapping.unitPrice * 100);

          if (mapping.productId) {
            const product = await tx.product.findFirst({
              where: { id: mapping.productId, clinicId },
            });
            if (!product) continue;

            const costPrice = product.purchasePrice;
            const itemProfit = (unitPriceKurus - costPrice) * mapping.quantity;

            matchedItems.push({
              description: mapping.description,
              productId: product.id,
              productName: product.name,
              quantity: mapping.quantity,
              salePrice: unitPriceKurus,
              costPrice,
              profit: itemProfit,
            });

            // Stock OUT for sales
            const newStock = Math.max(0, product.currentStock - mapping.quantity);
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
          } else if (mapping.description) {
            unmatchedItems.push({
              description: mapping.description,
              quantity: mapping.quantity,
              salePrice: unitPriceKurus,
            });
          }
        }

        const totalRevenue = parsedAmount;
        const totalCost = matchedItems.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
        const grossProfit = totalRevenue - totalCost;

        const profitData = {
          totalRevenue,
          totalCost,
          grossProfit,
          matchedItems,
          unmatchedItems,
        };

        await tx.uploadedInvoice.update({
          where: { id },
          data: {
            profitData: profitData as unknown as Prisma.InputJsonValue,
          },
        });
      }

      // Mark as approved
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
