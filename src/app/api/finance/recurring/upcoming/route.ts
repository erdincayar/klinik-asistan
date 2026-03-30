import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "Klinik bulunamadi" }, { status: 400 });

    const daysParam = req.nextUrl.searchParams.get("days");
    const days = daysParam ? Math.min(Math.max(parseInt(daysParam, 10) || 7, 1), 30) : 7;

    const today = new Date();
    const dayOfMonth = today.getDate();

    // Calculate which dayOfMonth values fall within the next N days
    // Handle month boundary: e.g. today is 28th, days=7 → need days 28-31 AND 1-4
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

    const targetDays: number[] = [];
    for (let i = 0; i < days; i++) {
      const d = dayOfMonth + i;
      if (d <= daysInCurrentMonth) {
        targetDays.push(d);
      } else {
        targetDays.push(d - daysInCurrentMonth);
      }
    }

    const transactions = await prisma.recurringTransaction.findMany({
      where: {
        clinicId,
        isActive: true,
        dayOfMonth: { in: targetDays },
      },
      orderBy: { dayOfMonth: "asc" },
    });

    // Sort so that current month days come first, then next month days
    transactions.sort((a, b) => {
      const aInCurrent = a.dayOfMonth >= dayOfMonth;
      const bInCurrent = b.dayOfMonth >= dayOfMonth;
      if (aInCurrent && !bInCurrent) return -1;
      if (!aInCurrent && bInCurrent) return 1;
      return a.dayOfMonth - b.dayOfMonth;
    });

    // Calculate total amount
    const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    return NextResponse.json({ upcoming: transactions, totalAmount, days });
  } catch {
    return NextResponse.json({ error: "Veri alinamadi" }, { status: 500 });
  }
}
