import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { id } = await params;
    const body = await req.json();

    const log = await prisma.alarmLog.findFirst({
      where: { id, clinicId },
    });
    if (!log) {
      return NextResponse.json({ error: "Log bulunamadı" }, { status: 404 });
    }

    const updated = await prisma.alarmLog.update({
      where: { id },
      data: { isRead: body.isRead ?? true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
