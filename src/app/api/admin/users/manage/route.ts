import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — admin actions: extend trial, change status, change role
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { role: true },
    });
    if (adminUser?.role !== "ADMIN" && adminUser?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    const { action, userId, clinicId, days, date, status, role } = await req.json();

    if (!action) return NextResponse.json({ error: "Aksiyon gerekli" }, { status: 400 });

    switch (action) {
      case "extend-trial": {
        if (!clinicId) return NextResponse.json({ error: "Clinic ID gerekli" }, { status: 400 });

        let newTrialEnd: Date;
        if (date) {
          newTrialEnd = new Date(date);
        } else if (days) {
          // Get current trial end or use now
          const sub = await prisma.subscriptionPlan.findUnique({ where: { clinicId } });
          const baseDate = sub?.trialEnd && new Date(sub.trialEnd) > new Date() ? new Date(sub.trialEnd) : new Date();
          newTrialEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
        } else {
          return NextResponse.json({ error: "Gün sayısı veya tarih gerekli" }, { status: 400 });
        }

        await prisma.subscriptionPlan.upsert({
          where: { clinicId },
          update: { trialEnd: newTrialEnd, status: "trial" },
          create: {
            clinicId,
            status: "trial",
            trialEnd: newTrialEnd,
            activeModules: ["base", "messaging", "appointments", "customers", "inventory", "finance", "employees", "alarms", "reports"],
          },
        });

        return NextResponse.json({ success: true, trialEnd: newTrialEnd.toISOString() });
      }

      case "change-status": {
        if (!clinicId || !status) return NextResponse.json({ error: "Clinic ID ve status gerekli" }, { status: 400 });
        const validStatuses = ["trial", "active", "suspended", "cancelled"];
        if (!validStatuses.includes(status)) {
          return NextResponse.json({ error: "Geçersiz status" }, { status: 400 });
        }

        await prisma.subscriptionPlan.upsert({
          where: { clinicId },
          update: { status },
          create: {
            clinicId,
            status,
            activeModules: ["base", "messaging"],
          },
        });

        // If suspended/cancelled, deactivate user
        if (status === "suspended" || status === "cancelled") {
          await prisma.user.updateMany({
            where: { clinicId },
            data: { isActive: status !== "cancelled" },
          });
        } else {
          await prisma.user.updateMany({
            where: { clinicId },
            data: { isActive: true },
          });
        }

        return NextResponse.json({ success: true, status });
      }

      case "change-role": {
        if (!userId || !role) return NextResponse.json({ error: "User ID ve rol gerekli" }, { status: 400 });
        const validRoles = ["USER", "ADMIN", "SUPERADMIN", "DEMO"];
        if (!validRoles.includes(role)) {
          return NextResponse.json({ error: "Geçersiz rol" }, { status: 400 });
        }

        await prisma.user.update({
          where: { id: userId },
          data: { role },
        });

        return NextResponse.json({ success: true, role });
      }

      default:
        return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin manage error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
