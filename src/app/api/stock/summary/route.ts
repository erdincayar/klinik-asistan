import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    // Use count() for efficient DB-level counting
    const [totalProducts, activeCount] = await Promise.all([
      prisma.product.count({ where: { clinicId } }),
      prisma.product.count({ where: { clinicId, isActive: true } }),
    ]);

    // Active products needed for value calculations and low stock filter
    const activeProducts = await prisma.product.findMany({
      where: { clinicId, isActive: true },
    });

    // Low stock count (only products with orderAlert enabled and non-null stock)
    const lowStockCount = activeProducts.filter(
      (p) => p.orderAlert && p.currentStock !== null && p.currentStock <= p.minStock
    ).length;

    // Tracked vs untracked counts
    const trackedCount = activeProducts.filter((p) => p.currentStock !== null).length;
    const untrackedCount = activeCount - trackedCount;

    // Total stock value (skip null stock products)
    const totalStockValue = {
      purchase: activeProducts.reduce(
        (sum, p) => sum + (p.currentStock ?? 0) * p.purchasePrice,
        0
      ),
      sale: activeProducts.reduce(
        (sum, p) => sum + (p.currentStock ?? 0) * p.salePrice,
        0
      ),
    };

    // Category distribution
    const categoryMap = new Map<string, { count: number; value: number }>();
    for (const p of activeProducts) {
      const existing = categoryMap.get(p.category) || { count: 0, value: 0 };
      existing.count += 1;
      existing.value += (p.currentStock ?? 0) * p.salePrice;
      categoryMap.set(p.category, existing);
    }
    const categoryDistribution = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        count: data.count,
        value: data.value,
      })
    );

    // Recent movements (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMovementsList = await prisma.stockMovement.findMany({
      where: {
        clinicId,
        date: { gte: thirtyDaysAgo },
      },
    });

    const recentMovements = {
      in: recentMovementsList.filter((m) => m.type === "IN").length,
      out: recentMovementsList.filter((m) => m.type === "OUT").length,
    };

    // Top consumed (top 5 by OUT quantity in last 30 days)
    const outMovements = recentMovementsList.filter((m) => m.type === "OUT");
    const consumedMap = new Map<string, number>();
    for (const m of outMovements) {
      consumedMap.set(
        m.productId,
        (consumedMap.get(m.productId) || 0) + m.quantity
      );
    }

    const sortedConsumed = Array.from(consumedMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topConsumed = sortedConsumed.map(([productId, totalOut]) => {
      const product = activeProducts.find((p) => p.id === productId);
      return {
        productId,
        name: product?.name || "",
        totalOut,
      };
    });

    return Response.json({
      totalProducts,
      activeProducts: activeCount,
      lowStockCount,
      trackedCount,
      untrackedCount,
      totalStockValue,
      categoryDistribution,
      recentMovements,
      topConsumed,
    });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
