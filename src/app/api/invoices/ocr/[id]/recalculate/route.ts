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

function calculateSimilarity(a: string, b: string): number {
  if (a.includes(b) || b.includes(a)) return 0.9;
  const wordsA = a.split(/\s+/).filter(w => w.length > 2);
  const wordsB = b.split(/\s+/).filter(w => w.length > 2);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  let matchCount = 0;
  for (const wa of wordsA) {
    for (const wb of wordsB) {
      if (wa === wb || wa.includes(wb) || wb.includes(wa)) {
        matchCount++;
        break;
      }
    }
  }
  return matchCount / Math.max(wordsA.length, wordsB.length);
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

    if (!invoice.approved) {
      return NextResponse.json(
        { error: "Sadece onaylı faturalar için kâr yeniden hesaplanabilir" },
        { status: 400 }
      );
    }

    const totalRevenue = invoice.amount ? Math.round(invoice.amount * 100) : 0;

    // If profitData exists, update with current purchase prices
    if (invoice.profitData) {
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

          return { ...item, productName: product.name, costPrice, profit };
        })
      );

      const totalCost = updatedMatchedItems.reduce(
        (sum, item) => sum + item.costPrice * item.quantity, 0
      );

      const updatedProfitData: ProfitData = {
        ...profitData,
        totalRevenue,
        totalCost,
        grossProfit: totalRevenue - totalCost,
        matchedItems: updatedMatchedItems,
      };

      await prisma.uploadedInvoice.update({
        where: { id },
        data: { profitData: updatedProfitData as unknown as Prisma.InputJsonValue },
      });

      return NextResponse.json({ success: true, profitData: updatedProfitData });
    }

    // No profitData yet — build from scratch using OCR items + auto-matching
    const ocrItems = invoice.ocrData ? (invoice.ocrData as any).items : null;
    if (!Array.isArray(ocrItems) || ocrItems.length === 0) {
      return NextResponse.json(
        { error: "Faturada kalem bilgisi bulunamadı" },
        { status: 400 }
      );
    }

    const products = await prisma.product.findMany({
      where: { clinicId, isActive: true },
      select: { id: true, name: true, purchasePrice: true },
    });

    const matchedItems: ProfitData["matchedItems"] = [];
    const unmatchedItems: ProfitData["unmatchedItems"] = [];

    for (const item of ocrItems) {
      const desc = (item.description || "").toLowerCase().trim();
      const unitPriceKurus = Math.round((item.unitPrice || 0) * 100);
      const quantity = item.quantity || 1;

      let bestMatch: typeof products[number] | null = null;
      let bestScore = 0;

      for (const product of products) {
        const score = calculateSimilarity(desc, product.name.toLowerCase().trim());
        if (score > bestScore && score >= 0.3) {
          bestScore = score;
          bestMatch = product;
        }
      }

      if (bestMatch) {
        const costPrice = bestMatch.purchasePrice;
        matchedItems.push({
          description: item.description || "",
          productId: bestMatch.id,
          productName: bestMatch.name,
          quantity,
          salePrice: unitPriceKurus,
          costPrice,
          profit: (unitPriceKurus - costPrice) * quantity,
        });
      } else {
        unmatchedItems.push({
          description: item.description || "",
          quantity,
          salePrice: unitPriceKurus,
        });
      }
    }

    const totalCost = matchedItems.reduce(
      (sum, item) => sum + item.costPrice * item.quantity, 0
    );

    const newProfitData: ProfitData = {
      totalRevenue,
      totalCost,
      grossProfit: totalRevenue - totalCost,
      matchedItems,
      unmatchedItems,
    };

    await prisma.uploadedInvoice.update({
      where: { id },
      data: { profitData: newProfitData as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({ success: true, profitData: newProfitData });
  } catch (error) {
    console.error("Recalculate profit error:", error);
    return NextResponse.json({ error: "Kâr yeniden hesaplama hatası" }, { status: 500 });
  }
}
