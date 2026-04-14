import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — manuel KDV girişi ekle
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

    const { type, amount, description, period } = await req.json();

    if (!type || !amount || !period) {
      return NextResponse.json({ error: "Tür, tutar ve dönem gerekli" }, { status: 400 });
    }
    if (type !== "payable" && type !== "carried") {
      return NextResponse.json({ error: "Tür 'payable' veya 'carried' olmalı" }, { status: 400 });
    }

    const entry = await prisma.manualVatEntry.create({
      data: {
        clinicId,
        type,
        amount: Math.round(Number(amount)), // kuruş
        description: description || null,
        period,
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

// DELETE — manuel KDV girişi sil
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

    await prisma.manualVatEntry.deleteMany({ where: { id, clinicId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
