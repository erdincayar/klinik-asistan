import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
    }

    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalClinics,
      todayLogins,
      activeUsersLast24h,
      activeUsersLast7d,
      passiveUsers,
      totalPatients,
      totalEmployees,
      totalAppointments,
      totalTreatments,
      newUsersLast30d,
      newUsersThisWeek,
      newUsersThisMonth,
      newClinicsLast30d,
      newPatientsLast30d,
      newEmployeesLast30d,
      sectorDistribution,
      subscriptionStats,
      moduleActivations,
      employeesPerClinic,
      patientsPerClinic,
      treatmentRevenue,
      paymentMethods,
      appointmentStatuses,
      pageViews,
      loginTrend,
      // Yeni: kullanıcı detayları + abonelik bilgileri
      allUsers,
      // Yeni: ödeme geçmişi
      billingHistory,
      subscriptionPayments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.clinic.count(),
      prisma.activityLog.count({ where: { action: "LOGIN", createdAt: { gte: today } } }),
      prisma.activityLog.groupBy({
        by: ["userId"],
        where: { action: { in: ["LOGIN", "PAGE_VIEW"] }, createdAt: { gte: twentyFourHoursAgo } },
      }).then((r) => r.length),
      prisma.activityLog.groupBy({
        by: ["userId"],
        where: { action: { in: ["LOGIN", "PAGE_VIEW"] }, createdAt: { gte: sevenDaysAgo } },
      }).then((r) => r.length),
      prisma.user.count({
        where: { isActive: true, OR: [{ lastLoginAt: { lt: sevenDaysAgo } }, { lastLoginAt: null }] },
      }),
      prisma.patient.count(),
      prisma.employee.count(),
      prisma.appointment.count(),
      prisma.treatment.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.clinic.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.patient.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.employee.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.clinic.groupBy({ by: ["sector"], _count: { id: true } }),
      prisma.subscriptionPlan.groupBy({ by: ["status"], _count: { id: true } }).catch(() => []),
      prisma.clinicModule.findMany({
        where: { isActive: true },
        include: { module: { select: { name: true, displayName: true } } },
      }).catch(() => []),
      prisma.employee.groupBy({ by: ["clinicId"], _count: { id: true } }),
      prisma.patient.groupBy({ by: ["clinicId"], _count: { id: true } }),
      prisma.treatment.aggregate({
        where: { createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.treatment.groupBy({
        by: ["paymentMethod"],
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.appointment.groupBy({
        by: ["status"],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
      }),
      prisma.activityLog.findMany({
        where: { action: "PAGE_VIEW", createdAt: { gte: thirtyDaysAgo } },
        select: { details: true, userId: true },
      }),
      prisma.activityLog.findMany({
        where: { action: "LOGIN", createdAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } },
        select: { createdAt: true, userId: true },
      }),
      // Kullanıcı detayları + klinik + abonelik
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          isDemo: true,
          lastLoginAt: true,
          createdAt: true,
          clinic: {
            select: {
              id: true,
              name: true,
              plan: true,
              sector: true,
              subscriptionPlan: {
                select: {
                  status: true,
                  trialEnd: true,
                  monthlyTotal: true,
                  activeModules: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Ödeme geçmişi (BillingHistory)
      prisma.billingHistory.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          subscriptionPlan: {
            include: {
              clinic: {
                include: {
                  users: { select: { name: true, email: true }, take: 1 },
                },
              },
            },
          },
        },
      }).catch(() => []),
      // Ödeme geçmişi (SubscriptionPayment)
      prisma.subscriptionPayment.findMany({
        where: { status: "SUCCESS" },
        orderBy: { paidAt: "desc" },
        take: 100,
        include: {
          subscription: {
            include: {
              clinic: {
                include: {
                  users: { select: { name: true, email: true }, take: 1 },
                },
              },
            },
          },
        },
      }).catch(() => []),
    ]);

    // ── Sektör dağılımı
    const sectors = sectorDistribution
      .filter((s) => s.sector)
      .map((s) => ({ sector: s.sector || "Belirtilmemiş", count: s._count.id }))
      .sort((a, b) => b.count - a.count);

    // ── Abonelik durumları
    const subscriptions = (subscriptionStats as any[]).map((s: any) => ({
      status: s.status,
      count: s._count.id,
    }));

    // ── Modül popülerlik
    const modulePopularity: Record<string, { name: string; count: number }> = {};
    for (const cm of moduleActivations as any[]) {
      const name = cm.module?.displayName || cm.module?.name || "Bilinmeyen";
      if (!modulePopularity[name]) modulePopularity[name] = { name, count: 0 };
      modulePopularity[name].count += 1;
    }
    const topModulesPurchased = Object.values(modulePopularity).sort((a, b) => b.count - a.count);

    // ── Ortalamalar
    const avgEmployeesPerClinic = employeesPerClinic.length > 0
      ? Math.round((employeesPerClinic.reduce((s, e) => s + e._count.id, 0) / employeesPerClinic.length) * 10) / 10
      : 0;
    const avgPatientsPerClinic = patientsPerClinic.length > 0
      ? Math.round((patientsPerClinic.reduce((s, e) => s + e._count.id, 0) / patientsPerClinic.length) * 10) / 10
      : 0;

    // ── Tedavi geliri
    const treatmentRevenueTotal = (treatmentRevenue._sum.amount || 0) / 100;
    const treatmentCount30d = treatmentRevenue._count.id;

    // ── Ödeme yöntemi
    const payments = paymentMethods.map((p) => ({
      method: p.paymentMethod || "Belirtilmemiş",
      count: p._count.id,
      total: (p._sum.amount || 0) / 100,
    })).sort((a, b) => b.count - a.count);

    // ── Randevu durumları
    const STATUS_LABELS: Record<string, string> = {
      SCHEDULED: "Planlandı", COMPLETED: "Tamamlandı", CANCELLED: "İptal", NO_SHOW: "Gelmedi",
    };
    const appointmentStatusData = appointmentStatuses.map((a) => ({
      status: STATUS_LABELS[a.status] || a.status,
      count: a._count.id,
    }));

    // ── Modül kullanım
    const moduleMap: Record<string, { views: number; uniqueUsers: Set<string> }> = {};
    for (const pv of pageViews) {
      const pg = (pv.details as any)?.page;
      if (!pg) continue;
      const mod = "/" + pg.split("/").filter(Boolean)[0];
      if (!moduleMap[mod]) moduleMap[mod] = { views: 0, uniqueUsers: new Set() };
      moduleMap[mod].views += 1;
      moduleMap[mod].uniqueUsers.add(pv.userId);
    }
    const topModulesUsage = Object.entries(moduleMap)
      .map(([mod, data]) => ({
        module: mod,
        views: data.views,
        uniqueUsers: data.uniqueUsers.size,
        avgPerUser: totalUsers > 0 ? Math.round((data.views / totalUsers) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.views - a.views);

    // ── Günlük giriş trendi
    const dailyLoginMap: Record<string, { logins: number; uniqueUsers: Set<string> }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
      dailyLoginMap[key] = { logins: 0, uniqueUsers: new Set() };
    }
    for (const entry of loginTrend) {
      const key = new Date(entry.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
      if (dailyLoginMap[key]) {
        dailyLoginMap[key].logins += 1;
        dailyLoginMap[key].uniqueUsers.add(entry.userId);
      }
    }
    const loginChart = Object.entries(dailyLoginMap).map(([date, data]) => ({
      date,
      logins: data.logins,
      uniqueUsers: data.uniqueUsers.size,
    }));

    // ── Per-user module breakdown
    const userModuleMap: Record<string, { name: string; email: string; modules: Record<string, number>; total: number }> = {};
    for (const pv of pageViews) {
      const pg = (pv.details as any)?.page;
      if (!pg) continue;
      const mod = "/" + pg.split("/").filter(Boolean)[0];
      if (!userModuleMap[pv.userId]) {
        userModuleMap[pv.userId] = { name: "", email: "", modules: {}, total: 0 };
      }
      userModuleMap[pv.userId].modules[mod] = (userModuleMap[pv.userId].modules[mod] || 0) + 1;
      userModuleMap[pv.userId].total += 1;
    }
    const userIds = Object.keys(userModuleMap);
    if (userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });
      for (const u of users) {
        if (userModuleMap[u.id]) {
          userModuleMap[u.id].name = u.name || "";
          userModuleMap[u.id].email = u.email || "";
        }
      }
    }
    const userAnalytics = Object.entries(userModuleMap)
      .map(([userId, data]) => ({
        userId,
        name: data.name,
        email: data.email,
        total: data.total,
        modules: Object.entries(data.modules)
          .map(([mod, count]) => ({ module: mod, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.total - a.total);

    // ── Kullanıcı listesi (deneme süresi bilgileriyle)
    const userList = allUsers.map((u) => {
      const sub = u.clinic?.subscriptionPlan;
      const trialEnd = sub?.trialEnd ? new Date(sub.trialEnd) : null;
      const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const subStatus = sub?.status || "none";

      let displayStatus: string;
      if (u.role === "ADMIN" || u.role === "SUPERADMIN") displayStatus = "admin";
      else if (u.isDemo) displayStatus = "demo";
      else if (subStatus === "active") displayStatus = "paying";
      else if (subStatus === "trial" && daysLeft !== null && daysLeft > 0) displayStatus = "trial";
      else if (subStatus === "trial" && daysLeft !== null && daysLeft <= 0) displayStatus = "expired";
      else if (subStatus === "suspended") displayStatus = "suspended";
      else if (subStatus === "cancelled") displayStatus = "cancelled";
      else displayStatus = "trial"; // no subscription plan = new user in trial

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        isDemo: u.isDemo,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        clinicId: u.clinic?.id || null,
        clinicName: u.clinic?.name || null,
        clinicPlan: u.clinic?.plan || null,
        sector: u.clinic?.sector || null,
        subStatus,
        trialEnd: trialEnd?.toISOString() || null,
        daysLeft,
        displayStatus,
        monthlyTotal: sub?.monthlyTotal || 0,
      };
    });

    // ── Deneme süresi istatistikleri
    const trialActive = userList.filter(u => u.displayStatus === "trial").length;
    const trialExpired = userList.filter(u => u.displayStatus === "expired").length;
    const payingUsers = userList.filter(u => u.displayStatus === "paying").length;

    // ── Ödeme geçmişi birleştir
    const paymentHistory: Array<{
      id: string;
      date: string;
      userName: string;
      userEmail: string;
      amount: number;
      status: string;
      method: string;
      ref: string | null;
    }> = [];

    // BillingHistory kayıtları
    for (const bh of billingHistory as any[]) {
      const clinic = bh.subscriptionPlan?.clinic;
      const u = clinic?.users?.[0];
      paymentHistory.push({
        id: bh.id,
        date: bh.createdAt,
        userName: u?.name || clinic?.name || "—",
        userEmail: u?.email || "—",
        amount: bh.amount / 100,
        status: bh.status,
        method: "PayTR",
        ref: bh.paytrRef || null,
      });
    }

    // SubscriptionPayment kayıtları
    for (const sp of subscriptionPayments as any[]) {
      const clinic = sp.subscription?.clinic;
      const u = clinic?.users?.[0];
      paymentHistory.push({
        id: sp.id,
        date: sp.paidAt || sp.createdAt,
        userName: u?.name || "—",
        userEmail: u?.email || "—",
        amount: sp.amount,
        status: sp.status,
        method: sp.paytrOrderId ? "PayTR" : "Iyzico",
        ref: sp.paytrOrderId || sp.iyzicoPaymentId || null,
      });
    }

    // Tarihe göre sırala
    paymentHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Bu ay toplam gelir
    const monthlyRevenue = paymentHistory
      .filter(p => p.status === "success" || p.status === "SUCCESS")
      .filter(p => new Date(p.date) >= startOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      // Temel sayılar
      totalUsers,
      activeUsers: activeUsersLast24h,
      activeUsersLast7d,
      passiveUsers,
      totalClinics,
      todayLogins,
      totalPatients,
      totalEmployees,
      totalAppointments,
      totalTreatments,
      // Büyüme
      newUsersLast30d,
      newUsersThisWeek,
      newUsersThisMonth,
      newClinicsLast30d,
      newPatientsLast30d,
      newEmployeesLast30d,
      // Ortalamalar
      avgEmployeesPerClinic,
      avgPatientsPerClinic,
      // Gelir
      treatmentRevenueTotal,
      treatmentCount30d,
      // Dağılımlar
      sectors,
      subscriptions,
      topModulesPurchased,
      payments,
      appointmentStatusData,
      // Modül kullanım
      topModules: topModulesUsage,
      userAnalytics,
      loginChart,
      // Yeni: kullanıcı listesi
      userList,
      // Yeni: deneme süresi istatistikleri
      trialActive,
      trialExpired,
      payingUsers,
      // Yeni: ödeme geçmişi
      paymentHistory: paymentHistory.slice(0, 50),
      monthlyRevenue,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "İstatistikler alınamadı" }, { status: 500 });
  }
}
