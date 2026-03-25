import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { STORAGE_PLANS, calculateTotal } from "@/lib/billing/plans";

const schema = z.object({
  storagePlan: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
    }

    const { storagePlan } = parsed.data;
    if (!STORAGE_PLANS[storagePlan]) {
      return NextResponse.json({ error: "Geçersiz depolama planı" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { clinicId },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plan bulunamadı" }, { status: 404 });
    }

    // Check if downgrading would exceed storage
    const newLimit = STORAGE_PLANS[storagePlan].sizeMB;
    if (plan.storageUsedMb > newLimit) {
      return NextResponse.json(
        { error: `Mevcut kullanımınız (${plan.storageUsedMb} MB) yeni plan limitini (${newLimit} MB) aşıyor.` },
        { status: 400 }
      );
    }

    const activeModules = (plan.activeModules as string[]) || ["base", "messaging"];
    const pricing = calculateTotal(activeModules, plan.extraUsers, storagePlan);

    const updated = await prisma.subscriptionPlan.update({
      where: { clinicId },
      data: {
        storagePlan,
        monthlyTotal: pricing.total,
        discountRate: pricing.discountRate,
      },
    });

    return NextResponse.json({
      storagePlan: updated.storagePlan,
      pricing,
    });
  } catch (error) {
    console.error("Storage plan POST error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
