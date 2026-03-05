import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      data: {
        whatsappPhone: null,
        whatsappConnected: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WhatsApp disconnect error:", error);
    return NextResponse.json(
      { error: "Bağlantı kaldırılamadı" },
      { status: 500 }
    );
  }
}
