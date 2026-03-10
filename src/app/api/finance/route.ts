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

      const [rawTreatments, rawIncomeRecords, rawExpenses, rawOutMovements] = await Promise.all([
        prisma.treatment.findMany({
          where: { clinicId, date: { gte: startDate, lt: endDate } },
          include: { patient: { select: { id: true, name: true } } },
          orderBy: { date: "desc" },
        }),
        prisma.expense.findMany({
          where: { clinicId, type: "INCOME", date: { gte: startDate, lt: endDate } },
          orderBy: { date: "desc" },
        }),
        prisma.expense.findMany({
          where: { clinicId, type: "EXPENSE", date: { gte: startDate, lt: endDate } },
          orderBy: { date: "desc" },
        }),
        prisma.stockMovement.findMany({
          where: { clinicId, type: "OUT", date: { gte: startDate, lt: endDate } },
          include: { product: { select: { purchasePrice: true } } },
        }),
      ]);

      const treatmentTotal = rawTreatments.reduce((sum, t) => sum + (t.amount ?? 0), 0);
      const incomeTotal = rawIncomeRecords.reduce((sum, i) => sum + (i.amount ?? 0), 0);
      const ciro = treatmentTotal + incomeTotal;

      // COGS: non-invoice stock movements + invoice profitData costs (avoid double-counting)
      const nonInvoiceCogs = rawOutMovements
        .filter(m => !m.reference?.startsWith("invoice-"))
        .reduce((sum, m) => sum + (m.quantity * (m.product.purchasePrice ?? 0)), 0);

      // Fetch approved income invoices for profitData-based costs
      const approvedIncomeInvoices = await prisma.uploadedInvoice.findMany({
        where: {
          clinicId,
          approved: true,
          invoiceType: "INCOME",
          invoiceDate: { gte: startDate, lt: endDate },
        },
        select: { id: true, vendor: true, amount: true, profitData: true, invoiceDate: true },
      });

      let invoiceCogs = 0;
      for (const inv of approvedIncomeInvoices) {
        const pd = inv.profitData as any;
        if (pd?.totalCost) {
          invoiceCogs += pd.totalCost;
        } else {
          // Fallback: use invoice-related stock movements for this invoice
          const invoiceMovementCogs = rawOutMovements
            .filter(m => m.reference === `invoice-${inv.id}`)
            .reduce((sum, m) => sum + (m.quantity * (m.product.purchasePrice ?? 0)), 0);
          invoiceCogs += invoiceMovementCogs;
        }
      }

      const cogs = nonInvoiceCogs + invoiceCogs;
      const gelir = ciro - cogs;
      const totalExpense = rawExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
      const totalProfit = gelir - totalExpense;
      const vatAmount = Math.round(ciro * taxRate / (100 + taxRate));

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

      const invoiceProfitSummary = {
        totalInvoiceRevenue: 0,
        totalInvoiceCost: 0,
        invoiceGrossProfit: 0,
        unmatchedItemCount: 0,
        invoices: [] as Array<{
          id: string;
          vendor: string | null;
          amount: number;
          date: string | null;
          grossProfit: number;
          unmatchedCount: number;
        }>,
      };

      for (const inv of approvedIncomeInvoices) {
        const pd = inv.profitData as any;
        if (pd) {
          invoiceProfitSummary.totalInvoiceRevenue += pd.totalRevenue || 0;
          invoiceProfitSummary.totalInvoiceCost += pd.totalCost || 0;
          invoiceProfitSummary.invoiceGrossProfit += pd.grossProfit || 0;
          const unmatchedCount = pd.unmatchedItems?.length || 0;
          invoiceProfitSummary.unmatchedItemCount += unmatchedCount;
          invoiceProfitSummary.invoices.push({
            id: inv.id,
            vendor: inv.vendor,
            amount: inv.amount ? Math.round(inv.amount * 100) : 0,
            date: inv.invoiceDate?.toISOString() || null,
            grossProfit: pd.grossProfit || 0,
            unmatchedCount,
          });
        }
      }

      return Response.json({ ciro, cogs, gelir, totalExpense, totalProfit, vatAmount, taxRate, treatments, expenses, invoiceProfitSummary });
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
          const [treatments, incomeRecords, expenses, outMovements] = await Promise.all([
            prisma.treatment.findMany({
              where: { clinicId, date: { gte: startDate, lt: endDate } },
              select: { amount: true },
            }),
            prisma.expense.findMany({
              where: { clinicId, type: "INCOME", date: { gte: startDate, lt: endDate } },
              select: { amount: true },
            }),
            prisma.expense.findMany({
              where: { clinicId, type: "EXPENSE", date: { gte: startDate, lt: endDate } },
              select: { amount: true },
            }),
            prisma.stockMovement.findMany({
              where: { clinicId, type: "OUT", date: { gte: startDate, lt: endDate } },
              include: { product: { select: { purchasePrice: true } } },
            }),
          ]);

          const treatmentTotal = treatments.reduce((sum, t) => sum + (t.amount ?? 0), 0);
          const incomeTotal = incomeRecords.reduce((sum, i) => sum + (i.amount ?? 0), 0);
          const ciro = treatmentTotal + incomeTotal;
          const cogs = outMovements.reduce((sum, m) => sum + (m.quantity * (m.product.purchasePrice ?? 0)), 0);
          const income = ciro - cogs;
          const expense = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

          return { month, monthName, ciro, income, expense };
        })
      );

      return Response.json({ months });
    }

    return Response.json({ error: "Geçersiz tip parametresi" }, { status: 400 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
