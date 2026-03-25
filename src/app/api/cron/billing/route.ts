import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // CRON_SECRET auth
    const authHeader = req.headers.get("authorization");
    const secret = process.env.CRON_SECRET;
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    let trialExpired = 0;
    let trialSuspended = 0;

    // 1. Handle expired trials — trial biten ve kart olmayan kullanıcıları askıya al
    const expiredTrials = await prisma.subscriptionPlan.findMany({
      where: {
        status: "trial",
        trialEnd: { lt: now },
      },
    });

    for (const plan of expiredTrials) {
      if (plan.paytrUtoken && plan.paytrCtoken) {
        // Has card — activate (future: charge first month)
        // For now, just activate since PayTR Direct API integration is pending
        await prisma.subscriptionPlan.update({
          where: { id: plan.id },
          data: {
            status: "active",
            nextBillingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        trialExpired++;
      } else {
        // No card — suspend
        await prisma.subscriptionPlan.update({
          where: { id: plan.id },
          data: { status: "suspended" },
        });
        trialSuspended++;
      }
    }

    // 2. Handle monthly renewals (future: charge stored cards)
    // This will be implemented when PayTR Direct API (chargeStoredCard) is integrated
    // const renewals = await prisma.subscriptionPlan.findMany({
    //   where: {
    //     status: "active",
    //     nextBillingDate: { lt: now },
    //     paytrUtoken: { not: null },
    //   },
    // });

    return NextResponse.json({
      success: true,
      stats: {
        trialExpired,
        trialSuspended,
        processedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Billing cron error:", error);
    return NextResponse.json({ error: "Billing cron failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const [expiredTrials, activeWithBilling, suspended] = await Promise.all([
    prisma.subscriptionPlan.count({
      where: { status: "trial", trialEnd: { lt: now } },
    }),
    prisma.subscriptionPlan.count({
      where: { status: "active", nextBillingDate: { lt: now } },
    }),
    prisma.subscriptionPlan.count({
      where: { status: "suspended" },
    }),
  ]);

  return NextResponse.json({
    pending: {
      expiredTrials,
      activeWithBilling,
      suspended,
    },
  });
}
