import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "Klinik bulunamadi" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const filter: any = { clinicId };
    if (type) filter.type = type;

    const transactions = await prisma.recurringTransaction.findMany({
      where: filter,
      orderBy: { dayOfMonth: "asc" },
      include: { payments: { orderBy: { dueDate: "desc" }, take: 3 } },
    });

    return NextResponse.json({ transactions });
  } catch {
    return NextResponse.json({ error: "Veri alinamadi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "Klinik bulunamadi" }, { status: 400 });

    const body = await req.json();
    const { type, category, name, amount, dayOfMonth, remindBefore, notes } = body;

    if (!type || !category || !name || !dayOfMonth) {
      return NextResponse.json({ error: "Zorunlu alanlari doldurun" }, { status: 400 });
    }

    const transaction = await prisma.recurringTransaction.create({
      data: {
        clinicId,
        type,
        category,
        name,
        amount: amount ? parseFloat(amount) : null,
        dayOfMonth: parseInt(dayOfMonth),
        remindBefore: remindBefore ? parseInt(remindBefore) : 3,
        notes: notes || null,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Olusturulamadi" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

    if (data.amount !== undefined) data.amount = data.amount ? parseFloat(data.amount) : null;
    if (data.dayOfMonth !== undefined) data.dayOfMonth = parseInt(data.dayOfMonth);
    if (data.remindBefore !== undefined) data.remindBefore = parseInt(data.remindBefore);

    const transaction = await prisma.recurringTransaction.update({
      where: { id, clinicId },
      data,
    });

    return NextResponse.json(transaction);
  } catch {
    return NextResponse.json({ error: "Guncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

    await prisma.recurringPayment.deleteMany({ where: { recurringTransactionId: id } });
    await prisma.recurringTransaction.delete({ where: { id, clinicId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Silinemedi" }, { status: 500 });
  }
}
