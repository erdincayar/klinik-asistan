import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { calculateTotal, MODULE_PRICES, STORAGE_PLANS, LOCKED_MODULES } from "@/lib/billing/plans";

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

    let plan = await prisma.subscriptionPlan.findUnique({
      where: { clinicId },
    });

    // Auto-create plan if not exists (backward compat)
    if (!plan) {
      plan = await prisma.subscriptionPlan.create({
        data: {
          clinicId,
          status: "active",
          activeModules: ["base", "messaging"],
          monthlyTotal: 9900,
        },
      });
    }

    const activeModules = (plan.activeModules as string[]) || ["base", "messaging"];
    const pricing = calculateTotal(activeModules, plan.extraUsers, plan.storagePlan);

    return NextResponse.json({
      id: plan.id,
      status: plan.status,
      trialEnd: plan.trialEnd,
      activeModules,
      extraUsers: plan.extraUsers,
      storagePlan: plan.storagePlan,
      storageUsedMb: plan.storageUsedMb,
      monthlyTotal: plan.monthlyTotal,
      discountRate: plan.discountRate,
      cardLast4: plan.cardLast4,
      cardBrand: plan.cardBrand,
      nextBillingDate: plan.nextBillingDate,
      pricing,
      modulePrices: MODULE_PRICES,
      storagePlans: STORAGE_PLANS,
      lockedModules: LOCKED_MODULES,
    });
  } catch (error) {
    console.error("Billing modules GET error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

const patchSchema = z.object({
  activeModules: z.array(z.string()).optional(),
  extraUsers: z.number().min(0).optional(),
  storagePlan: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
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
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { clinicId },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plan bulunamadı" }, { status: 404 });
    }

    const newModules = parsed.data.activeModules ?? (plan.activeModules as string[]);
    const newExtraUsers = parsed.data.extraUsers ?? plan.extraUsers;
    const newStoragePlan = parsed.data.storagePlan ?? plan.storagePlan;

    // Validate: base and messaging always included
    if (!newModules.includes("base")) newModules.unshift("base");
    if (!newModules.includes("messaging")) newModules.push("messaging");

    // Validate: no locked modules
    for (const mod of newModules) {
      if (LOCKED_MODULES.includes(mod)) {
        return NextResponse.json(
          { error: `${mod} modülü henüz kullanılabilir değil.` },
          { status: 400 }
        );
      }
    }

    // Validate storage plan
    if (newStoragePlan && !STORAGE_PLANS[newStoragePlan]) {
      return NextResponse.json({ error: "Geçersiz depolama planı" }, { status: 400 });
    }

    const pricing = calculateTotal(newModules, newExtraUsers, newStoragePlan);

    const updated = await prisma.subscriptionPlan.update({
      where: { clinicId },
      data: {
        activeModules: newModules,
        extraUsers: newExtraUsers,
        storagePlan: newStoragePlan,
        monthlyTotal: pricing.total,
        discountRate: pricing.discountRate,
      },
    });

    return NextResponse.json({
      ...updated,
      activeModules: newModules,
      pricing,
    });
  } catch (error) {
    console.error("Billing modules PATCH error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
