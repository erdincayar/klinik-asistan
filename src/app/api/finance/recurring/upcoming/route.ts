import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "Klinik bulunamadi" }, { status: 400 });

    const today = new Date();
    const dayOfMonth = today.getDate();

    const transactions = await prisma.recurringTransaction.findMany({
      where: {
        clinicId,
        isActive: true,
        dayOfMonth: { gte: dayOfMonth, lte: dayOfMonth + 7 },
      },
      orderBy: { dayOfMonth: "asc" },
    });

    return NextResponse.json({ upcoming: transactions });
  } catch {
    return NextResponse.json({ error: "Veri alinamadi" }, { status: 500 });
  }
}
