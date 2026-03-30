import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — Ödeme kaydet
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;

    const debt = await prisma.debt.findFirst({ where: { id: params.id, clinicId } });
    if (!debt) return Response.json({ error: "Kayıt bulunamadı" }, { status: 404 });

    const body = await req.json();
    const { amount, paymentMethod, notes } = body;

    if (!amount || amount <= 0) {
      return Response.json({ error: "Geçerli tutar giriniz" }, { status: 400 });
    }
    if (!paymentMethod) {
      return Response.json({ error: "Ödeme yöntemi gerekli" }, { status: 400 });
    }

    const paymentAmount = Math.round(amount);
    const newPaidAmount = debt.paidAmount + paymentAmount;
    const remaining = debt.totalAmount - newPaidAmount;

    // Ödeme kaydı oluştur
    const payment = await prisma.debtPayment.create({
      data: {
        debtId: debt.id,
        amount: paymentAmount,
        paymentMethod,
        notes: notes || null,
      },
    });

    // Borç durumunu güncelle
    const newStatus = remaining <= 0 ? "PAID" : newPaidAmount > 0 ? "PARTIAL" : "OPEN";
    await prisma.debt.update({
      where: { id: debt.id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    return Response.json({ payment, newStatus, remaining: Math.max(0, remaining) });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
