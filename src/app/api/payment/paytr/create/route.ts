import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPackageInfo, getPaytrIframeToken, PaymentType } from "@/lib/paytr";
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

    const body = await req.json();
    const { paymentType, packageId } = body as { paymentType: PaymentType; packageId: string };

    if (!paymentType || !packageId) {
      return NextResponse.json({ error: "paymentType ve packageId gerekli" }, { status: 400 });
    }

    const pkg = getPackageInfo(paymentType, packageId);
    if (!pkg) {
      return NextResponse.json({ error: "Geçersiz paket" }, { status: 400 });
    }

    const merchantOid = randomUUID().replace(/-/g, "").slice(0, 20);
    const userBasket = Buffer.from(
      JSON.stringify([[pkg.name, pkg.price, 1]])
    ).toString("base64");

    const userIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const result = await getPaytrIframeToken({
      merchantOid,
      email: user.email!,
      paymentAmount: pkg.price,
      userBasket,
      userIp,
      userName: user.name || "Kullanıcı",
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Find or create subscription for this clinic
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

    // Create payment record
    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        amount: pkg.price,
        status: "PENDING",
        paytrOrderId: merchantOid,
        paytrToken: result.token,
        paymentType,
        packageId,
      },
    });

    return NextResponse.json({ token: result.token, orderId: merchantOid });
  } catch (error) {
    console.error("PayTR create error:", error);
    return NextResponse.json({ error: "Ödeme başlatılamadı" }, { status: 500 });
  }
}
