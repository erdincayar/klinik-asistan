import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;

    const body = await req.json();
    const { amount, notes } = body;

    const transaction = await prisma.recurringTransaction.findFirst({
      where: { id: params.id, clinicId },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Islem bulunamadi" }, { status: 404 });
    }

    const payment = await prisma.recurringPayment.create({
      data: {
        recurringTransactionId: params.id,
        clinicId,
        amount: parseFloat(amount) || transaction.amount || 0,
        paidAt: new Date(),
        dueDate: new Date(),
        status: "PAID",
        notes: notes || null,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Odeme kaydedilemedi" }, { status: 500 });
  }
}
