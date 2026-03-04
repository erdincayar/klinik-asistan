import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

export async function DELETE(_req: NextRequest) {
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
        metaAppId: null,
        metaAccessToken: null,
        metaAdAccountId: null,
        metaConnected: false,
      },
    });

    const userId = (session.user as any).id;
    logActivity({
      userId,
      clinicId,
      action: "META_DISCONNECT",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disconnect error:", error);
    return NextResponse.json({ error: "Bağlantı kaldırma hatası" }, { status: 500 });
  }
}
