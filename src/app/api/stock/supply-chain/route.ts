import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ProductAnalysis {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  supplier: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  leadTimeDays: number | null;
  reorderPoint: number | null;
  reorderQty: number | null;
  autoReorder: boolean;
  purchasePrice: number;
  // Hesaplanan alanlar
  avgDailyConsumption: number;  // Ortalama günlük tüketim
  daysOfSupply: number;         // Kaç gün yetecek
  reorderDate: string | null;   // Sipariş verilmesi gereken tarih
  stockOutDate: string | null;  // Stok bitme tahmini
  urgency: "critical" | "warning" | "safe" | "overstocked";
  monthlyConsumption: number[];  // Son 6 ay tüketim
  peakMonth: string | null;     // En çok tüketilen ay
}

interface SupplierGroup {
  supplier: string;
  products: ProductAnalysis[];
  totalOrderValue: number;
  urgentCount: number;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    // Tüm aktif ürünleri ve son 6 aylık hareketlerini çek
    const products = await prisma.product.findMany({
      where: { clinicId, isActive: true },
      include: {
        movements: {
          where: { date: { gte: sixMonthsAgo } },
          orderBy: { date: "asc" },
          select: { type: true, quantity: true, date: true, totalPrice: true },
        },
      },
    });

    const analyses: ProductAnalysis[] = [];

    for (const product of products) {
      // Stok takibi kapalı ürünleri atla
      if (!product.trackStock) continue;

      const stock = product.currentStock ?? 0;

      // Son 6 aylık OUT hareketlerinden tüketim analizi
      const outMovements = product.movements.filter((m) => m.type === "OUT");
      const totalOut = outMovements.reduce((s, m) => s + m.quantity, 0);

      // Tüketim günü hesabı — ilk OUT hareketi ile şimdi arası
      const firstOut = outMovements[0]?.date;
      const daysSinceFirstOut = firstOut
        ? Math.max(1, Math.ceil((now.getTime() - new Date(firstOut).getTime()) / (24 * 60 * 60 * 1000)))
        : 180;

      const avgDailyConsumption = totalOut > 0 ? totalOut / daysSinceFirstOut : 0;

      // Kaç gün yetecek
      const daysOfSupply = avgDailyConsumption > 0 ? Math.floor(stock / avgDailyConsumption) : stock > 0 ? 999 : 0;

      // Stok bitme tahmini
      const stockOutDate = avgDailyConsumption > 0 && stock > 0
        ? new Date(now.getTime() + daysOfSupply * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Lead time'a göre sipariş tarihi
      const leadDays = product.leadTimeDays || 7; // Varsayılan 7 gün
      const reorderDaysBeforeStockout = daysOfSupply - leadDays;
      const reorderDate = avgDailyConsumption > 0 && reorderDaysBeforeStockout > 0
        ? new Date(now.getTime() + reorderDaysBeforeStockout * 24 * 60 * 60 * 1000).toISOString()
        : avgDailyConsumption > 0 ? now.toISOString() : null; // Eğer zaten geç kaldıysa bugün

      // Aylık tüketim (son 6 ay)
      const monthlyConsumption: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthOut = outMovements
          .filter((m) => new Date(m.date) >= mStart && new Date(m.date) < mEnd)
          .reduce((s, m) => s + m.quantity, 0);
        monthlyConsumption.push(monthOut);
      }

      // En yoğun ay
      const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
      const maxConsumptionIdx = monthlyConsumption.indexOf(Math.max(...monthlyConsumption));
      const peakMonthDate = new Date(now.getFullYear(), now.getMonth() - 5 + maxConsumptionIdx, 1);
      const peakMonth = monthlyConsumption[maxConsumptionIdx] > 0 ? monthNames[peakMonthDate.getMonth()] : null;

      // Aciliyet
      let urgency: ProductAnalysis["urgency"] = "safe";
      if (avgDailyConsumption === 0 && stock === 0) {
        // Henüz hiç stok hareketi yok — yeni ürün, kritik değil
        urgency = "safe";
      } else if (stock === 0 && avgDailyConsumption > 0) {
        urgency = "critical";
      } else if (daysOfSupply <= leadDays) {
        urgency = "critical";
      } else if (daysOfSupply <= leadDays * 2) {
        urgency = "warning";
      } else if (avgDailyConsumption > 0 && daysOfSupply > 180) {
        urgency = "overstocked";
      }

      analyses.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        brand: product.brand,
        supplier: product.supplier,
        unit: product.unit,
        currentStock: stock,
        minStock: product.minStock,
        leadTimeDays: product.leadTimeDays,
        reorderPoint: product.reorderPoint,
        reorderQty: product.reorderQty,
        autoReorder: product.autoReorder,
        purchasePrice: product.purchasePrice,
        avgDailyConsumption: Math.round(avgDailyConsumption * 100) / 100,
        daysOfSupply,
        reorderDate,
        stockOutDate,
        urgency,
        monthlyConsumption,
        peakMonth,
      });
    }

    // Tedarikçiye göre gruplama (autoReorder aktifse VEYA kritik/uyarıdaysa)
    const supplierMap: Record<string, SupplierGroup> = {};
    for (const a of analyses) {
      if (!a.autoReorder && a.urgency === "safe") continue;
      const key = a.supplier || a.brand || "Belirtilmemiş";
      if (!supplierMap[key]) {
        supplierMap[key] = { supplier: key, products: [], totalOrderValue: 0, urgentCount: 0 };
      }
      supplierMap[key].products.push(a);
      if (a.urgency === "critical" || a.urgency === "warning") {
        supplierMap[key].urgentCount += 1;
        const qty = a.reorderQty || Math.max(1, Math.ceil(a.avgDailyConsumption * 30)); // 1 aylık sipariş
        supplierMap[key].totalOrderValue += qty * a.purchasePrice;
      }
    }

    const supplierGroups = Object.values(supplierMap)
      .filter((g) => g.products.length > 0)
      .sort((a, b) => b.urgentCount - a.urgentCount);

    // Özet istatistikler
    const criticalCount = analyses.filter((a) => a.urgency === "critical").length;
    const warningCount = analyses.filter((a) => a.urgency === "warning").length;
    const overstockedCount = analyses.filter((a) => a.urgency === "overstocked").length;
    const needsReorderCount = analyses.filter((a) =>
      a.urgency === "critical" || a.urgency === "warning"
    ).length;

    return NextResponse.json({
      products: analyses.sort((a, b) => a.daysOfSupply - b.daysOfSupply),
      supplierGroups,
      summary: {
        total: analyses.length,
        critical: criticalCount,
        warning: warningCount,
        safe: analyses.length - criticalCount - warningCount - overstockedCount,
        overstocked: overstockedCount,
        needsReorder: needsReorderCount,
      },
    });
  } catch (error) {
    console.error("Supply chain analysis error:", error);
    return NextResponse.json({ error: "Analiz yapılamadı" }, { status: 500 });
  }
}
