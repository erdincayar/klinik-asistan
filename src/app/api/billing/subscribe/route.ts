import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, isPlanValid } from "@/lib/iyzico";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "Klinik bulunamadi" }, { status: 400 });

    const { plan } = await req.json();
    if (!isPlanValid(plan)) {
      return NextResponse.json({ error: "Gecersiz plan" }, { status: 400 });
    }

    const planInfo = PLANS[plan];
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Check if there's an existing active subscription
    const existing = await prisma.subscription.findFirst({
      where: { clinicId, status: { in: ["ACTIVE", "TRIAL"] } },
    });

    if (existing) {
      // Update existing
      const updated = await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          plan,
          price: planInfo.price,
          currentPeriodEnd: periodEnd,
        },
      });
      return NextResponse.json({ subscription: updated });
    }

    // Create new subscription with trial
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14);

    const subscription = await prisma.subscription.create({
      data: {
        clinicId,
        plan,
        price: planInfo.price,
        status: "TRIAL",
        trialEndsAt: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Abonelik olusturulamadi" }, { status: 500 });
  }
}
