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

    // Get monthly income (treatments)
    const treatments = await prisma.treatment.findMany({
      where: {
        clinicId,
        date: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
      select: { amount: true, date: true },
    });

    // Get monthly expenses
    const expenses = await prisma.expense.findMany({
      where: {
        clinicId,
        date: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
      select: { amount: true, date: true, category: true },
    });

    // Aggregate by month
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthIncome = treatments
        .filter((t) => new Date(t.date).getMonth() === i)
        .reduce((sum, t) => sum + t.amount, 0);
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

    // Expense categories
    const categoryMap: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });

    const totalIncome = treatments.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({
      year,
      monthlyData,
      totalIncome,
      totalExpense,
      totalProfit: totalIncome - totalExpense,
      expenseCategories: categoryMap,
    });
  } catch (error) {
    console.error("Financial report error:", error);
    return NextResponse.json({ error: "Rapor oluşturulamadı" }, { status: 500 });
  }
}
