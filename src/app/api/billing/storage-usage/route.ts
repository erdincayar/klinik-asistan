import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STORAGE_PLANS } from "@/lib/billing/plans";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { clinicId },
    });

    const storagePlanKey = plan?.storagePlan || "free";
    const storagePlanDef = STORAGE_PLANS[storagePlanKey] || STORAGE_PLANS.free;

    return NextResponse.json({
      usedMb: plan?.storageUsedMb || 0,
      limitMb: storagePlanDef.sizeMB,
      plan: storagePlanKey,
      planName: storagePlanDef.name,
    });
  } catch (error) {
    console.error("Storage usage GET error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
