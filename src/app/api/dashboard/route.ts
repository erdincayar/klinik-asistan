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

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalPatients,
      monthlyTreatments,
      monthlyExpenseRecords,
      recentTreatments,
      pendingReminders,
    ] = await Promise.all([
      prisma.patient.count({ where: { clinicId } }),
      prisma.treatment.findMany({
        where: { clinicId, date: { gte: startOfMonth, lt: startOfNextMonth } },
        select: { amount: true },
      }),
      prisma.expense.findMany({
        where: { clinicId, date: { gte: startOfMonth, lt: startOfNextMonth } },
        select: { amount: true },
      }),
      prisma.treatment.findMany({
        where: { clinicId },
        include: { patient: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 5,
      }),
      prisma.reminder.count({ where: { clinicId, isActive: true } }),
    ]);

    const monthlyRevenue = monthlyTreatments.reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = monthlyExpenseRecords.reduce((sum, e) => sum + e.amount, 0);

    return Response.json({
      totalPatients,
      monthlyRevenue,
      monthlyExpenses,
      netProfit: monthlyRevenue - monthlyExpenses,
      recentTreatments,
      pendingReminders,
    });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
