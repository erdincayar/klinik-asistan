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

      // CIRO = Toplam gelir (KDV dahil tutarlar olduğu gibi)
      const treatmentTotal = rawTreatments.reduce((sum, t) => sum + (t.amount ?? 0), 0);
      const incomeTotal = rawIncomeRecords.reduce((sum, i) => sum + (i.amount ?? 0), 0);
      const ciro = treatmentTotal + incomeTotal;

      // COGS (Satılan Malın Maliyeti) hesaplama
      const incomeIdsWithStockMovements = new Set(
        rawOutMovements
          .filter(m => m.reference?.startsWith("expense-income-"))
          .map(m => m.reference!.replace("expense-income-", ""))
      );
      let embeddedCost = 0;
      for (const inc of rawIncomeRecords) {
        if (incomeIdsWithStockMovements.has(inc.id)) continue;
        const costMatch = inc.description?.match(/\[Maliyet: (\d+)\]/);
        if (costMatch) embeddedCost += parseInt(costMatch[1], 10);
      }

      const treatmentRefs = rawOutMovements
        .filter(m => m.reference?.startsWith("treatment-"))
        .map(m => m.reference!.replace("treatment-", ""));
      const expenseIncomeRefs = rawOutMovements
        .filter(m => m.reference?.startsWith("expense-income-"))
        .map(m => m.reference!.replace("expense-income-", ""));

      const [existingTreatments, existingExpenseIncomes] = await Promise.all([
        treatmentRefs.length > 0
          ? prisma.treatment.findMany({ where: { id: { in: treatmentRefs }, clinicId }, select: { id: true } })
          : Promise.resolve([]),
        expenseIncomeRefs.length > 0
          ? prisma.expense.findMany({ where: { id: { in: expenseIncomeRefs }, clinicId }, select: { id: true } })
          : Promise.resolve([]),
      ]);
      const validTreatmentIds = new Set(existingTreatments.map(t => t.id));
      const validExpenseIncomeIds = new Set(existingExpenseIncomes.map(e => e.id));

      const nonInvoiceCogs = rawOutMovements
        .filter(m => {
          if (!m.reference) return true;
          if (m.reference.startsWith("invoice-")) return false;
          if (m.reference.startsWith("treatment-")) return validTreatmentIds.has(m.reference.replace("treatment-", ""));
          if (m.reference.startsWith("expense-income-")) return validExpenseIncomeIds.has(m.reference.replace("expense-income-", ""));
          return true;
        })
        .reduce((sum, m) => sum + (m.quantity * (m.product.purchasePrice ?? 0)), 0);

      const approvedIncomeInvoices = await prisma.uploadedInvoice.findMany({
        where: {
          clinicId,
          approved: true,
          invoiceType: "INCOME",
          invoiceDate: { gte: startDate, lt: endDate },
        },
        select: { id: true, vendor: true, amount: true, profitData: true, invoiceDate: true, linkedExpenseId: true },
      });

      let invoiceCogs = 0;
      for (const inv of approvedIncomeInvoices) {
        const pd = inv.profitData as any;
        if (pd && typeof pd.totalCost === "number") {
          invoiceCogs += pd.totalCost;
        } else {
          const invoiceMovementCogs = rawOutMovements
            .filter(m => m.reference === `invoice-${inv.id}`)
            .reduce((sum, m) => sum + (m.quantity * (m.product.purchasePrice ?? 0)), 0);
          invoiceCogs += invoiceMovementCogs;
        }
      }

      const cogs = nonInvoiceCogs + invoiceCogs + embeddedCost;

      // KAR HESABI: Ciro (KDV dahil) - Maliyet - Gider = Brüt Kar
      // KDV ayrı takip edilir, kar hesabından çıkarılmaz
      const totalExpense = rawExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
      const brutKar = ciro - cogs - totalExpense;

      // KDV hesaplaması (ayrı takip — kar hesabını etkilemez)
      // Satışlardan oluşan KDV (Ödenecek KDV)
      let vatFromSales = 0;
      for (const inc of rawIncomeRecords) {
        const rate = (inc as any).vatRate ?? taxRate;
        if (rate === 0) continue;
        const vatAmt = (inc as any).vatIncluded
          ? Math.round(inc.amount * rate / (100 + rate))
          : Math.round(inc.amount * rate / 100);
        vatFromSales += vatAmt;
      }
      for (const t of rawTreatments) {
        vatFromSales += Math.round(t.amount * taxRate / (100 + taxRate));
      }

      // Alışlardan ödenen KDV (Devreden/İndirilecek KDV)
      let vatFromPurchases = 0;
      for (const exp of rawExpenses) {
        const rate = (exp as any).vatRate ?? taxRate;
        if (rate === 0) continue;
        const vatAmt = (exp as any).vatIncluded
          ? Math.round(exp.amount * rate / (100 + rate))
          : Math.round(exp.amount * rate / 100);
        vatFromPurchases += vatAmt;
      }

      const vatAmount = vatFromSales; // backward compat

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

      const invoiceLinkedExpenseIds = new Set(
        approvedIncomeInvoices
          .filter((inv) => (inv as any).linkedExpenseId)
          .map((inv) => (inv as any).linkedExpenseId)
      );
      const incomeRecords = rawIncomeRecords
        .filter((r) => !invoiceLinkedExpenseIds.has(r.id))
        .map((r) => ({
          id: r.id,
          date: r.date,
          description: r.description,
          category: r.category,
          amount: r.amount,
        }));

      return Response.json({
        ciro,
        cogs,
        gelir: ciro - cogs, // backward compat: gelir = ciro - maliyet (KDV çıkarılmıyor)
        totalExpense,
        totalProfit: brutKar,
        vatAmount,
        vatFromSales,
        vatFromPurchases,
        taxRate,
        treatments,
        expenses,
        incomeRecords,
        invoiceProfitSummary,
      });
    }

    if (type === "vat-ledger") {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 1));
      const periodStr = `${year}-${String(month).padStart(2, "0")}`;

      const [incomeRecords, treatments, expenseRecords, manualEntries] = await Promise.all([
        prisma.expense.findMany({
          where: { clinicId, type: "INCOME", date: { gte: startDate, lt: endDate } },
          select: { id: true, description: true, amount: true, vatRate: true, vatIncluded: true, date: true },
        }),
        prisma.treatment.findMany({
          where: { clinicId, date: { gte: startDate, lt: endDate } },
          select: { id: true, category: true, amount: true, date: true, patient: { select: { name: true } } },
        }),
        prisma.expense.findMany({
          where: { clinicId, type: "EXPENSE", date: { gte: startDate, lt: endDate } },
          select: { id: true, description: true, amount: true, vatRate: true, vatIncluded: true, date: true },
        }),
        // Manuel KDV girişleri
        prisma.manualVatEntry.findMany({
          where: { clinicId, period: periodStr },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      // Hesaplanan KDV (Ödenecek KDV — satışlardan)
      let vatCollected = 0;
      const vatCollectedItems: Array<{ description: string; amount: number; vatAmount: number; vatRate: number; date: Date }> = [];

      for (const inc of incomeRecords) {
        const rate = inc.vatRate ?? taxRate;
        if (rate === 0) continue;
        const vatAmt = inc.vatIncluded
          ? Math.round(inc.amount * rate / (100 + rate))
          : Math.round(inc.amount * rate / 100);
        vatCollected += vatAmt;
        vatCollectedItems.push({
          description: inc.description,
          amount: inc.amount,
          vatAmount: vatAmt,
          vatRate: rate,
          date: inc.date,
        });
      }

      for (const t of treatments) {
        const vatAmt = Math.round(t.amount * taxRate / (100 + taxRate));
        vatCollected += vatAmt;
        vatCollectedItems.push({
          description: `Tedavi - ${t.patient.name} (${t.category})`,
          amount: t.amount,
          vatAmount: vatAmt,
          vatRate: taxRate,
          date: t.date,
        });
      }

      // İndirilecek KDV (Devreden KDV — alışlardan)
      let vatPaid = 0;
      const vatPaidItems: Array<{ description: string; amount: number; vatAmount: number; vatRate: number; date: Date }> = [];

      for (const exp of expenseRecords) {
        const rate = exp.vatRate ?? taxRate;
        if (rate === 0) continue;
        const vatAmt = exp.vatIncluded
          ? Math.round(exp.amount * rate / (100 + rate))
          : Math.round(exp.amount * rate / 100);
        vatPaid += vatAmt;
        vatPaidItems.push({
          description: exp.description,
          amount: exp.amount,
          vatAmount: vatAmt,
          vatRate: rate,
          date: exp.date,
        });
      }

      // Manuel KDV girişleri
      let manualPayable = 0; // manuel ödenecek
      let manualCarried = 0; // manuel devreden
      const manualItems: Array<{ id: string; type: string; amount: number; description: string | null; createdAt: Date }> = [];

      for (const entry of manualEntries) {
        if (entry.type === "payable") {
          manualPayable += entry.amount;
        } else {
          manualCarried += entry.amount;
        }
        manualItems.push({
          id: entry.id,
          type: entry.type,
          amount: entry.amount,
          description: entry.description,
          createdAt: entry.createdAt,
        });
      }

      // Net KDV = (Ödenecek + Manuel Ödenecek) - (Devreden + Manuel Devreden)
      const totalPayable = vatCollected + manualPayable;
      const totalCarried = vatPaid + manualCarried;
      const netVat = totalPayable - totalCarried;

      return Response.json({
        vatCollected,
        vatPaid,
        manualPayable,
        manualCarried,
        totalPayable,
        totalCarried,
        netVat,
        vatCollectedItems,
        vatPaidItems,
        manualItems,
        taxRate,
      });
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
