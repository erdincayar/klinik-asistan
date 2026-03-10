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

    // Get treatments (income source 1)
    const treatments = await prisma.treatment.findMany({
      where: { clinicId, date: dateFilter },
      select: { amount: true, date: true },
    });

    // Get income records from expense table (type: INCOME)
    const incomeRecords = await prisma.expense.findMany({
      where: { clinicId, type: "INCOME", date: dateFilter },
      select: { amount: true, date: true },
    });

    // Get actual expenses (type: EXPENSE)
    const expenses = await prisma.expense.findMany({
      where: { clinicId, type: "EXPENSE", date: dateFilter },
      select: { amount: true, date: true, category: true },
    });

    // Get stock OUT movements for COGS calculation
    const outMovements = await prisma.stockMovement.findMany({
      where: { clinicId, type: "OUT", date: dateFilter },
      include: { product: { select: { purchasePrice: true } } },
    });

    // Get approved income invoices for profit + unmatched item warnings
    const approvedIncomeInvoices = await prisma.uploadedInvoice.findMany({
      where: { clinicId, approved: true, invoiceType: "INCOME", invoiceDate: dateFilter },
      select: { id: true, profitData: true },
    });

    // Aggregate by month
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
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
      return {
        month,
        monthName: [
          "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
          "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
        ][i],
        income: monthIncome,
        expense: monthExpense,
        profit: monthIncome - monthExpense,
      };
    });

    // Expense categories (only actual expenses)
    const categoryMap: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });

    const totalIncome = treatments.reduce((sum, t) => sum + t.amount, 0)
      + incomeRecords.reduce((sum, r) => sum + r.amount, 0);
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    // COGS: non-invoice stock movements + invoice profitData costs
    const nonInvoiceCogs = outMovements
      .filter(m => !m.reference?.startsWith("invoice-"))
      .reduce((sum, m) => sum + (m.quantity * (m.product.purchasePrice ?? 0)), 0);

    let invoiceCogs = 0;
    for (const inv of approvedIncomeInvoices) {
      const pd = inv.profitData as any;
      if (pd?.totalCost) {
        invoiceCogs += pd.totalCost;
      } else {
        // Fallback: use invoice-related stock movements
        const movementCogs = outMovements
          .filter(m => m.reference === `invoice-${inv.id}`)
          .reduce((sum, m) => sum + (m.quantity * (m.product.purchasePrice ?? 0)), 0);
        invoiceCogs += movementCogs;
      }
    }

    const totalCogs = nonInvoiceCogs + invoiceCogs;
    const grossProfit = totalIncome - totalCogs;
    const netProfit = grossProfit - totalExpense;

    // Count unmatched items across all approved income invoices
    let unmatchedItemCount = 0;
    for (const inv of approvedIncomeInvoices) {
      const pd = inv.profitData as any;
      if (pd?.unmatchedItems?.length) {
        unmatchedItemCount += pd.unmatchedItems.length;
      }
    }

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
    });
  } catch (error) {
    console.error("Financial report error:", error);
    return NextResponse.json({ error: "Rapor oluşturulamadı" }, { status: 500 });
  }
}
