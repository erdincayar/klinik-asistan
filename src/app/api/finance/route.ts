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
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 1));

      const [rawTreatments, rawExpenses] = await Promise.all([
        prisma.treatment.findMany({
          where: { clinicId, date: { gte: startDate, lt: endDate } },
          include: { patient: { select: { id: true, name: true } } },
          orderBy: { date: "desc" },
        }),
        prisma.expense.findMany({
          where: { clinicId, date: { gte: startDate, lt: endDate } },
          orderBy: { date: "desc" },
        }),
      ]);

      const totalIncome = rawTreatments.reduce((sum, t) => sum + (t.amount ?? 0), 0);
      const totalExpense = rawExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
      const netProfit = totalIncome - totalExpense;
      const vatAmount = Math.round(totalIncome * taxRate / (100 + taxRate));

      const treatments = rawTreatments.map((t) => ({
        id: t.id,
        date: t.date,
        patientId: t.patient.id,
        patientName: t.patient.name,
        treatmentType: t.category,
        amount: t.amount,
      }));

      const expenses = rawExpenses.map((e) => ({
        id: e.id,
        date: e.date,
        description: e.description,
        category: e.category,
        amount: e.amount,
      }));

      return Response.json({ totalIncome, totalExpense, netProfit, vatAmount, taxRate, treatments, expenses });
    }

    if (type === "vat-summary") {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 1));

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
      const monthNames = [
        "Oca", "Şub", "Mar", "Nis", "May", "Haz",
        "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
      ];

      const monthRanges = Array.from({ length: 12 }, (_, i) => {
        const startDate = new Date(Date.UTC(year, i, 1));
        const endDate = new Date(Date.UTC(year, i + 1, 1));
        return { month: i + 1, monthName: monthNames[i], startDate, endDate };
      });

      const months = await Promise.all(
        monthRanges.map(async ({ month, monthName, startDate, endDate }) => {
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

          const income = treatments.reduce((sum, t) => sum + (t.amount ?? 0), 0);
          const expense = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

          return { month, monthName, income, expense };
        })
      );

      return Response.json({ months });
    }

    return Response.json({ error: "Geçersiz tip parametresi" }, { status: 400 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
