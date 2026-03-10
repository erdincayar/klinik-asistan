import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ProfitData {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  matchedItems: Array<{
    description: string;
    productId: string;
    productName: string;
    quantity: number;
    salePrice: number;
    costPrice: number;
    profit: number;
  }>;
  unmatchedItems: Array<{
    description: string;
    quantity: number;
    salePrice: number;
  }>;
}

export async function PATCH(
  _req: NextRequest,
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

    const invoice = await prisma.uploadedInvoice.findFirst({
      where: { id, clinicId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Fatura bulunamadı" }, { status: 404 });
    }

    if (!invoice.approved || invoice.invoiceType !== "INCOME" || !invoice.profitData) {
      return NextResponse.json(
        { error: "Sadece onaylı gelir faturaları için kâr yeniden hesaplanabilir" },
        { status: 400 }
      );
    }

    const profitData = invoice.profitData as unknown as ProfitData;

    const updatedMatchedItems = await Promise.all(
      profitData.matchedItems.map(async (item) => {
        const product = await prisma.product.findFirst({
          where: { id: item.productId, clinicId },
          select: { purchasePrice: true, name: true },
        });

        if (!product) return item;

        const costPrice = product.purchasePrice;
        const profit = (item.salePrice - costPrice) * item.quantity;

        return {
          ...item,
          productName: product.name,
          costPrice,
          profit,
        };
      })
    );

    const totalCost = updatedMatchedItems.reduce(
      (sum, item) => sum + item.costPrice * item.quantity,
      0
    );
    const grossProfit = profitData.totalRevenue - totalCost;

    const updatedProfitData: ProfitData = {
      ...profitData,
      totalCost,
      grossProfit,
      matchedItems: updatedMatchedItems,
    };

    await prisma.uploadedInvoice.update({
      where: { id },
      data: {
        profitData: updatedProfitData as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true, profitData: updatedProfitData });
  } catch (error) {
    console.error("Recalculate profit error:", error);
    return NextResponse.json({ error: "Kâr yeniden hesaplama hatası" }, { status: 500 });
  }
}
