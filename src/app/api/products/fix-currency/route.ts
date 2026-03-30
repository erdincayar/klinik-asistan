import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getExchangeRates, convertToTRYKurus } from "@/lib/exchange-rate";

// POST: Fix products that have foreign currency but purchasePrice not converted to TRY
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    // Find products with foreign currency where purchasePriceUSD is null
    const products = await prisma.product.findMany({
      where: {
        clinicId,
        currency: { not: "TRY" },
        purchasePriceUSD: null,
        purchasePrice: { gt: 0 },
      },
    });

    if (products.length === 0) {
      return Response.json({ message: "Düzeltilecek ürün yok", fixed: 0 });
    }

    const rates = await getExchangeRates();
    let fixed = 0;

    for (const product of products) {
      // purchasePrice is stored as kuruş but it's actually foreign currency amount * 100
      const fxAmount = product.purchasePrice / 100;
      const tryKurus = convertToTRYKurus(fxAmount, product.currency, rates);

      await prisma.product.update({
        where: { id: product.id },
        data: {
          purchasePriceUSD: fxAmount,
          purchasePrice: tryKurus,
        },
      });
      fixed++;
    }

    return Response.json({
      message: `${fixed} ürün düzeltildi`,
      fixed,
      rate: rates.TRY ? `1 USD = ${rates.TRY} TRY` : "Kur bilgisi yok",
    });
  } catch (err) {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
