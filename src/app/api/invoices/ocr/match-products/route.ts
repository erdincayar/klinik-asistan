import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Top N candidates we expose to the UI for manual disambiguation.
const MAX_CANDIDATES = 5;
// If top-1 and top-2 scores are within this delta, we flag the row
// as ambiguous — the UI then forces the user to pick, rather than
// silently auto-selecting the "first" match (which was random when
// two same-name products in different sizes existed).
const AMBIGUITY_DELTA = 0.15;

interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  currentStock: number | null;
  purchasePrice: number;
  vatIncluded: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Kalem listesi gerekli" }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { clinicId, isActive: true },
      select: {
        id: true, name: true, sku: true, unit: true,
        currentStock: true, purchasePrice: true, vatIncluded: true,
      },
    });

    const matches = items.map((item: { description: string; quantity?: number; unitPrice?: number; total?: number }) => {
      const desc = (item.description || "").toLowerCase().trim();

      // Score every product and keep the top N
      const scored: Array<{ product: ProductRow; score: number }> = [];
      for (const p of products) {
        const score = calculateSimilarity(desc, p.name.toLowerCase().trim());
        if (score >= 0.3) scored.push({ product: p, score });
      }
      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, MAX_CANDIDATES);

      const best = top[0] ?? null;
      const second = top[1] ?? null;

      // Ambiguous when top-2 scores are close enough AND they come from
      // different products. Typical trigger: "Keenwell Peel Off Maske"
      // appearing as both 500ml and 250ml entries in inventory.
      const ambiguous =
        !!(best && second && Math.abs(best.score - second.score) <= AMBIGUITY_DELTA);

      return {
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        total: item.total || 0,
        ambiguous,
        // Backward compat: `matchedProduct` remains for older UI paths.
        // When ambiguous we null it so the UI forces manual selection.
        matchedProduct:
          best && !ambiguous
            ? {
                id: best.product.id,
                name: best.product.name,
                sku: best.product.sku,
                unit: best.product.unit,
                currentStock: best.product.currentStock,
                purchasePrice: best.product.purchasePrice,
                vatIncluded: best.product.vatIncluded,
                score: best.score,
              }
            : null,
        candidates: top.map((c) => ({
          id: c.product.id,
          name: c.product.name,
          sku: c.product.sku,
          unit: c.product.unit,
          currentStock: c.product.currentStock,
          purchasePrice: c.product.purchasePrice,
          vatIncluded: c.product.vatIncluded,
          score: c.score,
        })),
      };
    });

    return NextResponse.json({ matches, products });
  } catch (error) {
    console.error("Match products error:", error);
    return NextResponse.json({ error: "Eşleştirme hatası" }, { status: 500 });
  }
}

function calculateSimilarity(a: string, b: string): number {
  if (a.includes(b) || b.includes(a)) return 0.9;

  const wordsA = a.split(/\s+/).filter((w) => w.length > 2);
  const wordsB = b.split(/\s+/).filter((w) => w.length > 2);
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
