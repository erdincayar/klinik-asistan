import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const now = new Date();
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()));

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { taxRate: true },
    });
    const taxRate = clinic?.taxRate ?? 20;

    if (type === "income-statement") {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      const [treatments, expenses] = await Promise.all([
        prisma.treatment.findMany({
          where: { clinicId, date: { gte: startDate, lt: endDate } },
          select: { amount: true },
        }),
        prisma.expense.findMany({
          where: { clinicId, date: { gte: startDate, lt: endDate } },
          select: { amount: true },
        }),
      ]);

      const totalRevenue = treatments.reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = totalRevenue - totalExpenses;
      const vatAmount = Math.round(totalRevenue * taxRate / (100 + taxRate));

      return Response.json({ totalRevenue, totalExpenses, netProfit, vatAmount, taxRate });
    }

    if (type === "vat-summary") {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      const treatments = await prisma.treatment.findMany({
        where: { clinicId, date: { gte: startDate, lt: endDate } },
        select: { amount: true },
      });

      const totalWithVat = treatments.reduce((sum, t) => sum + t.amount, 0);
      const vatAmount = Math.round(totalWithVat * taxRate / (100 + taxRate));
      const totalWithoutVat = totalWithVat - vatAmount;

      return Response.json({ totalWithVat, vatAmount, totalWithoutVat, taxRate });
    }

    if (type === "monthly-summary") {
      const months = Array.from({ length: 12 }, (_, i) => {
        const startDate = new Date(year, i, 1);
        const endDate = new Date(year, i + 1, 1);
        return { month: i + 1, startDate, endDate };
      });

      const results = await Promise.all(
        months.map(async ({ month, startDate, endDate }) => {
          const [treatments, expenses] = await Promise.all([
            prisma.treatment.findMany({
              where: { clinicId, date: { gte: startDate, lt: endDate } },
              select: { amount: true },
            }),
            prisma.expense.findMany({
              where: { clinicId, date: { gte: startDate, lt: endDate } },
              select: { amount: true },
            }),
          ]);

          const revenue = treatments.reduce((sum, t) => sum + t.amount, 0);
          const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

          return {
            month,
            revenue,
            expenses: expenseTotal,
            profit: revenue - expenseTotal,
          };
        })
      );

      return Response.json(results);
    }

    return Response.json({ error: "Geçersiz tip parametresi" }, { status: 400 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
