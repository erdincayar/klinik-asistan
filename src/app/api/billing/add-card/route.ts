import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaytrIframeToken } from "@/lib/paytr";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, clinicId: true, name: true, email: true },
    });

    if (!user?.clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const merchantOid = `card_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const userBasket = Buffer.from(
      JSON.stringify([["Kart Kayıt", 100, 1]])
    ).toString("base64");

    const userIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const result = await getPaytrIframeToken({
      merchantOid,
      email: user.email!,
      paymentAmount: 100, // ₺1 (kuruş)
      userBasket,
      userIp,
      userName: user.name || "Kullanıcı",
      storeCard: true,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Find or create subscription for payment tracking
    let subscription = await prisma.subscription.findFirst({
      where: { clinicId: user.clinicId },
    });

    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          clinicId: user.clinicId,
          plan: "STARTER",
          price: 0,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
        },
      });
    }

    // Create payment record with CARD_SAVE type
    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        amount: 100,
        status: "PENDING",
        paytrOrderId: merchantOid,
        paytrToken: result.token,
        paymentType: "CARD_SAVE",
        packageId: "CARD_SAVE",
      },
    });

    return NextResponse.json({ token: result.token, orderId: merchantOid });
  } catch (error) {
    console.error("Add card error:", error);
    return NextResponse.json({ error: "Kart ekleme başlatılamadı" }, { status: 500 });
  }
}
