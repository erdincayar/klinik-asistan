import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getExchangeRates, convertToTRYKurus } from "@/lib/exchange-rate";

interface BulkProduct {
  name: string;
  sku?: string;
  brand?: string | null;
  category: string;
  unit?: string;
  currentStock?: number;
  minStock?: number;
  purchasePrice: number; // kuruş
  salePrice: number; // kuruş
  currency: string;
  vatIncluded?: boolean;
}

function generateSku(name: string): string {
  const prefix = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) || "PRD";
  return `${prefix}-${Date.now().toString(36).slice(-3).toUpperCase()}${Math.floor(Math.random() * 100)}`;
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

    const { products } = (await request.json()) as { products: BulkProduct[] };
    if (!products?.length) {
      return Response.json({ error: "Ürün listesi boş" }, { status: 400 });
    }

    // Fetch exchange rates ONCE for all products
    const rates = await getExchangeRates();

    let ok = 0;
    let fail = 0;
    const errors: { name: string; reason: string }[] = [];

    for (const item of products) {
      try {
        if (!item.name?.trim()) {
          fail++;
          errors.push({ name: item.name || "?", reason: "Ürün adı boş" });
          continue;
        }

        const sku = item.sku || generateSku(item.name);
        const currency = item.currency || "TRY";

        // Check name+unit uniqueness
        const existing = await prisma.product.findFirst({
          where: {
            clinicId,
            name: { equals: item.name.trim(), mode: "insensitive" },
            unit: item.unit || "ADET",
          },
        });
        if (existing) {
          fail++;
          errors.push({ name: item.name, reason: "Bu isimde ürün zaten mevcut" });
          continue;
        }

        // Currency conversion
        let purchasePrice = item.purchasePrice;
        let purchasePriceUSD: number | null = null;

        if (currency !== "TRY" && purchasePrice > 0) {
          const fxAmount = purchasePrice / 100; // kuruştan birime
          purchasePriceUSD = fxAmount;
          purchasePrice = convertToTRYKurus(fxAmount, currency, rates);
        }

        await prisma.product.create({
          data: {
            name: item.name.trim(),
            sku,
            brand: item.brand || null,
            category: item.category || "DIGER",
            unit: item.unit || "ADET",
            currentStock: item.currentStock ?? 0,
            minStock: item.minStock ?? 0,
            purchasePrice,
            purchasePriceUSD,
            currency,
            salePrice: item.salePrice || 0,
            vatIncluded: item.vatIncluded ?? true,
            clinicId,
          } as any,
        });
        ok++;
      } catch (err) {
        fail++;
        errors.push({ name: item.name || "?", reason: "Kayıt hatası" });
      }
    }

    return Response.json({ ok, fail, errors });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
