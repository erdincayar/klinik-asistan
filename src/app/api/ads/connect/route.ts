import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { logActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { appId, accessToken, adAccountId } = await req.json();

    if (!appId || !accessToken || !adAccountId) {
      return NextResponse.json({ error: "Tüm alanlar zorunlu" }, { status: 400 });
    }

    const formattedAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
    const encryptedToken = encrypt(accessToken);

    await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        metaAppId: appId,
        metaAccessToken: encryptedToken,
        metaAdAccountId: formattedAccountId,
        metaConnected: true,
      },
    });

    const userId = (session.user as any).id;
    logActivity({
      userId,
      clinicId,
      action: "META_CONNECT",
      details: { adAccountId: formattedAccountId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Meta connect error:", error);
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
