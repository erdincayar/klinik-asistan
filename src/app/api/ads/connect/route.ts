import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { logActivity } from "@/lib/activity-logger";

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{ token: string; expiresAt: Date } | null> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return null;
  }

  try {
    const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("fb_exchange_token", shortLivedToken);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.error) {
      console.error("Token exchange error:", data.error.message);
      return null;
    }

    if (data.access_token) {
      // Long-lived tokens typically expire in 60 days
      const expiresInSeconds = data.expires_in || 60 * 24 * 60 * 60;
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
      return { token: data.access_token, expiresAt };
    }

    return null;
  } catch (error) {
    console.error("Token exchange failed:", error);
    return null;
  }
}

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

    // Try to exchange for long-lived token
    const exchangeResult = await exchangeForLongLivedToken(accessToken);
    const finalToken = exchangeResult?.token || accessToken;
    const tokenExpiresAt = exchangeResult?.expiresAt || null;

    const encryptedToken = encrypt(finalToken);

    await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        metaAppId: appId,
        metaAccessToken: encryptedToken,
        metaAdAccountId: formattedAccountId,
        metaConnected: true,
        metaTokenExpiresAt: tokenExpiresAt,
      },
    });

    const userId = (session.user as any).id;
    logActivity({
      userId,
      clinicId,
      action: "META_CONNECT",
      details: {
        adAccountId: formattedAccountId,
        longLivedToken: !!exchangeResult,
        tokenExpiresAt: tokenExpiresAt?.toISOString() || null,
      },
    });

    return NextResponse.json({
      success: true,
      longLivedToken: !!exchangeResult,
      tokenExpiresAt: tokenExpiresAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Meta connect error:", error);
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
