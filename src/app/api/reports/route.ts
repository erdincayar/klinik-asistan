import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TURKISH_MONTHS = [
  "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
  "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik",
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get("type") || "income";
  const period = searchParams.get("period") || "monthly";
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

  try {
    switch (type) {
      case "income":
        return Response.json(await getIncomeReport(clinicId, year));
      case "expense":
        return Response.json(await getExpenseReport(clinicId, year));
      case "profit-loss":
        return Response.json(await getProfitLossReport(clinicId, year));
      case "customer-analytics":
        return Response.json(await getCustomerAnalytics(clinicId, year));
      case "employee-performance":
        return Response.json(await getEmployeePerformance(clinicId, year));
      default:
        return Response.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Reports API] Error:", error);
    return Response.json({ error: "Report generation failed" }, { status: 500 });
  }
}

async function getIncomeReport(clinicId: string, year: number) {
  // Monthly income data (last 12 months from given year)
  const monthlyData = [];
  for (let m = 0; m < 12; m++) {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 1);
    const result = await prisma.treatment.aggregate({
      where: { clinicId, date: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: { id: true },
    });
    monthlyData.push({
      month: m + 1,
      monthName: TURKISH_MONTHS[m],
      income: (result._sum.amount || 0) / 100,
      count: result._count.id || 0,
    });
  }

  // Category breakdown for current year
  const treatments = await prisma.treatment.findMany({
    where: {
      clinicId,
      date: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
    },
    select: { category: true, amount: true },
  });

  const categoryMap: Record<string, number> = {};
  for (const t of treatments) {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  }

  const categoryLabels: Record<string, string> = {
    BOTOX: "Botoks",
    DOLGU: "Dolgu",
    DIS_TEDAVI: "Dis Tedavi",
    GENEL: "Genel",
  };

  const totalIncome = Object.values(categoryMap).reduce((s, v) => s + v, 0);
  const categoryData = Object.entries(categoryMap).map(([key, value]) => ({
    name: categoryLabels[key] || key,
    value: value / 100,
    percentage: totalIncome > 0 ? Math.round((value / totalIncome) * 100) : 0,
  }));

  // Top earning service this month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const thisMonthTreatments = await prisma.treatment.findMany({
    where: { clinicId, date: { gte: thisMonthStart, lt: thisMonthEnd } },
    select: { category: true, amount: true },
  });

  const thisMonthCategories: Record<string, number> = {};
  for (const t of thisMonthTreatments) {
    thisMonthCategories[t.category] = (thisMonthCategories[t.category] || 0) + t.amount;
  }
  const topService = Object.entries(thisMonthCategories).sort((a, b) => b[1] - a[1])[0];

  // Previous month comparison
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthResult = await prisma.treatment.aggregate({
    where: { clinicId, date: { gte: prevMonthStart, lt: prevMonthEnd } },
    _sum: { amount: true },
  });
  const thisMonthResult = await prisma.treatment.aggregate({
    where: { clinicId, date: { gte: thisMonthStart, lt: thisMonthEnd } },
    _sum: { amount: true },
  });
  const prevMonthTotal = (prevMonthResult._sum.amount || 0) / 100;
  const thisMonthTotal = (thisMonthResult._sum.amount || 0) / 100;
  const changePercent = prevMonthTotal > 0
    ? Math.round(((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100)
    : 0;

  return {
    monthlyData,
    categoryData,
    topService: topService
      ? { name: categoryLabels[topService[0]] || topService[0], amount: topService[1] / 100 }
      : null,
    comparison: {
      thisMonth: thisMonthTotal,
      prevMonth: prevMonthTotal,
      changePercent,
    },
    year,
  };
}

async function getExpenseReport(clinicId: string, year: number) {
  // Monthly expense data
  const monthlyData = [];
  for (let m = 0; m < 12; m++) {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 1);
    const result = await prisma.expense.aggregate({
      where: { clinicId, date: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: { id: true },
    });
    monthlyData.push({
      month: m + 1,
      monthName: TURKISH_MONTHS[m],
      expense: (result._sum.amount || 0) / 100,
      count: result._count.id || 0,
    });
  }

  // Category breakdown
  const expenses = await prisma.expense.findMany({
    where: {
      clinicId,
      date: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
    },
    select: { category: true, amount: true },
  });

  const categoryMap: Record<string, number> = {};
  for (const e of expenses) {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  }

  const totalExpense = Object.values(categoryMap).reduce((s, v) => s + v, 0);
  const categoryData = Object.entries(categoryMap).map(([key, value]) => ({
    name: key,
    value: value / 100,
    percentage: totalExpense > 0 ? Math.round((value / totalExpense) * 100) : 0,
  }));

  // Top expense category
  const topExpense = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];

  return {
    monthlyData,
    categoryData,
    topExpense: topExpense
      ? { name: topExpense[0], amount: topExpense[1] / 100 }
      : null,
    year,
  };
}

async function getProfitLossReport(clinicId: string, year: number) {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  const taxRate = clinic?.taxRate || 20;

  const monthlyData = [];
  let yearlyIncome = 0;
  let yearlyExpense = 0;

  for (let m = 0; m < 12; m++) {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 1);
    const [incomeResult, expenseResult] = await Promise.all([
      prisma.treatment.aggregate({
        where: { clinicId, date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { clinicId, date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
    ]);
    const income = (incomeResult._sum.amount || 0) / 100;
    const expense = (expenseResult._sum.amount || 0) / 100;
    const profit = income - expense;
    const kdv = Math.round(income * taxRate / (100 + taxRate) * 100) / 100;

    yearlyIncome += income;
    yearlyExpense += expense;

    monthlyData.push({
      month: m + 1,
      monthName: TURKISH_MONTHS[m],
      income,
      expense,
      profit,
      kdv,
    });
  }

  const yearlyProfit = yearlyIncome - yearlyExpense;
  const yearlyKdv = Math.round(yearlyIncome * taxRate / (100 + taxRate) * 100) / 100;
  const profitMargin = yearlyIncome > 0
    ? Math.round((yearlyProfit / yearlyIncome) * 100)
    : 0;

  return {
    monthlyData,
    summary: {
      totalIncome: yearlyIncome,
      totalExpense: yearlyExpense,
      netProfit: yearlyProfit,
      totalKdv: yearlyKdv,
      profitMargin,
      taxRate,
      estimatedAnnualTax: yearlyKdv,
    },
    year,
  };
}

async function getCustomerAnalytics(clinicId: string, year: number) {
  // Monthly new patients
  const monthlyNewPatients = [];
  for (let m = 0; m < 12; m++) {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 1);
    const count = await prisma.patient.count({
      where: { clinicId, createdAt: { gte: start, lt: end } },
    });
    monthlyNewPatients.push({
      month: m + 1,
      monthName: TURKISH_MONTHS[m],
      count,
    });
  }

  // Top patients by revenue (top 10)
  const treatments = await prisma.treatment.findMany({
    where: {
      clinicId,
      date: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
    },
    include: { patient: { select: { id: true, name: true, phone: true } } },
  });

  const patientRevenue: Record<string, { name: string; phone: string | null; total: number; count: number }> = {};
  for (const t of treatments) {
    if (!patientRevenue[t.patientId]) {
      patientRevenue[t.patientId] = { name: t.patient.name, phone: t.patient.phone, total: 0, count: 0 };
    }
    patientRevenue[t.patientId].total += t.amount;
    patientRevenue[t.patientId].count += 1;
  }

  const topPatients = Object.entries(patientRevenue)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([id, data]) => ({
      id,
      name: data.name,
      phone: data.phone,
      totalRevenue: data.total / 100,
      visitCount: data.count,
    }));

  // Average revenue per patient
  const totalPatients = await prisma.patient.count({ where: { clinicId } });
  const totalRevenue = treatments.reduce((s, t) => s + t.amount, 0) / 100;
  const avgRevenuePerPatient = totalPatients > 0 ? Math.round(totalRevenue / totalPatients) : 0;

  // Loyalty rate (patients with 2+ visits / total patients)
  const patientsWithMultipleVisits = Object.values(patientRevenue).filter(p => p.count >= 2).length;
  const uniquePatients = Object.keys(patientRevenue).length;
  const loyaltyRate = uniquePatients > 0
    ? Math.round((patientsWithMultipleVisits / uniquePatients) * 100)
    : 0;

  return {
    monthlyNewPatients,
    topPatients,
    avgRevenuePerPatient,
    loyaltyRate,
    totalPatients,
    year,
  };
}

async function getEmployeePerformance(clinicId: string, year: number) {
  const employees = await prisma.employee.findMany({
    where: { clinicId, isActive: true },
  });

  const employeeData = [];
  for (const emp of employees) {
    const treatments = await prisma.treatment.findMany({
      where: {
        clinicId,
        employeeId: emp.id,
        date: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
      },
      select: { amount: true, date: true },
    });

    const totalRevenue = treatments.reduce((s, t) => s + t.amount, 0) / 100;
    const commission = Math.round(totalRevenue * emp.commissionRate / 100);

    // Monthly breakdown
    const monthlyRevenue = Array(12).fill(0);
    for (const t of treatments) {
      const m = t.date.getMonth();
      monthlyRevenue[m] += t.amount / 100;
    }

    employeeData.push({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      commissionRate: emp.commissionRate,
      totalRevenue,
      commission,
      treatmentCount: treatments.length,
      monthlyRevenue: monthlyRevenue.map((rev, i) => ({
        month: i + 1,
        monthName: TURKISH_MONTHS[i],
        revenue: rev,
        commission: Math.round(rev * emp.commissionRate / 100),
      })),
    });
  }

  return {
    employees: employeeData,
    year,
  };
}
