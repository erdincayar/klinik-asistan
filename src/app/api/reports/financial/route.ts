import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    const dateFilter = {
      gte: new Date(`${year}-01-01`),
      lt: new Date(`${year + 1}-01-01`),
    };

    const [treatments, incomeRecords, expenses, outMovements, approvedIncomeInvoices] = await Promise.all([
      prisma.treatment.findMany({
        where: { clinicId, date: dateFilter },
        select: { amount: true, date: true, patient: { select: { name: true } }, category: true },
      }),
      prisma.expense.findMany({
        where: { clinicId, type: "INCOME", date: dateFilter },
        select: { id: true, amount: true, date: true, description: true },
      }),
      prisma.expense.findMany({
        where: { clinicId, type: "EXPENSE", date: dateFilter },
        select: { amount: true, date: true, category: true },
      }),
      prisma.stockMovement.findMany({
        where: { clinicId, type: "OUT", date: dateFilter },
        include: { product: { select: { name: true, brand: true, purchasePrice: true } } },
      }),
      prisma.uploadedInvoice.findMany({
        where: { clinicId, approved: true, invoiceType: "INCOME", invoiceDate: dateFilter },
        select: { id: true, profitData: true, invoiceDate: true },
      }),
    ]);

    // Pre-compute orphan reference sets for COGS filtering
    const treatmentRefs = outMovements
      .filter(m => m.reference?.startsWith("treatment-"))
      .map(m => m.reference!.replace("treatment-", ""));
    const expenseIncomeRefs = outMovements
      .filter(m => m.reference?.startsWith("expense-income-"))
      .map(m => m.reference!.replace("expense-income-", ""));

    const [existingTreatmentIds, existingExpenseIds] = await Promise.all([
      treatmentRefs.length > 0
        ? prisma.treatment.findMany({ where: { id: { in: treatmentRefs }, clinicId }, select: { id: true } })
        : Promise.resolve([]),
      expenseIncomeRefs.length > 0
        ? prisma.expense.findMany({ where: { id: { in: expenseIncomeRefs }, clinicId }, select: { id: true } })
        : Promise.resolve([]),
    ]);
    const validTreatmentSet = new Set(existingTreatmentIds.map(t => t.id));
    const validExpenseSet = new Set(existingExpenseIds.map(e => e.id));

    // Pre-compute income records that have stock movements (to avoid double-counting)
    const incomeIdsWithStockMovements = new Set(
      outMovements
        .filter(m => m.reference?.startsWith("expense-income-"))
        .map(m => m.reference!.replace("expense-income-", ""))
    );

    // Monthly aggregation with COGS
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const treatmentIncome = treatments
        .filter((t) => new Date(t.date).getMonth() === i)
        .reduce((sum, t) => sum + t.amount, 0);
      const otherIncome = incomeRecords
        .filter((r) => new Date(r.date).getMonth() === i)
        .reduce((sum, r) => sum + r.amount, 0);
      const monthIncome = treatmentIncome + otherIncome;
      const monthExpense = expenses
        .filter((e) => new Date(e.date).getMonth() === i)
        .reduce((sum, e) => sum + e.amount, 0);

      // Monthly COGS — same logic as yearly totals
      // 1. Non-invoice stock movements (exclude orphans, exclude invoice-*)
      const monthNonInvoiceCogs = outMovements
        .filter(m => new Date(m.date).getMonth() === i)
        .filter(m => {
          if (!m.reference) return true;
          if (m.reference.startsWith("invoice-")) return false; // handled via profitData
          if (m.reference.startsWith("treatment-")) return validTreatmentSet.has(m.reference.replace("treatment-", ""));
          if (m.reference.startsWith("expense-income-")) return validExpenseSet.has(m.reference.replace("expense-income-", ""));
          if (m.reference.startsWith("expense-")) return validExpenseSet.has(m.reference.replace("expense-", ""));
          return true;
        })
        .reduce((sum, m) => sum + (m.quantity * (m.product.purchasePrice ?? 0)), 0);

      // 2. Invoice COGS from profitData (same as yearly)
      let monthInvoiceCogs = 0;
      for (const inv of approvedIncomeInvoices) {
        const invDate = inv.invoiceDate ? new Date(inv.invoiceDate) : null;
        if (!invDate || invDate.getMonth() !== i) continue;
        const pd = inv.profitData as any;
        if (pd && typeof pd.totalCost === "number") {
          monthInvoiceCogs += pd.totalCost;
        } else {
          // Fallback
          monthInvoiceCogs += outMovements
            .filter(m => m.reference === `invoice-${inv.id}` && new Date(m.date).getMonth() === i)
            .reduce((sum, m) => sum + (m.quantity * (m.product.purchasePrice ?? 0)), 0);
        }
      }

      // 3. Embedded cost only from records WITHOUT stock movements
      const monthEmbeddedCost = incomeRecords
        .filter(r => new Date(r.date).getMonth() === i)
        .filter(r => !incomeIdsWithStockMovements.has(r.id))
        .reduce((sum, r) => {
          const match = r.description?.match(/\[Maliyet: (\d+)\]/);
          return sum + (match ? parseInt(match[1], 10) : 0);
        }, 0);

      const monthTotalCogs = monthNonInvoiceCogs + monthInvoiceCogs + monthEmbeddedCost;

      return {
        month: i + 1,
        monthName: monthNames[i],
        income: monthIncome,
        expense: monthExpense,
        cogs: monthTotalCogs,
        profit: monthIncome - monthExpense,
      };
    });

    // Expense categories
    const categoryMap: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });

    const totalIncome = treatments.reduce((sum, t) => sum + t.amount, 0)
      + incomeRecords.reduce((sum, r) => sum + r.amount, 0);
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Extract embedded cost ONLY from income records without stock movements (avoid double-counting)
    let embeddedCost = 0;
    for (const r of incomeRecords) {
      if (incomeIdsWithStockMovements.has(r.id)) continue;
      const costMatch = (r as any).description?.match(/\[Maliyet: (\d+)\]/);
      if (costMatch) embeddedCost += parseInt(costMatch[1], 10);
    }

    // Total COGS — uses pre-computed validTreatmentSet/validExpenseSet from above
    const nonInvoiceCogs = outMovements
      .filter(m => {
        if (!m.reference) return true;
        if (m.reference.startsWith("invoice-")) return false;
        if (m.reference.startsWith("treatment-")) return validTreatmentSet.has(m.reference.replace("treatment-", ""));
        if (m.reference.startsWith("expense-income-")) return validExpenseSet.has(m.reference.replace("expense-income-", ""));
        return true;
      })
      .reduce((sum, m) => sum + (m.quantity * (m.product.purchasePrice ?? 0)), 0);

    let invoiceCogs = 0;
    for (const inv of approvedIncomeInvoices) {
      const pd = inv.profitData as any;
      if (pd && typeof pd.totalCost === "number") {
        invoiceCogs += pd.totalCost;
      } else {
        const movementCogs = outMovements
          .filter(m => m.reference === `invoice-${inv.id}`)
          .reduce((sum, m) => sum + (m.quantity * (m.product.purchasePrice ?? 0)), 0);
        invoiceCogs += movementCogs;
      }
    }

    const totalCogs = nonInvoiceCogs + invoiceCogs + embeddedCost;
    const grossProfit = totalIncome - totalCogs;
    const netProfit = grossProfit - totalExpense;

    let unmatchedItemCount = 0;
    for (const inv of approvedIncomeInvoices) {
      const pd = inv.profitData as any;
      if (pd?.unmatchedItems?.length) unmatchedItemCount += pd.unmatchedItems.length;
    }

    // Top customers by revenue
    const customerMap: Record<string, { amount: number; count: number }> = {};
    treatments.forEach((t) => {
      const name = t.patient?.name || "Bilinmeyen";
      if (!customerMap[name]) customerMap[name] = { amount: 0, count: 0 };
      customerMap[name].amount += t.amount;
      customerMap[name].count += 1;
    });
    const topCustomers = Object.entries(customerMap)
      .map(([name, data]) => ({ name, amount: data.amount, count: data.count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Top products by sales volume — exclude orphaned movements
    const productMap: Record<string, { name: string; revenue: number; quantity: number; brand: string | null }> = {};
    outMovements
      .filter(m => m.type === "OUT")
      .filter(m => {
        if (!m.reference) return true;
        if (m.reference.startsWith("treatment-")) return validTreatmentSet.has(m.reference.replace("treatment-", ""));
        if (m.reference.startsWith("expense-income-")) return validExpenseSet.has(m.reference.replace("expense-income-", ""));
        if (m.reference.startsWith("expense-")) {
          const eid = m.reference.replace("expense-", "");
          return validExpenseSet.has(eid);
        }
        if (m.reference.startsWith("invoice-")) {
          // Check if invoice still exists
          return approvedIncomeInvoices.some(inv => inv.id === m.reference!.replace("invoice-", ""));
        }
        return true;
      })
      .forEach((m) => {
        const key = m.productId;
        if (!productMap[key]) {
          productMap[key] = { name: m.product.name, revenue: 0, quantity: 0, brand: m.product.brand ?? null };
        }
        productMap[key].revenue += m.totalPrice;
        productMap[key].quantity += m.quantity;
      });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

    return NextResponse.json({
      year,
      monthlyData,
      totalIncome,
      totalExpense,
      totalProfit: netProfit,
      totalCogs,
      grossProfit,
      unmatchedItemCount,
      expenseCategories: categoryMap,
      topCustomers,
      topProducts,
    });
  } catch (error) {
    console.error("Financial report error:", error);
    return NextResponse.json({ error: "Rapor oluşturulamadı" }, { status: 500 });
  }
}
