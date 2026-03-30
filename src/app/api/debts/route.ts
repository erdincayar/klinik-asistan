import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

    const direction = req.nextUrl.searchParams.get("direction") || "";
    const status = req.nextUrl.searchParams.get("status") || "";

    const where: Record<string, any> = { clinicId };
    if (direction) where.direction = direction;
    if (status) where.status = status;

    const debts = await prisma.debt.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        payments: { orderBy: { paidAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Summary
    const all = await prisma.debt.findMany({ where: { clinicId }, select: { direction: true, totalAmount: true, paidAmount: true, status: true } });
    const receivableTotal = all.filter((d) => d.direction === "RECEIVABLE").reduce((s, d) => s + d.totalAmount, 0);
    const receivablePaid = all.filter((d) => d.direction === "RECEIVABLE").reduce((s, d) => s + d.paidAmount, 0);
    const payableTotal = all.filter((d) => d.direction === "PAYABLE").reduce((s, d) => s + d.totalAmount, 0);
    const payablePaid = all.filter((d) => d.direction === "PAYABLE").reduce((s, d) => s + d.paidAmount, 0);
    const openCount = all.filter((d) => d.status !== "PAID").length;

    return Response.json({
      debts,
      summary: {
        receivableTotal,
        receivableRemaining: receivableTotal - receivablePaid,
        payableTotal,
        payableRemaining: payableTotal - payablePaid,
        openCount,
      },
    });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

    const body = await req.json();
    const { direction, contactName, description, totalAmount, dueDate, patientId, treatmentId, appointmentId } = body;

    if (!direction || !contactName || !totalAmount) {
      return Response.json({ error: "Yön, kişi adı ve tutar gerekli" }, { status: 400 });
    }

    const debt = await prisma.debt.create({
      data: {
        clinicId,
        direction,
        contactName,
        description: description || null,
        totalAmount: Math.round(totalAmount),
        dueDate: dueDate ? new Date(dueDate) : null,
        patientId: patientId || null,
        treatmentId: treatmentId || null,
        appointmentId: appointmentId || null,
      },
    });

    return Response.json({ debt });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
