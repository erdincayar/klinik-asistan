import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { telegramChatId: true },
    });

    return NextResponse.json({
      connected: !!clinic?.telegramChatId,
      chatId: clinic?.telegramChatId || null,
    });
  } catch (error) {
    console.error("Telegram status error:", error);
    return NextResponse.json({ error: "Durum alınamadı" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    await prisma.clinic.update({
      where: { id: clinicId },
      data: { telegramChatId: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram disconnect error:", error);
    return NextResponse.json({ error: "Bağlantı kaldırılamadı" }, { status: 500 });
  }
}
