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
      include: {
        payments: { orderBy: { dueDate: "desc" }, take: 3 },
        _count: { select: { payments: true } },
      },
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

    const parsedRemindBefore = remindBefore ? parseInt(remindBefore) : 3;
    const parsedAmount = amount ? parseFloat(amount) : null;

    const transaction = await prisma.recurringTransaction.create({
      data: {
        clinicId,
        type,
        category,
        name,
        amount: parsedAmount,
        dayOfMonth: parseInt(dayOfMonth),
        remindBefore: parsedRemindBefore,
        notes: notes || null,
      },
    });

    // Create alarm if remindBefore > 0
    if (parsedRemindBefore > 0) {
      await prisma.alarm.create({
        data: {
          clinicId,
          name: `Sabit odeme hatirlatma: ${name}`,
          type: "FINANCE",
          conditions: {
            recurringId: transaction.id,
            daysBefore: parsedRemindBefore,
            amount: parsedAmount,
          },
          isActive: true,
        },
      });
    }

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
    const { id, updateMode, ...data } = body;

    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

    if (data.amount !== undefined) data.amount = data.amount ? parseFloat(data.amount) : null;
    if (data.dayOfMonth !== undefined) data.dayOfMonth = parseInt(data.dayOfMonth);
    if (data.remindBefore !== undefined) data.remindBefore = parseInt(data.remindBefore);

    const transaction = await prisma.recurringTransaction.update({
      where: { id, clinicId },
      data,
    });

    // Update history if amount changed and mode requires it
    if (data.amount !== undefined && (updateMode === "all_history" || updateMode === "correction")) {
      await prisma.recurringPayment.updateMany({
        where: { recurringTransactionId: id },
        data: { amount: data.amount ?? 0 },
      });
    }

    // Alarm upsert based on remindBefore
    if (data.remindBefore !== undefined) {
      const existingAlarm = await prisma.alarm.findFirst({
        where: {
          clinicId,
          type: "FINANCE",
          conditions: { path: ["recurringId"], equals: id },
        },
      });

      if (data.remindBefore > 0) {
        if (existingAlarm) {
          await prisma.alarm.update({
            where: { id: existingAlarm.id },
            data: {
              name: `Sabit odeme hatirlatma: ${transaction.name}`,
              conditions: {
                recurringId: id,
                daysBefore: data.remindBefore,
                amount: data.amount ?? transaction.amount,
              },
            },
          });
        } else {
          await prisma.alarm.create({
            data: {
              clinicId,
              name: `Sabit odeme hatirlatma: ${transaction.name}`,
              type: "FINANCE",
              conditions: {
                recurringId: id,
                daysBefore: data.remindBefore,
                amount: data.amount ?? transaction.amount,
              },
              isActive: true,
            },
          });
        }
      } else if (existingAlarm) {
        await prisma.alarm.delete({ where: { id: existingAlarm.id } });
      }
    }

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

    const body = await req.json();
    const { id, deleteMode } = body;
    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

    // Delete related alarms
    await prisma.alarm.deleteMany({
      where: {
        clinicId,
        type: "FINANCE",
        conditions: { path: ["recurringId"], equals: id },
      },
    });

    if (deleteMode === "record_only") {
      // Only delete the recurring transaction, keep payments
      await prisma.recurringTransaction.delete({ where: { id, clinicId } });
    } else {
      // Default: delete payments + transaction
      await prisma.recurringPayment.deleteMany({ where: { recurringTransactionId: id } });
      await prisma.recurringTransaction.delete({ where: { id, clinicId } });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Silinemedi" }, { status: 500 });
  }
}
