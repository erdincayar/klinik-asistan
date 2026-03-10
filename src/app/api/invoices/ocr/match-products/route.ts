import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Kalem listesi gerekli" }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { clinicId, isActive: true },
      select: { id: true, name: true, sku: true, unit: true, currentStock: true, purchasePrice: true },
    });

    const matches = items.map((item: { description: string; quantity?: number; unitPrice?: number; total?: number }) => {
      const desc = item.description.toLowerCase().trim();
      let bestMatch: typeof products[number] | null = null;
      let bestScore = 0;

      for (const product of products) {
        const productName = product.name.toLowerCase().trim();
        const score = calculateSimilarity(desc, productName);
        if (score > bestScore && score >= 0.3) {
          bestScore = score;
          bestMatch = product;
        }
      }

      return {
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        total: item.total || 0,
        matchedProduct: bestMatch
          ? { id: bestMatch.id, name: bestMatch.name, sku: bestMatch.sku, unit: bestMatch.unit, currentStock: bestMatch.currentStock, purchasePrice: bestMatch.purchasePrice, score: bestScore }
          : null,
      };
    });

    return NextResponse.json({ matches, products });
  } catch (error) {
    console.error("Match products error:", error);
    return NextResponse.json({ error: "Eşleştirme hatası" }, { status: 500 });
  }
}

function calculateSimilarity(a: string, b: string): number {
  // Check exact containment first
  if (a.includes(b) || b.includes(a)) return 0.9;

  // Word-level overlap
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
